# backend/routes/chat.py

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import asyncio
import os
from openai import OpenAI

from backend.utils.attachment_extractor import extract_attachment_text
from backend.services.openai_agent import analyze_image_with_openai
from io import BytesIO
import base64

router = APIRouter(tags=["Chat"])

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    attachments: Optional[List[Dict[str, Any]]] = []
    document_context: Optional[str] = None


async def stream_openai_response(messages: list):
    """
    Stream OpenAI response word-by-word for instant feedback
    
    Args:
        messages: List of message objects
        
    Yields:
        String chunks as they arrive
    """
    try:
        stream = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o",
            messages=messages,
            temperature=0.5,  # Optimized for speed
            max_tokens=1500,  # Reduced for faster response
            stream=True  # Enable streaming
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
                
    except Exception as e:
        import traceback
        traceback.print_exc()
        yield f"\n\n[Error: {str(e)}]"


@router.get("")
async def chat_root():
    return {
        "status": "ok",
        "service": "chat",
        "streaming_enabled": True,
        "endpoints": [
            "/api/chat/stream",
            "/api/chat"
        ]
    }


@router.post("/stream")
async def chat_stream_endpoint(payload: ChatRequest):
    """
    ⚡ STREAMING chat endpoint for instant word-by-word responses
    This makes the chat feel significantly faster!
    """
    print(f"\n{'='*60}")
    print(f"💬⚡ STREAMING CHAT ENDPOINT CALLED")
    print(f"{'='*60}")
    print(f"📝 Messages: {len(payload.messages)}")
    print(f"📎 Attachments: {len(payload.attachments or [])}")
    
    if not payload.messages:
        raise HTTPException(status_code=400, detail="Messages are required")

    # Extract documents if attachments exist
    extracted_documents = []
    vision_extracts = []
    
    if payload.attachments and not payload.document_context:
        print("\n📄 Processing attachments...")
        
        for idx, file in enumerate(payload.attachments):
            mime = file.get("type", "")
            base64_data = file.get("base64")
            name = file.get("name", f"attachment_{idx+1}")

            if not base64_data:
                continue

            if base64_data.startswith("data:"):
                base64_data = base64_data.split(",", 1)[1]

            # PDF Extraction
            if mime == "application/pdf":
                try:
                    print(f"   📄 Extracting PDF: {name}...")
                    pdf_bytes = base64.b64decode(base64_data)
                    text = extract_attachment_text(BytesIO(pdf_bytes))
                    
                    if text and text.strip():
                        extracted_documents.append(
                            f"📄 PDF DOCUMENT — {name}:\n\n{text.strip()}"
                        )
                        print(f"      ✅ Extracted {len(text)} characters")
                except Exception as e:
                    print(f"      ❌ PDF extraction failed: {e}")
                    extracted_documents.append(
                        f"⚠️ PDF DOCUMENT — {name}: Extraction failed"
                    )

            # Image Analysis
            elif mime.startswith("image/"):
                try:
                    print(f"   🖼️ Analyzing image: {name}...")
                    description = await analyze_image_with_openai(
                        base64_data=base64_data,
                        mime_type=mime,
                        prompt="Analyze this image comprehensively. Describe all visible details, text, objects, people, context, and any other relevant information."
                    )

                    if description and description.strip():
                        vision_extracts.append(
                            f"🖼️ IMAGE ANALYSIS — {name}:\n\n{description.strip()}"
                        )
                        print(f"      ✅ Analysis: {len(description)} characters")
                except Exception as e:
                    print(f"      ❌ Image analysis failed: {e}")
                    vision_extracts.append(
                        f"⚠️ IMAGE — {name}: Analysis failed - {str(e)[:100]}"
                    )

    # Build document context
    document_context = payload.document_context
    
    if not document_context:
        blocks = []
        blocks.extend(extracted_documents)
        blocks.extend(vision_extracts)
        
        if blocks:
            document_context = "\n\n" + "─" * 60 + "\n\n".join(["", *blocks, ""])
            print(f"\n💾 Created document context: {len(document_context)} chars")

    # Enhance last message with context
    messages = [{"role": m.role, "content": m.content} for m in payload.messages]
    
    if document_context:
        last_message = messages[-1]["content"]
        messages[-1]["content"] = f"""You have access to the following extracted information:

{document_context}

{'─' * 60}

USER MESSAGE:
{last_message}

Answer based on the provided context and your knowledge."""

    # Stream the response
    async def generate():
        try:
            async for chunk in stream_openai_response(messages):
                # Send each chunk as SSE (Server-Sent Events)
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            
            # Send document context at the end for session memory
            if document_context:
                yield f"data: {json.dumps({'document_context': document_context})}\n\n"
            
            # Send done signal
            yield f"data: {json.dumps({'done': True})}\n\n"
            
        except Exception as e:
            print(f"❌ Streaming error: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering for Railway
        }
    )


@router.post("")
async def chat_endpoint(payload: ChatRequest):
    """
    Non-streaming chat endpoint (fallback for compatibility)
    """
    print(f"\n{'='*60}")
    print(f"💬 CHAT ENDPOINT CALLED (Non-streaming)")
    print(f"{'='*60}")
    
    if not payload.messages:
        raise HTTPException(status_code=400, detail="Messages are required")

    # Use the same processing logic but collect all chunks
    messages = [{"role": m.role, "content": m.content} for m in payload.messages]
    
    try:
        full_response = ""
        async for chunk in stream_openai_response(messages):
            full_response += chunk
        
        return {
            "response": full_response,
            "document_context": payload.document_context
        }
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))