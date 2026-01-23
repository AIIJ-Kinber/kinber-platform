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


class TripletRequest(BaseModel):
    prompt: str
    attachments: Optional[List[Dict[str, Any]]] = []
    document_context: Optional[str] = None
    skip_ai_verdict: Optional[bool] = False  # NEW: Option for faster responses


@router.post("/triplet")
async def triplet_endpoint(payload: TripletRequest):
    """
    Triplet endpoint with ULTRA optimization
    Set skip_ai_verdict=true for maximum speed (~8-10s instead of ~15s)
    """
    print(f"\n{'='*60}")
    print(f"🔀 TRIPLET ENDPOINT CALLED (ULTRA-OPTIMIZED)")
    print(f"{'='*60}")
    print(f"📝 Prompt: {payload.prompt[:100]}...")
    print(f"📎 Attachments: {len(payload.attachments or [])}")
    print(f"⚡ Skip AI Verdict: {payload.skip_ai_verdict}")
    
    if not payload.prompt or not payload.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    extracted_documents: List[str] = []
    vision_extracts: List[str] = []

    # Process attachments
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

            # Image Analysis
            elif mime.startswith("image/"):
                try:
                    print(f"   🖼️ Analyzing image: {name}...")
                    description = await analyze_image_with_openai(
                        base64_data=base64_data,
                        mime_type=mime,
                        prompt="Analyze this image. Describe key details concisely."
                    )

                    if description and description.strip():
                        vision_extracts.append(
                            f"🖼️ IMAGE — {name}:\n\n{description.strip()}"
                        )
                        print(f"      ✅ Analysis: {len(description)} characters")
                except Exception as e:
                    print(f"      ❌ Image analysis failed: {e}")

    # Build document context
    document_context = payload.document_context

    if not document_context:
        blocks: List[str] = []
        blocks.extend(extracted_documents)
        blocks.extend(vision_extracts)

        if blocks:
            document_context = "\n\n" + "─" * 60 + "\n\n".join(["", *blocks, ""])
            print(f"\n💾 Created document context: {len(document_context)} chars")

    # Final prompt
    final_prompt = payload.prompt

    if document_context:
        final_prompt = f"""Context from attachments:

{document_context}

{'─' * 60}

QUESTION: {payload.prompt}

Answer based on context and your knowledge. Be concise."""

    # Run Triplet
    try:
        result = await run_triplet(
            final_prompt, 
            skip_ai_verdict=payload.skip_ai_verdict
        )
        
        result["document_context"] = document_context
        
        print(f"\n✅ TRIPLET COMPLETED SUCCESSFULLY\n")
        
        return result

    except Exception as e:
        print(f"\n❌ TRIPLET FAILED: {e}\n")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))