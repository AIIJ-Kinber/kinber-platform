# Root entrypoint for Railway (and local if needed)
# This file exists so Railway can run: uvicorn main:app
from backend.main import app  # noqa: F401