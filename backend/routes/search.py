from fastapi import APIRouter
from backend.services.web_search import web_search

router = APIRouter()

@router.post("/websearch")
def do_search(payload: dict):
    query = payload.get("query")
    max_results = payload.get("max_results", 5)

    if not query:
        return {"error": "Missing 'query' field"}

    result = web_search(query, max_results)
    return {"data": result}
