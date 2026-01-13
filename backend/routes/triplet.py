from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.triplet_engine import run_triplet

router = APIRouter()


class TripletRequest(BaseModel):
    prompt: str


@router.post("/triplet")
async def triplet_endpoint(payload: TripletRequest):
    if not payload.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    try:
        return await run_triplet(payload.prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

