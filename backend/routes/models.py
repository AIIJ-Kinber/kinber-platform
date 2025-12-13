# backend/routes/models.py

from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def list_models():
    """
    Placeholder route for GET /api/models
    """
    models = [
        {"id": "gpt-4", "provider": "OpenAI"},
        {"id": "gemini-pro", "provider": "Google"},
        {"id": "llama-3", "provider": "Meta"},
    ]
    return {"models": models, "count": len(models)}
