from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os, asyncio

router = APIRouter()

class VisionRequest(BaseModel):
    imageUrl: str


@router.post("/vision/analyze")
async def analyze_image(payload: VisionRequest):
    """Analyze an image using Gemini Vision API."""
    image_url = payload.imageUrl.strip()
    if not image_url:
        raise HTTPException(status_code=400, detail="Missing imageUrl")

    try:
        import google.generativeai as genai
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

        # Create model on demand
        model = genai.GenerativeModel("gemini-1.5-flash")

        async def run_analysis():
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None,
                lambda: model.generate_content([
                    "Describe this image briefly and clearly.",
                    {"mime_type": "image/jpeg", "url": image_url},
                ]),
            )

        # timeout guard (15 seconds)
        result = await asyncio.wait_for(run_analysis(), timeout=15)
        description = (
            result.text.strip()
            if result and getattr(result, "text", None)
            else "Kinber: I am unable to process images."
        )

        return {"description": description}

    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Gemini Vision timed out")
    except Exception as e:
        print(f"❌ [VISION] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
