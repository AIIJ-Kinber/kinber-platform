from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback
import logging
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Kinber Backend",
    version="1.0.0",
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://www.kinber.com",
    "https://kinber.com",
    "https://kinber-platform.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kinber")

@app.middleware("http")
async def error_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

# ✅ ROUTERS
from routes.thread import router as thread_router
from routes.agent import router as agent_router
from routes.agent_actions import router as actions_router
from routes.search import router as tools_router

app.include_router(thread_router, prefix="/api/thread")
app.include_router(agent_router, prefix="/api/agent")
app.include_router(actions_router, prefix="/api/actions")
app.include_router(tools_router, prefix="/api/tools")

@app.get("/api/health")
def health():
    return {"status": "ok"}
