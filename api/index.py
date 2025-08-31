from datetime import datetime
import os
from typing import List, Optional
import httpx
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
from utils.logger import logger
import uuid
from httpx import AsyncClient, AsyncHTTPTransport


# Load .env files only if they exist
if os.path.exists('.env'):
    load_dotenv('.env')

class ClientMessage(BaseModel):
    role: str
    content: str
    thread_id: Optional[str] = None

app = FastAPI()

# Add this right after FastAPI initialization
logger.info("Starting FastAPI proxy server...")
if __name__ == "__main__":
    logger.info("FastAPI proxy server running on http://127.0.0.1:8000")

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
    
    async with AsyncClient(
        transport=transport,
        timeout=httpx.Timeout(
            connect=10,
            read=30,
            write=10,
            pool=30
        )
    ) as client:
        try:
            async with client.stream(
                "POST",
                api_url, 
                json=chat_request,                
                headers={
                    "Content-Type": "application/json",
                    "Accept": "text/event-stream",
                    "X-API-Key": api_key,
                    "Accept-Encoding": "identity",
                }
            ) as response:
                try:
                    # Pass through upstream SSE bytes without re-framing or double-encoding
                    async for chunk in response.aiter_raw():
                        if not chunk:
                            continue
                        yield chunk
                    
                    yield b'\n\n' # explicit termination signal ahm.
                    
                    logger.info("Stream completed", extra={
                        "thread_id": chat_request.get("messages", [{}])[0].get("thread_id"),
                        "timestamp": datetime.now().isoformat()
                    })
                    
                except httpx.ReadTimeout:
                    logger.warning("Stream read timeout", extra={
                        "thread_id": chat_request.get("messages", [{}])[0].get("thread_id")
                    })
                    return
                except httpx.StreamError:
                    logger.warning("Stream ended unexpectedly", extra={
                        "thread_id": chat_request.get("messages", [{}])[0].get("thread_id")
                    })
                    return
                except httpx.RemoteProtocolError:
                    logger.warning("Remote connection closed unexpectedly", extra={
                        "thread_id": chat_request.get("messages", [{}])[0].get("thread_id")
                    })
                    return
                    
        except Exception as e:
            logger.exception("Error in stream_text", extra={
                "error_type": type(e).__name__,
                "error": str(e),
                "thread_id": chat_request.get("messages", [{}])[0].get("thread_id")
            })
            raise



@app.post("/api/chat")
async def handle_chat_data(request: Request, protocol: str = Query('data')):
    try:
        messages = request.messages
        last_message = messages[-1] if messages else None

        if not last_message:
            # Handle case where there are no messages
            return StreamingResponse(content="No messages provided", status_code=400)

        thread_id = last_message.thread_id or str(uuid.uuid4())

        logger.info("Chat request received", extra={
            "thread_id": thread_id,
            "chat_message": last_message.content
        })
        
        chat_request = {
            "messages": [{
                "role": last_message.role,
                "content": last_message.content,
                "thread_id": thread_id
            }]
        }

        # The streaming response remains identical to current implementation
        response = StreamingResponse(
            stream_text(chat_request, protocol),
            media_type='text/event-stream',
            headers={
                'x-vercel-ai-data-stream': 'v1',
                'cache-control': 'no-cache, no-transform',
                'connection': 'close', # changed from keep-alive to close
                'x-accel-buffering': 'no',
            }
        )
        return response
        
    except Exception as e:
        logger.exception("Error in chat handler", extra={
            "error_type": type(e).__name__,
            "error": str(e)
        })
        raise
