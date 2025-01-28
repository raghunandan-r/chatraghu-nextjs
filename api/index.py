import os
import json
from typing import List, Optional
from openai.types.chat.chat_completion_message_param import ChatCompletionMessageParam
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
from openai import OpenAI
import requests
from datetime import datetime
import base64

# load_dotenv(".env")

thread_id_store = {}  # In-memory store for thread IDs

class ClientMessage(BaseModel):
    role: str
    content: str
    thread_id: Optional[str] = None

app = FastAPI()


def generate_thread_id():
    # Generate 8 random bytes
    random_bytes = os.urandom(8)    
    # Convert to base64 and clean up any URL-unsafe characters
    random_chars = base64.b64encode(random_bytes).decode('utf-8') \
        .replace('+', '') \
        .replace('/', '')[:8]  # Take first 8 chars    
    # Add timestamp
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')    
    return f"{random_chars}-{timestamp}"


class Request(BaseModel):
    messages: List[ClientMessage]



def stream_text(chat_request: dict, protocol: str = 'data'):

    api_key = os.getenv('API_KEY')
    api_url = os.getenv('API_URL')
    if not api_key:
        raise ValueError("X_API_KEY environment variable is not set")
    
    try:
        response = requests.post(
            api_url, 
            json=chat_request,
            stream=True,
            headers={
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
                "X-API-Key": api_key            
            }
        )
        print(f"Response status: {response.status_code}")  # Debug log
        response.raise_for_status()        
        for line in response.iter_lines(decode_unicode=True):            
            if line.startswith('data: '):
                line = line[6:]
                
            if line == '[DONE]':
                 continue
                
                
            try:
                chunk = json.loads(line)
                for choice in chunk['choices']:
                    # Handle normal text content
                    if 'delta' in choice and 'content' in choice['delta']:
                        yield f'0:{json.dumps(choice["delta"]["content"])}\n'
                    else:
                      yield '0:{text}\n'.format(text=json.dumps(choice.delta.content))
            
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON: {e}")
                

    except requests.exceptions.ConnectionError as e:
        print(f"Connection error: {e}")  # Debug log
        raise



@app.post("/api/chat")
async def handle_chat_data(request: Request, protocol: str = Query('data')):
    messages = request.messages
    
    # Get a unique identifier for this client session (can be first message content hash)
    session_key = hash(messages[0].content)  # Simple way to identify a session
    
    if session_key not in thread_id_store:
        thread_id_store[session_key] = generate_thread_id()
    
    thread_id = thread_id_store[session_key]
    
    # Create a simplified request format with just the last message
    chat_request = {
        "messages": [{
            "role": messages[-1].role,
            "content": messages[-1].content,
            "thread_id": thread_id
        }]
    }

    response = StreamingResponse(
        stream_text(chat_request, protocol),
        headers={
            'x-vercel-ai-data-stream': 'v1'
        }
    )
    return response
