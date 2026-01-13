# backend/routes/agent.py

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any, Dict, List

# OpenAI core agent functions
from backend.services.openai_agent import run_openai_agent
from backend.services.gemini import analyze_image_with_gemini


# Tool services
from backend.services.web_search import web_search
from backend.routes.agent_actions import ( youtube_search_action,
    search_web
)

router = APIRouter(tags=["Agent"])


@router.get("")
async def agent_root():
    return {
        "status": "ok",
        "service": "agent",
        "endpoints": [
            "/api/agent/run",
            "/api/agent/tool"
        ]
    }


# ---------------------------------------------------
# Agent Request Model
# ---------------------------------------------------
class AgentRequest(BaseModel):
    message: str
    model_name: str | None = "gpt-4o"
    agent: str | None = "default"
    attachments: List[Dict[str, Any]] | None = None


# ---------------------------------------------------
# SIMPLE DIRECT TEST ENDPOINT — NOT used by dashboard
# ---------------------------------------------------
@router.post("/run")
async def run_agent(body: AgentRequest):
    """
    Simple helper for directly hitting Gemini.
    Dashboard chat uses thread.py instead.
    """
    try:
        message = body.message.strip()
        attachments = body.attachments or []
        agent = body.agent
        model_name = body.model_name

        if not message:
            raise HTTPException(status_code=400, detail="Message is required")

        # ----- Vision processing -----
        vision_blocks = []
        for file in attachments:
            if str(file.get("type", "")).startswith("image") and file.get("base64"):
                desc = await analyze_image_with_gemini(file["base64"])
                vision_blocks.append(f"🖼️ {file.get('name', 'Image')}:\n{desc}\n")

        # ----- Main AI -----
        ai_reply = await run_openai_agent(
            message,
            agent=agent,
            model_name=model_name,
        )

        final_reply = "\n".join(vision_blocks) + ai_reply
        return {
    "status": "success",
    "reply": final_reply
}

    except Exception as e:
        print("❌ Agent route error:", e)
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================================
#  TOOL EXECUTION ENDPOINT — Called by Gemini JSON tool-calls
# =====================================================================
@router.post("/tool")
async def tool_executor(payload: Dict[str, Any]):
    """
    Executes tools when Gemini outputs strict JSON:

    {
      "tool": "websearch",
      "query": "Saudi Vision 2030",
      "max_results": 10
    }

    OR:

    {
      "tool": "youtube_search",
      "query": "Vision 2030 explained",
      "max_results": 5
    }
    """

    try:
        tool = payload.get("tool")
        if not tool:
            raise HTTPException(status_code=400, detail="Missing 'tool' field")

        query = payload.get("query", "")
        max_results = payload.get("max_results", 10)

        # Validate
        if not query:
            raise HTTPException(status_code=400, detail="Missing 'query'")

        # ---------------------------------------------------------
        # 1️⃣ YouTube Search Tool (Serper)
        # ---------------------------------------------------------
        if tool == "youtube_search":
            result = await youtube_search_action(
                {"query": query, "max_results": max_results}
            )
            return {"tool_result": result.get("data")}

        # ---------------------------------------------------------
        # 2️⃣ Web Search (Tavily)
        # ---------------------------------------------------------
        if tool == "websearch":
            result = await search_web(
                {"query": query, "max_results": max_results},
                internal_call=True,
            )
            return {"tool_result": result.get("data")}

        # ---------------------------------------------------------
        # ❌ Unsupported tool
        # ---------------------------------------------------------
        return {"error": f"Unknown tool '{tool}'"}

    except Exception as e:
        print("❌ Tool Executor Error:", e)
        raise HTTPException(status_code=500, detail=str(e))
