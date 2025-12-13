# backend/routes/projects.py

from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("")
def list_projects():
    """
    Placeholder route for GET /api/projects
    Returns static example projects for now.
    """
    try:
        projects = [
            {"id": 1, "name": "AI Research"},
            {"id": 2, "name": "Kinber Platform"},
            {"id": 3, "name": "Travel WebApp"},
        ]
        return {"projects": projects, "count": len(projects)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
