#kinber-platform\backend\main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.routes import chat
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
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ------------------------------------------------------------
# CORS Configuration (✅ MUST BE BEFORE ROUTES!)
# ------------------------------------------------------------
# Get allowed origins from environment
ALLOWED_ORIGINS_ENV = os.getenv("ALLOWED_ORIGINS", "")

if ALLOWED_ORIGINS_ENV:
    ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_ENV.split(",") if origin.strip()]
    print(f"🔒 Using ALLOWED_ORIGINS from environment: {ALLOWED_ORIGINS}")
else:
    # Default origins
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://www.kinber.com",
        "https://kinber.com",
        "https://kinber-platform.vercel.app",
    ]
    print(f"🔓 Using default ALLOWED_ORIGINS: {ALLOWED_ORIGINS}")

# ✅ Add CORS middleware BEFORE any other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

print("✅ CORS middleware configured")

# ------------------------------------------------------------
# Logging Configuration
# ------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("kinber")

# ✅ Log startup info
logger.info(f"🚀 Kinber Backend starting...")
logger.info(f"   CORS Origins: {ALLOWED_ORIGINS}")
logger.info(f"   OpenAI: {'✅' if os.getenv('OPENAI_API_KEY') else '❌'}")
logger.info(f"   Anthropic: {'✅' if os.getenv('ANTHROPIC_API_KEY') else '❌'}")
logger.info(f"   DeepSeek: {'✅' if os.getenv('DEEPSEEK_API_KEY') else '❌'}")
logger.info(f"   Supabase: {'✅' if os.getenv('SUPABASE_URL') else '❌'}")

# ------------------------------------------------------------
# Security Headers Middleware
# ------------------------------------------------------------
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    return response

# ------------------------------------------------------------
# Global Error Handler
# ------------------------------------------------------------
@app.middleware("http")
async def error_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"❌ Unhandled error on {request.method} {request.url.path}")
        logger.error(traceback.format_exc())
        
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "path": request.url.path,
                "method": request.method,
            },
        )

# ------------------------------------------------------------
# Request Logging Middleware
# ------------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"📥 {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"📤 {request.method} {request.url.path} → {response.status_code}")
    return response

# ============================================================
# ROUTERS
# ============================================================
try:
    from .routes.thread import router as thread_router
    from .routes.agent import router as agent_router
    from .routes.agent_actions import router as actions_router
    from .routes.search import router as tools_router
    from .routes.triplet import router as triplet_router
    
    app.include_router(triplet_router, prefix="/api", tags=["Triplet"])
    app.include_router(thread_router, prefix="/api/threads", tags=["Thread"])
    app.include_router(agent_router, prefix="/api/agent", tags=["Agent"])
    app.include_router(actions_router, prefix="/api/actions", tags=["Actions"])
    app.include_router(tools_router, prefix="/api/tools", tags=["Tools"])
    app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
    
    logger.info("✅ All routers loaded successfully")
    
except Exception as e:
    logger.error(f"❌ Failed to load routers: {e}")
    logger.error(traceback.format_exc())
    raise

# ------------------------------------------------------------
# Health Check
# ------------------------------------------------------------
@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "services": {
            "openai": "configured" if os.getenv("OPENAI_API_KEY") else "missing",
            "anthropic": "configured" if os.getenv("ANTHROPIC_API_KEY") else "missing",
            "deepseek": "configured" if os.getenv("DEEPSEEK_API_KEY") else "missing",
            "supabase": "configured" if os.getenv("SUPABASE_URL") else "missing",
        }
    }

# ------------------------------------------------------------
# Root Endpoint
# ------------------------------------------------------------
@app.get("/")
def root():
    return {
        "name": "Kinber API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "health": "/api/health",
    }