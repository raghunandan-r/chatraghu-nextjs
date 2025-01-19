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
    # Get API key from environment variable
    api_key = os.getenv('API_KEY')
    api_url = os.getenv('API_URL')
    if not api_key:
        raise ValueError("X_API_KEY environment variable is not set")
    
    with requests.post(
        api_url, 
        json=chat_request,
        stream=True,
        headers={
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            "X-API-Key": api_key  # Add API key to headers
        }
    ) as response:
        response.raise_for_status()

                # Process the stream
        for line in response.iter_lines():
            if not line:
                continue
                
            # Remove "data: " prefix and parse JSON
            line = line.decode('utf-8')
            if line.startswith('data: '):
                line = line[6:]
                
            if line == '[DONE]':
                # Handle end of stream
                yield 'e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0},"isContinued":false}\n'
                break
                
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
                continue




@app.post("/api/chat")
async def handle_chat_data(request: Request, protocol: str = Query('data')):
    messages = request.messages
    last_message = messages[-1]
    
    # Get or generate thread_id
    thread_id = last_message.thread_id if last_message.thread_id else generate_thread_id()
    
    # Create a simplified request format
    chat_request = {
        "messages": [{
            "role": last_message.role,
            "content": last_message.content,
            "thread_id": thread_id  # Now properly generated
        }]
    }

    response = StreamingResponse(stream_text(chat_request, protocol))
    response.headers['x-vercel-ai-data-stream'] = 'v1'
    return response
