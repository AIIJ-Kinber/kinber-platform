# backend/services/playground.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from daytona_sdk import *
print("Available classes:", [x for x in dir() if 'Sandbox' in x or 'Create' in x])
import os
from dotenv import load_dotenv

# ─── Load ENV ────────────────────────────────────────────────────────────────
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

# ─── Initialize Daytona client ───────────────────────────────────────────────
config = DaytonaConfig(
    api_key=os.environ.get("DAYTONA_API_KEY"),
    api_url=os.environ.get("DAYTONA_SERVER_URL"),
    target=os.environ.get("DAYTONA_TARGET"),
)
client = Daytona(config)

# ─── FastAPI router ──────────────────────────────────────────────────────────
router = APIRouter()

class ExecuteCodeRequest(BaseModel):
    code: str
    language: str = "python"

@router.post("/api/playground/run", tags=["playground"])
def run_playground_code(req: ExecuteCodeRequest):
    """Spin up a sandbox, run the code, clean up, and return stdout+stderr."""
    try:
        # 1) Create a sandbox
        params = CreateSandboxParams(name="playground", language=req.language)
        sandbox = client.create(params)

        # 2) Execute the code
        result = client.process.code_run(sandbox, req.code)

        # 3) Return both output and any errors
        return {"output": result.output, "errors": result.errors}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # 4) Always clean up the sandbox
        try:
            client.remove(sandbox)
        except:
            pass
