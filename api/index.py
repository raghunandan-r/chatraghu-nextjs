import os
import json
from typing import List, Optional
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from datetime import datetime
import backoff
from utils.logger import logger
import uuid
import urllib3

# load_dotenv(".env")

thread_id_store = {}  # In-memory store for thread IDs

class ClientMessage(BaseModel):
    role: str
    content: str
    thread_id: Optional[str] = None

app = FastAPI()

# Add this right after FastAPI initialization
print("Starting FastAPI proxy server...")
if __name__ == "__main__":
    print("FastAPI proxy server running on http://127.0.0.1:8000")

class Request(BaseModel):
    messages: List[ClientMessage]


def create_retry_session(
    retries=3,
    backoff_factor=0.3,
    status_forcelist=(500, 502, 504),
    timeout=(10, 30)  # (connect timeout, read timeout)
):
    session = requests.Session()
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session

@backoff.on_exception(
    backoff.expo,
    (requests.exceptions.RequestException, json.JSONDecodeError),
    max_tries=3
)

def stream_text(chat_request: dict, protocol: str = 'data'):
    api_key = os.getenv('API_KEY')
    api_url = os.getenv('API_URL')
    if not api_key:
        logger.error("API key not configured")
        raise ValueError("X_API_KEY environment variable is not set")
    
    try:
        logger.info("Making API request", extra={
            "url": api_url,
            "thread_id": chat_request.get("messages", [{}])[0].get("thread_id"),
            "protocol": protocol
        })
        
        session = create_retry_session()  # Use the retry session we defined earlier
        response = session.post(
            api_url, 
            json=chat_request,
            stream=True,
            headers={
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
                "X-API-Key": api_key            
            },
            timeout=(15, 30)
        )
        logger.debug(f"Response status: {response.status_code}")
        response.raise_for_status()        
        
        for line in response.iter_lines(decode_unicode=True):            
            # Skip empty lines
            if not line or line.isspace():
                continue
                
            # Handle SSE prefix
            if line.startswith('data: '):
                line = line[6:]
                
            if line == '[DONE]' or line == 'event: heartbeat':
                continue
                
            try:
                chunk = json.loads(line)
                for choice in chunk.get('choices', []):  # Use .get() for safer access
                    if choice.get('delta', {}).get('content'):  # Safely access nested dict
                        yield f'0:{json.dumps(choice["delta"]["content"])}\n'
                    else:
                        print("index.py---------------- content: ", choice.get('delta', {}))    
                        yield f"0:{json.dumps(choice.get('delta', {}).get('content', ''))}\n"

            except json.JSONDecodeError:
                logger.warning("Malformed JSON received", extra={
                    "line_preview": line[:100],
                    "thread_id": chat_request.get("messages", [{}])[0].get("thread_id")
                })
                continue

    except (requests.exceptions.ChunkedEncodingError, 
            requests.exceptions.ConnectionError,
            urllib3.exceptions.ProtocolError) as e:
        logger.warning(f"Stream ended prematurely: {str(e)}", extra={
            "thread_id": chat_request.get("messages", [{}])[0].get("thread_id")
        })        
            

    except Exception as e:
        logger.exception("Unexpected error in stream_text", extra={
            "error_type": type(e).__name__,
            "error": str(e),
            "thread_id": chat_request.get("messages", [{}])[0].get("thread_id")
        })

    
    finally:
        if 'response' in locals():
            response.close()

@app.post("/api/chat")
async def handle_chat_data(request: Request, protocol: str = Query('data')):
    try:
        messages = request.messages
        session_key = hash(messages[0].content)
        
        if session_key not in thread_id_store:
            thread_id_store[session_key] = str(uuid.uuid4())
        
        thread_id = thread_id_store[session_key]
        
        logger.info("Chat request received", extra={
            "thread_id": thread_id,
            "session_key": session_key,
            "message_length": len(messages[0].content)
        })
        
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
        
    except Exception as e:
        logger.exception("Error in chat handler", extra={
            "error_type": type(e).__name__,
            "error": str(e)
        })
        raise
