from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback
import logging
import os
from dotenv import load_dotenv

# ------------------------------------------------------------
# Load environment variables (Railway + local)
# ------------------------------------------------------------
load_dotenv()

# ------------------------------------------------------------
# App initialization
# ------------------------------------------------------------
app = FastAPI(
    title="Kinber Backend",
    version="1.0.0",
)

# ------------------------------------------------------------
# CORS (safe for prod + local)
# ------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------
# Logging
# ------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kinber")

# ------------------------------------------------------------
# Global error handler
# ------------------------------------------------------------
@app.middleware("http")
async def error_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "path": request.url.path},
        )

# ============================================================
# 🔐 ROUTER MOUNTING — EXPLICIT & RELIABLE
# ============================================================

# ---- Thread ------------------------------------------------
try:
    from backend.routes.thread import router as thread_router
    app.include_router(thread_router, prefix="/api/thread", tags=["Thread"])
    print("✅ Mounted Thread → /api/thread")
except Exception as e:
    print("❌ Thread router NOT mounted:", e)

# ---- Agent -------------------------------------------------
try:
    from backend.routes.agent import router as agent_router
    app.include_router(agent_router, prefix="/api/agent", tags=["Agent"])
    print("✅ Mounted Agent → /api/agent")
except Exception as e:
    print("❌ Agent router NOT mounted:", e)

# ---- Agent Actions ----------------------------------------
try:
    from backend.routes.agent_actions import router as actions_router
    app.include_router(actions_router, prefix="/api/actions", tags=["Agent Actions"])
    print("✅ Mounted Agent Actions → /api/actions")
except Exception as e:
    print("❌ Agent Actions router NOT mounted:", e)

# ---- Tools / Search ---------------------------------------
try:
    from backend.routes.search import router as tools_router
    app.include_router(tools_router, prefix="/api/tools", tags=["Tools"])
    print("✅ Mounted Tools → /api/tools")
except Exception as e:
    print("❌ Tools router NOT mounted:", e)

# ============================================================
# Health check
# ============================================================
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "kinber-backend"}

# ============================================================
# Debug route list (VERY IMPORTANT)
# ============================================================
@app.get("/api/debug/routes")
def debug_routes():
    return {
        "routes": [
            {"path": r.path, "methods": list(r.methods), "name": r.name}
            for r in app.router.routes
        ]
    }
