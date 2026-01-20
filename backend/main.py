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
    docs_url="/api/docs",  # Swagger UI
    redoc_url="/api/redoc",  # ReDoc
)

# ------------------------------------------------------------
# CORS Configuration (✅ IMPROVED FOR TEAM ACCESS)
# ------------------------------------------------------------
# Get custom origins from environment variable (for production)
CUSTOM_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")
CUSTOM_ORIGINS = [origin.strip() for origin in CUSTOM_ORIGINS if origin.strip()]

# Default allowed origins (development + production)
ALLOWED_ORIGINS = [
    # Local development
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    
    # Production domains
    "https://www.kinber.com",
    "https://kinber.com",
    "https://kinber-platform.vercel.app",
    
    # Add custom origins from environment
    *CUSTOM_ORIGINS,
]

# ✅ IMPROVED: Check if running in development mode
IS_DEV = os.getenv("ENVIRONMENT", "development") == "development"

# ✅ In development, allow all origins for team testing
if IS_DEV:
    print("🔓 Running in DEVELOPMENT mode - CORS allows all origins")
    ALLOWED_ORIGINS = ["*"]
else:
    print(f"🔒 Running in PRODUCTION mode - CORS limited to: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

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
logger.info(f"   Environment: {os.getenv('ENVIRONMENT', 'development')}")
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
    
    # Don't cache API responses
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    
    return response

# ------------------------------------------------------------
# Global Error Handler (Safe, Production-Grade)
# ------------------------------------------------------------
@app.middleware("http")
async def error_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        # Log full traceback
        logger.error(f"❌ Unhandled error on {request.method} {request.url.path}")
        logger.error(traceback.format_exc())
        
        # Return safe error message
        error_detail = str(e) if IS_DEV else "Internal server error"
        
        return JSONResponse(
            status_code=500,
            content={
                "error": error_detail,
                "path": request.url.path,
                "method": request.method,
            },
        )

# ------------------------------------------------------------
# Request Logging Middleware (Development Only)
# ------------------------------------------------------------
if IS_DEV:
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        logger.info(f"📥 {request.method} {request.url.path}")
        response = await call_next(request)
        logger.info(f"📤 {request.method} {request.url.path} → {response.status_code}")
        return response

# ============================================================
# ROUTERS (✅ RELATIVE IMPORTS)
# ============================================================
try:
    from .routes.thread import router as thread_router
    from .routes.agent import router as agent_router
    from .routes.agent_actions import router as actions_router
    from .routes.search import router as tools_router
    from .routes.triplet import router as triplet_router
    
    # Include all routers
    app.include_router(triplet_router, prefix="/api", tags=["Triplet"])
    app.include_router(thread_router, prefix="/api/threads", tags=["Thread"])
    app.include_router(agent_router, prefix="/api/agent", tags=["Agent"])
    app.include_router(actions_router, prefix="/api/actions", tags=["Actions"])
    app.include_router(tools_router, prefix="/api/tools", tags=["Tools"])
    
    logger.info("✅ All routers loaded successfully")
    
except Exception as e:
    logger.error(f"❌ Failed to load routers: {e}")
    logger.error(traceback.format_exc())
    raise

# ------------------------------------------------------------
# Health Check Endpoint
# ------------------------------------------------------------
@app.get("/api/health")
def health():
    """
    Health check endpoint for monitoring
    Returns API keys status (without exposing actual keys)
    """
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
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
    """
    Root endpoint with API information
    """
    return {
        "name": "Kinber API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "health": "/api/health",
        "environment": os.getenv("ENVIRONMENT", "development"),
    }

# ------------------------------------------------------------
# Startup Event
# ------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    """
    Run on application startup
    """
    logger.info("=" * 60)
    logger.info("🎉 KINBER BACKEND STARTED SUCCESSFULLY")
    logger.info("=" * 60)
    logger.info(f"📍 Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"🔗 Docs available at: /api/docs")
    logger.info(f"❤️  Health check at: /api/health")
    logger.info("=" * 60)

# ------------------------------------------------------------
# Shutdown Event
# ------------------------------------------------------------
@app.on_event("shutdown")
async def shutdown_event():
    """
    Run on application shutdown
    """
    logger.info("👋 Shutting down Kinber backend...")


