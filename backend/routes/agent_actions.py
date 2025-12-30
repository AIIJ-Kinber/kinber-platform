# backend/routes/agent_actions.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import traceback
import logging

# Core agent logic
from backend.core.agents import info_tasks

# Router
router = APIRouter(tags=["Agent Actions"])

# Logger
logger = logging.getLogger("kinber.agent_actions")


# ------------------------------------------------------------
# Input Models
# ------------------------------------------------------------
class SearchRequest(BaseModel):
    query: str


class SummarizeRequest(BaseModel):
    text: str
    max_words: int | None = 200


class ExtractRequest(BaseModel):
    text: str


class TranslateRequest(BaseModel):
    text: str
    target_lang: str


class RewriteRequest(BaseModel):
    text: str
    style: str = "simple"


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
def success(data):
    return {"status": "success", "data": data}


def fail(err: Exception):
    trace = traceback.format_exc()
    logger.error(f"Agent Action Error → {err}\n{trace}")
    raise HTTPException(status_code=500, detail=str(err))


# ------------------------------------------------------------
# Search Result Formatter (Tavily)
# ------------------------------------------------------------
def format_search_results(query: str, max_results: int, raw_results):
    if isinstance(raw_results, dict) and raw_results.get("error"):
        return {
            "query": query,
            "max_results": max_results,
            "result_count": 0,
            "results": [],
            "error": raw_results["error"],
        }

    safe_results = []

    raw_list = raw_results.get("results", []) if isinstance(raw_results, dict) else raw_results

    for item in raw_list:
        if not isinstance(item, dict):
            continue

        title = (item.get("title") or "").strip() or "Untitled"
        url = (item.get("url") or item.get("source") or "").strip()
        content = (item.get("content") or item.get("snippet") or "").strip()

        safe_results.append(
            {
                "title": title,
                "url": url,
                "snippet": content[:600],
                "source": item.get("source") or url,
            }
        )

    return {
        "query": query,
        "max_results": max_results,
        "result_count": len(safe_results),
        "results": safe_results,
    }


# ------------------------------------------------------------
# /search → Tavily Web Search
# ------------------------------------------------------------
from backend.services.tavily import tavily_search

@router.post("/search")
async def search_web(body: dict, internal_call: bool = False):
    try:
        query = body.get("query", "")
        max_results = body.get("max_results", 10)

        if not query:
            return {"status": "error", "message": "Missing query"}

        try:
            max_results = int(max_results)
        except:
            max_results = 10

        if max_results <= 0 or max_results > 50:
            max_results = 10

        raw_results = tavily_search(query, max_results)
        print("🔍 RAW TAVILY RESULT:", raw_results)

        formatted = format_search_results(query, max_results, raw_results)
        return success(formatted)

    except Exception as e:
        return fail(e)


# ------------------------------------------------------------
# /youtube → Serper YouTube Search
# ------------------------------------------------------------
from backend.services.youtube_search import youtube_search

@router.post("/youtube")
async def youtube_search_action(body: dict):
    try:
        query = body.get("query", "")
        max_results = body.get("max_results", 5)

        if not query:
            return {"status": "error", "message": "Missing query"}

        print(f"🎬 [YouTube] Incoming search → query='{query}', max_results={max_results}")

        try:
            max_results = int(max_results)
        except:
            max_results = 5

        raw = youtube_search(query, max_results)

        print(f"🎬 [YouTube] Search completed → {raw.get('result_count', 0)} results")

        # IMPORTANT: return *only raw* so Gemini gets correct structure
        return success(raw)

    except Exception as e:
        return fail(e)


# ------------------------------------------------------------
# Extract Key Points
# ------------------------------------------------------------
@router.post("/extract")
async def extract_key_points(request: ExtractRequest):
    try:
        key_points = await info_tasks.extract_key_points(request.text)
        return success(key_points)
    except Exception as e:
        return fail(e)


# ------------------------------------------------------------
# Translate
# ------------------------------------------------------------
@router.post("/translate")
async def translate_text(request: TranslateRequest):
    try:
        translation = await info_tasks.translate_text(request.text, request.target_lang)
        return success(translation)
    except Exception as e:
        return fail(e)


# ------------------------------------------------------------
# Rewrite
# ------------------------------------------------------------
@router.post("/rewrite")
async def rewrite_text(request: RewriteRequest):
    try:
        rewritten = await info_tasks.rewrite_text(request.text, request.style)
        return success(rewritten)
    except Exception as e:
        return fail(e)


# ------------------------------------------------------------
# /test
# ------------------------------------------------------------
@router.get("/test")
async def test_agent_actions():
    logger.info("✅ Agent Actions test route called")
    return {"status": "ok", "message": "Agent Actions route is active and ready."}
