
import sys
import os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import importlib
import traceback
import os
import pathlib
import logging
import time
from dotenv import load_dotenv

# ------------------------------------------------------------
# Load .env (local only – Railway uses env vars)
# ------------------------------------------------------------
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)

# ------------------------------------------------------------
# Initialize FastAPI App
# ------------------------------------------------------------
app = FastAPI(
    title="Kinber Backend",
    version="1.0.0",
    description="Backend API for Kinber Platform",
)

app.router.redirect_slashes = True

# ------------------------------------------------------------
# CORS
# ------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://www.kinber.com",
        "https://kinber.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------
# Logging Setup
# ------------------------------------------------------------
LOG_DIR = pathlib.Path(__file__).resolve().parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    filename=LOG_DIR / "kinber.log",
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("kinber")

# ------------------------------------------------------------
# Global Error Handler
# ------------------------------------------------------------
@app.middleware("http")
async def global_error_handler(request: Request, call_next):
    start = time.time()
    try:
        response = await call_next(request)
        duration = (time.time() - start) * 1000
        logger.info(
            f"{request.method} {request.url.path} "
            f"[{response.status_code}] {duration:.2f}ms"
        )
        return response
    except Exception as e:
        logger.error(
            f"❌ Exception at {request.url.path}:\n{traceback.format_exc()}"
        )
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": str(e),
                "path": request.url.path,
            },
        )

# ------------------------------------------------------------
# Router Loader (NO double prefixes)
# ------------------------------------------------------------
def safe_import_router(name: str):
    try:
        module = importlib.import_module(f"backend.routes.{name}")
        if hasattr(module, "router"):
            return module.router
        print(f"⚠️ backend.routes.{name} has no router")
        return None
    except Exception as e:
        print(f"❌ Failed to import backend.routes.{name}: {e}")
        traceback.print_exc()
        return None

# ------------------------------------------------------------
# Load & Mount Routers
# ------------------------------------------------------------
print("\n🔍 Loading backend routes...\n")

thread_router = safe_import_router("thread")
agent_router = safe_import_router("agent")
agent_actions_router = safe_import_router("agent_actions")
tools_router = safe_import_router("search")

# IMPORTANT:
# Only `/api` prefix lives here
if thread_router:
    app.include_router(thread_router, prefix="/api")
    print("✅ Mounted Thread → /api/thread")

if agent_router:
    app.include_router(agent_router, prefix="/api")
    print("✅ Mounted Agent → /api/agent")

if agent_actions_router:
    app.include_router(agent_actions_router, prefix="/api")
    print("✅ Mounted Agent Actions → /api/actions")

if tools_router:
    app.include_router(tools_router, prefix="/api")
    print("✅ Mounted Tools → /api/tools")

# ------------------------------------------------------------
# Health Check
# ------------------------------------------------------------
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Backend is running."}

# ------------------------------------------------------------
# Debug Route List
# ------------------------------------------------------------
@app.get("/api/debug/routes")
def list_routes():
    try:
        routes = [
            {"path": r.path, "methods": list(r.methods), "name": r.name}
            for r in app.router.routes
        ]
        return {"routes": routes, "count": len(routes)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------
# Run Server (Local)
# ------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    print("\n🚀 Starting Backend → http://127.0.0.1:8000/docs\n")

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
