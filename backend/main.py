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
# Load .env
# ------------------------------------------------------------
env_path = os.path.join(os.path.dirname(__file__), ".env")
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
        "http://0.0.0.0:3000",
        "*",
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
        logger.info(f"{request.method} {request.url.path} [{response.status_code}] {duration:.2f}ms")
        return response
    except Exception as e:
        logger.error(f"❌ Exception at {request.url.path}:\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "path": request.url.path},
        )

# ------------------------------------------------------------
# Safe Router Registration
# ------------------------------------------------------------
def register_router(module, prefix: str, tag: str):
    try:
        if not prefix.startswith("/"):
            prefix = f"/{prefix}"

        if module and hasattr(module, "router"):
            app.include_router(module.router, prefix=prefix, tags=[tag])
            print(f"✅ Registered router '{tag}' → {prefix}")
        else:
            print(f"⚠️ Skipped '{tag}' — no router found.")
    except Exception as e:
        print(f"❌ Error registering router '{tag}': {e}")
        traceback.print_exc()

# ------------------------------------------------------------
# Routers that actually exist in your cleaned backend
# ------------------------------------------------------------
routes_to_load = [
    ("thread", "/api/thread", "Thread"),
    ("agent", "/api/agent", "Agent"),
    ("agent_actions", "/api/actions", "Agent Actions"),
    ("search", "/api/tools", "Tools"),
]

loaded_modules = {}
base_dir = pathlib.Path(__file__).resolve().parent / "routes"

print("\n🔍 Scanning backend.routes...\n")

for name, prefix, tag in routes_to_load:
    file_path = base_dir / f"{name}.py"
    print(f"🔎 Checking: {file_path}")

    if not file_path.exists():
        print(f"⚠️ Skipped '{tag}' — file not found.")
        loaded_modules[name] = None
        continue

    try:
        module = importlib.import_module(f"backend.routes.{name}")
        loaded_modules[name] = module
        print(f"✅ Imported backend.routes.{name}")
    except Exception as e:
        print(f"❌ Failed to import backend.routes.{name}: {e}")
        traceback.print_exc()
        loaded_modules[name] = None

# ------------------------------------------------------------
# Register Routers
# ------------------------------------------------------------
for name, prefix, tag in routes_to_load:
    register_router(loaded_modules.get(name), prefix, tag)

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
# Run Server
# ------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    print("\n🚀 Starting Backend… → http://127.0.0.1:8000/docs\n")

    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
