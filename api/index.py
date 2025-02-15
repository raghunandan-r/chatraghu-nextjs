import asyncio
import os
import json
from typing import List, Optional
import httpx
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
from utils.logger import logger
import uuid
from httpx import AsyncClient, AsyncHTTPTransport

import sentry_sdk
from sentry_sdk import capture_exception, capture_message
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.asyncio import AsyncioIntegration


# Load .env files only if they exist
if os.path.exists('.env'):
    load_dotenv('.env')
else:
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),    
        environment="production",  
        traces_sample_rate=1.0,   
        profiles_sample_rate=1.0, 
        integrations=[
            FastApiIntegration(),
            AsyncioIntegration(),
        ],
        send_default_pii=True,
        _experiments={
            "continuous_profiling_auto_start": True,        
        },
    )

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


async def stream_text(chat_request: dict, protocol: str = 'data'):
    api_key = os.getenv('API_KEY')
    api_url = os.getenv('API_URL')
    
    
    logger.info("Making API request", extra={
        "url": api_url,
        "thread_id": chat_request.get("messages", [{}])[0].get("thread_id"),
        "protocol": protocol
    })
    
    transport = AsyncHTTPTransport(retries=3)
    async with AsyncClient(transport=transport) as client:
        try:
            async with client.stream(
                "POST",
                api_url, 
                json=chat_request,                
            headers={
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
                "X-API-Key": api_key            
            }            
            ) as response:
                logger.debug(f"Response status: {response.status_code}")
                response.raise_for_status()        
                try:    
                    async for line in response.aiter_lines():
                        if not line or line.isspace():
                            continue
                        
                        if line.startswith('data: '):
                            line = line[6:]
                        if line == '[DONE]':
                            continue
                        chunk = json.loads(line)
                        for choice in chunk.get('choices', []):  # Use .get() for safer access
                            if choice.get('delta', {}).get('content'):  # Safely access nested dict
                                yield f'0:{json.dumps(choice["delta"]["content"])}\n'
                            else:
                                print("index.py---------------- content: ", choice.get('delta', {}))    
                                yield f"0:{json.dumps(choice.get('delta', {}).get('content', ''))}\n"
                except httpx.StreamClosed:
                    logger.info("Stream closed by client disconnect")
                    return
                except asyncio.CancelledError:
                    logger.info("Stream cancelled by client disconnect")
                    return

        except Exception as e:
            logger.exception("Unexpected error in stream_text", extra={
                "error_type": type(e).__name__,
                "error": str(e),
                "thread_id": chat_request.get("messages", [{}])[0].get("thread_id")
            })



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
