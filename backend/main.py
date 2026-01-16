#kinber-platform\backend\main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback
import logging
from dotenv import load_dotenv

import os

# 🔥 FORCE DISABLE PROXIES (Windows + httpx safety)
for k in ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"]:
    os.environ.pop(k, None)

# ------------------------------------------------------------
# Load environment variables
# ------------------------------------------------------------
from pathlib import Path
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

# ------------------------------------------------------------
# App initialization
# ------------------------------------------------------------
app = FastAPI(
    title="Kinber Backend",
    version="1.0.0",
)

# ------------------------------------------------------------
# CORS (IMPORTANT FOR /api/triplet proxy)
# ------------------------------------------------------------
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "https://www.kinber.com",
    "https://kinber.com",
    "https://kinber-platform.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],   # MUST include OPTIONS
    allow_headers=["*"],
)

# ------------------------------------------------------------
# Logging
# ------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kinber")

# ------------------------------------------------------------
# Global error handler (safe, production-grade)
# ------------------------------------------------------------
@app.middleware("http")
async def error_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
        )

# ============================================================
# ROUTERS (✅ RELATIVE IMPORTS – FIXED)
# ============================================================
from .routes.thread import router as thread_router
from .routes.agent import router as agent_router
from .routes.agent_actions import router as actions_router
from .routes.search import router as tools_router
from .routes.triplet import router as triplet_router

# ✅ FIXED: Changed /api/thread to /api/threads (plural) to match REST conventions
# This matches the frontend expectations and standard API patterns
app.include_router(triplet_router, prefix="/api", tags=["Triplet"])
app.include_router(thread_router, prefix="/api/threads", tags=["Thread"])  # ← Changed from /thread to /threads
app.include_router(agent_router, prefix="/api/agent", tags=["Agent"])
app.include_router(actions_router, prefix="/api/actions", tags=["Actions"])
app.include_router(tools_router, prefix="/api/tools", tags=["Tools"])

# ------------------------------------------------------------
# Health check
# ------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok"}

