# backend/routes/triplet.py

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from io import BytesIO
import base64
import asyncio
import json

from backend.utils.attachment_extractor import extract_attachment_text
from backend.services.openai_agent import analyze_image_with_openai
from ..services.triplet_engine import run_triplet_streaming

router = APIRouter()


class TripletRequest(BaseModel):
    prompt: str
    attachments: Optional[List[Dict[str, Any]]] = []
    document_context: Optional[str] = None
    skip_ai_verdict: Optional[bool] = False


@router.post("/triplet/stream")
async def triplet_stream_endpoint(payload: TripletRequest):
    """
    ⚡ STREAMING Triplet - Shows each model result as it completes
    User sees responses immediately instead of waiting 21 seconds!
    """
    print(f"\n{'='*60}")
    print(f"🔀⚡ STREAMING TRIPLET ENDPOINT")
    print(f"{'='*60}")
    
    if not payload.prompt or not payload.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    # Process attachments (same as before)
    extracted_documents: List[str] = []
    vision_extracts: List[str] = []

    if not payload.document_context and payload.attachments:
        print("\n📄 Processing attachments...")
        
        for idx, file in enumerate(payload.attachments):
            mime = file.get("type", "")
            base64_data = file.get("base64")
            name = file.get("name", f"attachment_{idx+1}")

            if not base64_data:
                continue

            if base64_data.startswith("data:"):
                base64_data = base64_data.split(",", 1)[1]

            if mime == "application/pdf":
                try:
                    pdf_bytes = base64.b64decode(base64_data)
                    text = extract_attachment_text(BytesIO(pdf_bytes))
                    if text and text.strip():
                        extracted_documents.append(f"📄 PDF — {name}:\n\n{text.strip()}")
                except Exception as e:
                    print(f"❌ PDF error: {e}")

            elif mime.startswith("image/"):
                try:
                    description = await analyze_image_with_openai(
                        base64_data=base64_data,
                        mime_type=mime,
                        prompt="Analyze this image concisely."
                    )
                    if description and description.strip():
                        vision_extracts.append(f"🖼️ IMAGE — {name}:\n\n{description.strip()}")
                except Exception as e:
                    print(f"❌ Image error: {e}")

    # Build context
    document_context = payload.document_context
    if not document_context:
        blocks = []
        blocks.extend(extracted_documents)
        blocks.extend(vision_extracts)
        if blocks:
            document_context = "\n\n" + "─" * 60 + "\n\n".join(["", *blocks, ""])

    # Final prompt
    final_prompt = payload.prompt
    if document_context:
        final_prompt = f"""Context:

{document_context}

{'─' * 60}

QUESTION: {payload.prompt}

Answer based on context and knowledge. Be concise."""

    # Stream responses
    async def generate():
        try:
            async for chunk in run_triplet_streaming(
                prompt=final_prompt,
                attachments=payload.attachments,
                skip_ai_verdict=payload.skip_ai_verdict
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
            
            # Send document context for session memory
            if document_context:
                yield f"data: {json.dumps({'document_context': document_context})}\n\n"
            
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
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/triplet")
async def triplet_endpoint(payload: TripletRequest):
    """
    Non-streaming Triplet (fallback)
    """
    print(f"\n{'='*60}")
    print(f"🔀 TRIPLET ENDPOINT (NON-STREAMING)")
    print(f"{'='*60}")
    
    if not payload.prompt or not payload.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    # (Keep existing non-streaming code as fallback)
    from ..services.triplet_engine import run_triplet
    
    try:
        result = await run_triplet(
            prompt=payload.prompt,
            attachments=payload.attachments,
            skip_ai_verdict=payload.skip_ai_verdict
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))