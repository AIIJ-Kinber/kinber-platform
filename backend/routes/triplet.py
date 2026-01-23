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
    skip_ai_verdict: Optional[bool] = False


@router.post("/triplet")
async def triplet_endpoint(payload: TripletRequest):
    """
    Triplet endpoint with ULTRA optimization
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
                print(f"   ⚠️ Skipping {name}: No base64 data")
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
                    else:
                        print(f"      ⚠️ No text found in PDF")
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
                        prompt="Analyze this image. Describe key details concisely."
                    )

                    if description and description.strip():
                        vision_extracts.append(
                            f"🖼️ IMAGE — {name}:\n\n{description.strip()}"
                        )
                        print(f"      ✅ Analysis: {len(description)} characters")
                    else:
                        print(f"      ⚠️ No description returned")
                except Exception as e:
                    print(f"      ❌ Image analysis failed: {e}")
                    vision_extracts.append(
                        f"⚠️ IMAGE — {name}: Analysis failed - {str(e)[:100]}"
                    )
            else:
                print(f"   ⚠️ Unsupported file type: {mime}")

    # Build document context
    document_context = payload.document_context

    if not document_context:
        blocks: List[str] = []
        blocks.extend(extracted_documents)
        blocks.extend(vision_extracts)

        if blocks:
            document_context = "\n\n" + "─" * 60 + "\n\n".join(["", *blocks, ""])
            print(f"\n💾 Created document context: {len(document_context)} chars")
        else:
            print(f"\n💾 No document context created")
    else:
        print(f"\n💾 Reusing existing context: {len(document_context)} chars")

    # Final prompt with context if available
    final_prompt = payload.prompt

    if document_context:
        final_prompt = f"""You have access to the following extracted information:

{document_context}

{'─' * 60}

USER QUESTION:
{payload.prompt}

Answer based on the provided context and your knowledge. Be concise and accurate."""
        
        print(f"\n📝 Enhanced prompt: {len(final_prompt)} chars")
    else:
        print(f"\n📝 Using original prompt (no context)")

    # Run Triplet with attachments and skip_ai_verdict option
    try:
        print(f"\n🚀 Running triplet...")
        
        # ✅ FIX: Pass attachments to run_triplet
        result = await run_triplet(
            prompt=final_prompt,
            attachments=payload.attachments,  # ✅ ADDED: Pass attachments
            skip_ai_verdict=payload.skip_ai_verdict
        )
        
        # Return with document context for session memory
        result["document_context"] = document_context
        
        print(f"\n{'='*60}")
        print(f"✅ TRIPLET COMPLETED SUCCESSFULLY")
        print(f"{'='*60}\n")
        
        return result

    except Exception as e:
        print(f"\n{'='*60}")
        print(f"❌ TRIPLET FAILED: {e}")
        print(f"{'='*60}\n")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))