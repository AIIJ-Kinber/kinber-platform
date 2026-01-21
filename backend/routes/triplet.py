# backend/routes/triplet.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from io import BytesIO
import base64
import asyncio

from backend.utils.attachment_extractor import extract_attachment_text
from backend.services.openai_agent import analyze_image_with_openai
from ..services.triplet_engine import run_triplet

router = APIRouter()


# --------------------------------------------------
# Request Model
# --------------------------------------------------
class TripletRequest(BaseModel):
    prompt: str
    attachments: Optional[List[Dict[str, Any]]] = []
    document_context: Optional[str] = None


# --------------------------------------------------#
# Triplet Endpoint (PDF + IMAGE AWARE)
# --------------------------------------------------#
@router.post("/triplet")
async def triplet_endpoint(payload: TripletRequest):
    print(
        "🖼️ Triplet attachments received:",
        len(payload.attachments),
        [f.get("type") for f in (payload.attachments or [])]
    )
    if not payload.prompt or not payload.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    extracted_documents: List[str] = []
    vision_extracts: List[str] = []

    # --------------------------------------------------#
    # Process attachments
    # --------------------------------------------------
    for file in payload.attachments or []:
        mime = file.get("type", "")
        base64_data = file.get("base64")
        name = file.get("name", "unknown")

        if not base64_data:
            continue

        # Strip data URI prefix if present
        if base64_data.startswith("data:"):
            base64_data = base64_data.split(",", 1)[1]

        # -------------------------------
        # PDF → OCR
        # -------------------------------
        if mime == "application/pdf":
            try:
                pdf_bytes = base64.b64decode(base64_data)
                text = extract_attachment_text(BytesIO(pdf_bytes))
                if text and text.strip():
                    extracted_documents.append(
                        f"OCR_EXTRACT — {name}:\n{text}"
                    )
            except Exception as e:
                print("❌ Triplet PDF OCR failed:", e)

        # -------------------------------
        # IMAGE → OPENAI VISION
        # -------------------------------
        elif mime.startswith("image/"):
            try:
                description = await analyze_image_with_openai(
                    base64_data=base64_data,
                    mime_type=mime,
                    prompt="Analyze this image and describe all visible details, text, and context."
                )

                if description and description.strip():
                    vision_extracts.append(
                        f"VISION_EXTRACT — {name}:\n{description}"
                    )

            except Exception as e:
                print("❌ Triplet image analysis failed:", e)

    # --------------------------------------------------
    # Build / reuse document context (SESSION MEMORY)
    # --------------------------------------------------
    document_context = payload.document_context

    if not document_context:
        blocks: List[str] = []
        blocks.extend(extracted_documents)
        blocks.extend(vision_extracts)

        if blocks:
            document_context = "\n\n".join(blocks)

    # --------------------------------------------------
    # Final prompt (matches thread behavior)
    # --------------------------------------------------
    final_prompt = payload.prompt

    if document_context:
        final_prompt += "\n\n" + document_context

    # --------------------------------------------------
    # Run Triplet + return memory
    # --------------------------------------------------
    try:
        result = await run_triplet(final_prompt)
        result["document_context"] = document_context
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
