from fastapi import FastAPI, Request, HTTPException, Response, Depends, APIRouter, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
print("🔍 DEBUG: About to try importing Gemini...")

try:
    from backend.services.gemini import generate_response
    print("✅ Successfully imported Gemini service")
except ImportError as e:
    print(f"❌ Failed to import Gemini: {e}")
    from backend.services.deepseek import generate_response
    print("⚠️ Falling back to DeepSeek")

from backend.services.local_executor import local_executor
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from collections import OrderedDict
from typing import Dict, Any
import asyncio
import time
import uuid
import sys

# ─── Environment & Config ────────────────────────────────────────────────────
from dotenv import load_dotenv
from pydantic import BaseModel
from backend.utils.config import config, EnvMode
load_dotenv()

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# ─── Logging & Database ──────────────────────────────────────────────────────
from backend.utils.logger import logger, structlog
from backend.services.supabase import DBConnection

# ─── Optional Thread Manager ─────────────────────────────────────────────────
from backend.agentpress.thread_manager import ThreadManager

# ─── Sub‐API modules ──────────────────────────────────────────────────────────
from backend.agent import api as agent_api
# from backend.sandbox import api as sandbox_api
from backend.services import billing as billing_api
from backend.flags import api as feature_flags_api
from backend.services import transcription as transcription_api
from backend.services import email_api
from backend.triggers import api as triggers_api, unified_oauth_api
from backend.mcp_service import api as mcp_api
from backend.mcp_service import secure_api as secure_mcp_api
from backend.mcp_service import template_api as template_api
from backend.knowledge_base import api as knowledge_base_api
from backend.services.playground import router as playground_router

# ─── Shared Resources ─────────────────────────────────────────────────────────
db = DBConnection()
instance_id = "single"
ip_tracker = OrderedDict()
MAX_CONCURRENT_IPS = 25

# Store messages in memory (simple solution)
thread_messages = {}

# ─── Lifespan (startup & shutdown) ───────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting up (instance={instance_id}) in {config.ENV_MODE.value} mode")
    try:
        # await db.initialize()
        # agent_api.initialize(db, instance_id)
        # # sandbox_api.initialize(db)
        from services import redis
        try:
            await redis.initialize_async()
            logger.info("Redis initialized")
        except Exception as e:
            logger.error(f"Redis init failed: {e}")
        triggers_api.initialize(db)
        unified_oauth_api.initialize(db)
        yield
        # Cleanup on shutdown
        await agent_api.cleanup()
        try:
            await redis.close()
        except:
            pass
        # await db.disconnect()
    except Exception as e:
        logger.error(f"Lifespan error: {e}")
        raise

# ─── FastAPI App & Middleware ─────────────────────────────────────────────────
app = FastAPI(lifespan=lifespan)

@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    structlog.contextvars.clear_contextvars()
    req_id = str(uuid.uuid4())
    start = time.time()
    client_ip = request.client.host if request.client else "unknown"
    structlog.contextvars.bind_contextvars(
        request_id=req_id,
        client_ip=client_ip,
        method=request.method,
        path=request.url.path,
        query=str(request.query_params),
    )
    logger.info(f"→ {request.method} {request.url.path} from {client_ip}")
    try:
        resp = await call_next(request)
        elapsed = time.time() - start
        logger.debug(f"← {request.method} {request.url.path} [{resp.status_code}] {elapsed:.2f}s")
        return resp
    except Exception as e:
        elapsed = time.time() - start
        logger.error(f"✖ {request.method} {request.url.path} error={e} {elapsed:.2f}s")
        raise

# ─── CORS Configuration ──────────────────────────────────────────────────────
allowed_origins = ["https://www.kinber.com", "https://kinber.com"]
allow_origin_regex = None

if config.ENV_MODE == EnvMode.LOCAL:
    allowed_origins.append("http://localhost:3000")

if config.ENV_MODE == EnvMode.STAGING:
    allowed_origins += ["https://staging.kinber.com", "http://localhost:3000"]
    allow_origin_regex = r"https://kinber-.*-prjcts\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Main API Router ─────────────────────────────────────────────────────────
api_router = APIRouter()

# Core services
api_router.include_router(agent_api.router)
# api_router.include_router(# sandbox_api.router)
api_router.include_router(billing_api.router)
# api_router.include_router(feature_flags_api.router)  # Temporarily disabled

# 🎉 Playground endpoint
api_router.include_router(playground_router)

# MCP, transcription, email, knowledge base, triggers
api_router.include_router(mcp_api.router)
api_router.include_router(secure_mcp_api.router, prefix="/secure-mcp")
api_router.include_router(template_api.router, prefix="/templates")
api_router.include_router(transcription_api.router)
api_router.include_router(email_api.router)
api_router.include_router(knowledge_base_api.router)
api_router.include_router(triggers_api.router)
api_router.include_router(unified_oauth_api.router)

# ─── Health Check & Models Endpoints ─────────────────────────────────────────
@api_router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "instance_id": instance_id,
    }

@api_router.get("/models")
async def get_available_models():
    """Get list of available AI models"""
    models = [
        {"id": "gpt-4", "name": "GPT-4", "provider": "openai"},
        {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "provider": "openai"},
        {"id": "claude-3-sonnet", "name": "Claude 3 Sonnet", "provider": "anthropic"},
        {"id": "claude-3-haiku", "name": "Claude 3 Haiku", "provider": "anthropic"},
        {"id": "llama-3-70b", "name": "Llama 3 70B", "provider": "groq"}
    ]
    return {"models": models}

# Replace your existing endpoints with these fixed versions

# ─── Projects Endpoint ───────────────────────────────────────────────────────
@api_router.get("/projects")
async def get_projects():
    """Get user projects - simplified to one default project"""
    
    # Count total threads with messages
    thread_count = len([tid for tid, msgs in thread_messages.items() if msgs])
    
    projects = [
        {
            "project_id": "default",  # Changed from "id" to "project_id"
            "name": "General",
            "description": "Default project for conversations",
            "created_at": "2024-01-01T00:00:00Z",
            "thread_count": thread_count
        }
    ]
    
    print(f"🔍 PROJECTS: Returning {len(projects)} projects with {thread_count} threads")
    return {
        "projects": projects,
        "total": len(projects)
    }

# ─── Threads Endpoints ───────────────────────────────────────────────────────
@api_router.get("/threads")
async def get_threads():
    """Get threads from storage with better titles"""
    threads = []
    
    # Convert thread_messages to thread format
    for thread_id, messages in thread_messages.items():
        if messages:  # Only include threads with messages
            # Create meaningful title from first user message
            title = "New Conversation"
            for msg in messages:
                if msg.get("role") == "user" and msg.get("content"):
                    content = msg["content"].strip()
                    if content:  # Make sure content isn't empty
                        title = content[:50] + "..." if len(content) > 50 else content
                        break
            
            threads.append({
                "thread_id": thread_id,
                "title": title,  # Added meaningful title
                "project_id": "default",  # Added project association
                "created_at": messages[0].get("created_at") if messages else None,
                "updated_at": messages[-1].get("created_at") if messages else None,
                "message_count": len(messages)
            })
    
    # Sort by most recent first
    threads.sort(key=lambda x: x["updated_at"] or "", reverse=True)
    
    print(f"🔍 THREADS: Returning {len(threads)} threads")
    return {"threads": threads}

# ─── Add this new endpoint for project-specific threads ───────────────────────
@api_router.get("/projects/{project_id}/threads")
async def get_project_threads(project_id: str):
    """Get threads for a specific project"""
    if project_id == "default":
        # Return the same threads as the main endpoint
        return await get_threads()
    else:
        return {"threads": []}

# ─── Subscription Endpoint ───────────────────────────────────────────────────
@api_router.get("/subscription")
async def get_subscription_info():
    """Get subscription information"""
    return {
        "status": "active",
        "plan": "free", 
        "usage": {"requests": 0, "limit": 100},
        "features": ["basic_chat", "models_access"]
    }

# ─── Agents Endpoints ────────────────────────────────────────────────────────
@api_router.get("/agents")
async def get_agents():
    """Get list of agents"""
    return {
        "agents": [
            {
                "agent_id": "kinber-assistant-001",
                "name": "Kinber Assistant",
                "description": "AI assistant powered by DeepSeek",
                "model": "deepseek-chat",
                "instructions": "You are Kinber, a helpful AI assistant.",
                "created_at": "2025-07-21T00:00:00Z",
                "updated_at": "2025-07-21T00:00:00Z"
            }
        ],
        "pagination": {"total": 1, "page": 1, "limit": 100}
    }

# ─── Messages Endpoints ──────────────────────────────────────────────────────
@api_router.get("/thread/{thread_id}/messages")
async def get_thread_messages(thread_id: str):
    """Get messages for a thread"""
    print(f"DEBUG GET: thread_id={thread_id}")
    print(f"DEBUG GET: thread_messages keys={list(thread_messages.keys())}")
    
    if thread_id in thread_messages:
        print(f"DEBUG GET: Found {len(thread_messages[thread_id])} messages")
        return {"messages": thread_messages[thread_id]}
    
    print("DEBUG GET: No messages found, returning empty")
    return {"messages": []}
        
    if thread_id in thread_messages:
        print(f"DEBUG GET: Found {len(thread_messages[thread_id])} messages")
        return {"messages": thread_messages[thread_id]}
    
    print("DEBUG GET: No messages found, returning empty")
    return {"messages": []}   
    thread_messages[thread_id].append(ai_msg)
        
    return {"messages": thread_messages[thread_id]}

# ─── Additional Chat Endpoints ───────────────────────────────────────────────
@api_router.get("/agent-run/{agent_run_id}/conversation-history")
async def get_agent_run_conversation(agent_run_id: str):
    """Get agent run conversation history"""
    return {
        "conversation": [],
        "agent_run_id": agent_run_id
    }

@api_router.get("/billing/check-status")
async def check_billing_status():
    """Check billing status"""
    return {
        "status": "active",
        "plan": "free",
        "usage": {"requests": 0, "limit": 100}
    }

# ─── Feature Flags Endpoint ──────────────────────────────────────────────────
@api_router.get("/feature-flags/{flag_name}")
async def get_feature_flag(flag_name: str):
    """Get feature flag status"""
    # Enable specific flags
    enabled_flags = ["custom_agents", "agent_marketplace"]
    return {"enabled": flag_name in enabled_flags}

# ─── Agent Initiate Endpoint ─────────────────────────────────────────────────
@api_router.post("/agent/initiate")
async def initiate_agent():
    # Use the UUID we just created in Supabase
    thread_uuid = "00604d1c-7982-4dd5-a3ea-d19b5a7340c1"
    agent_run_uuid = "da8723b1-2d10-42e7-b36e-9d269b6c38b3"
    
    return {
        "success": True,
        "thread_id": thread_uuid,
        "agent_run_id": agent_run_uuid,
        "message": "Agent initiated successfully"
    }

@api_router.post("/thread/{thread_id}/agent/start")
async def start_agent(thread_id: str, request: Request):
    """Start agent for thread and process message - OPTIMIZED FOR 2-3s RESPONSE"""
    start_time = time.time()
    print(f"🚀 OPTIMIZED ENDPOINT: /thread/{thread_id}/agent/start")
    
    import uuid
    from services.gemini import generate_response
    from services.local_executor import local_executor
    
    # Parse request body
    body = await request.json()
    message = body.get("message", "")
    print(f"🚀 Processing message: {message[:50]}...")
    
    # Create workspace for potential code execution
    workspace = await local_executor.create_workspace(thread_id)
    print(f"🚀 Workspace ready: {workspace['id']}")
    
    # Initialize thread messages if not exists
    if thread_id not in thread_messages:
        thread_messages[thread_id] = []
    
    # Add user message (matching the format expected by frontend)
    user_message = {
        "id": f"msg-user-{int(time.time())}",
        "thread_id": thread_id,
        "role": "user",
        "content": message,
        "message_id": f"user_{len(thread_messages[thread_id])}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    thread_messages[thread_id].append(user_message)
    print(f"🔍 USER MESSAGE STORED: '{message[:50]}...' with ID: {user_message['id']}")
    print(f"[AGENT] Stored user message. Total messages now: {len(thread_messages[thread_id])}")
    print(f"[AGENT] Thread {thread_id} now has messages: {[msg['role'] for msg in thread_messages[thread_id]]}")
    
    try:
        # Generate AI response using optimized DeepSeek
        ai_response = await generate_response(message)
        
        # Fast response for simple questions
        if len(message.split()) <= 5 and any(word in message.lower() for word in ['capital', 'what is', 'who is', 'when is']):
            print(f"🚀 FAST MODE: Simple question detected")     
        # Check if message requires code execution
        execution_result = None
        if any(keyword in message.lower() for keyword in ['calculate', 'run', 'execute', 'code', 'script']):
            print(f"🚀 Message may need execution - workspace ready")
            # Could execute code here if needed:
            # execution_result = await local_executor.execute_code(workspace['id'], extracted_code)
        
# Add AI response (matching the format expected by frontend)
        assistant_message = {
            "id": f"msg-ai-{int(time.time())}",
            "thread_id": thread_id,
            "role": "assistant", 
            "content": ai_response,
            "message_id": f"assistant_{len(thread_messages[thread_id])}",
            "agent_id": "kinber-assistant-001",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "execution_result": execution_result
        }
        thread_messages[thread_id].append(assistant_message)
        
        agent_run_uuid = str(uuid.uuid4())
        total_time = time.time() - start_time
        print(f"🚀 OPTIMIZED: Processed in {total_time:.2f}s, stored {len(thread_messages[thread_id])} total messages")
        
        return {
            "agent_run_id": agent_run_uuid,
            "status": "completed",
            "thread_id": thread_id,
            "response": ai_response,
            "execution_time": total_time
        }
        
    except Exception as e:
        total_time = time.time() - start_time
        print(f"🚀 ERROR after {total_time:.2f}s: {e}")
        
        # Cleanup workspace on error
        await local_executor.cleanup_workspace(workspace['id'])
        
        return {
            "agent_run_id": str(uuid.uuid4()),
            "status": "error", 
            "thread_id": thread_id,
            "error": str(e),
            "execution_time": total_time
        }
# Simple async response cache
response_cache = {}

async def generate_response_cached(message: str):
    """Cache responses for common questions"""
    # Use first 50 chars as cache key
    cache_key = message.lower().strip()[:50]
    
    if cache_key in response_cache:
        print(f"🚀 CACHE HIT: Instant response for: {cache_key[:30]}...")
        return response_cache[cache_key]
    
    # Generate new response
    response = await generate_response(message)
    
    # Cache it (limit cache size to 100 items)
    if len(response_cache) < 100:
        response_cache[cache_key] = response
        print(f"🚀 CACHED: Response for: {cache_key[:30]}...")
    
    return response

@api_router.get("/agent-run/{agent_run_id}")
async def get_agent_run(agent_run_id: str):
    """Get agent run status"""
    return {
        "agent_run_id": agent_run_id,
        "status": "completed",
        "response": "Hello! I'm Kinber, your AI assistant. How can I help you today?"
    }

@api_router.get("/agent-run/{agent_run_id}/stream")
async def stream_agent_response(agent_run_id: str):
    """Stream agent response"""
    return {
        "content": "Hello! I'm Kinber, your AI assistant. How can I help you today?",
        "status": "completed"
    }

@api_router.get("/thread/{thread_id}/agent-runs")
async def get_thread_agent_runs(thread_id: str):
    """Get agent runs for specific thread"""
    # Return agent runs from stored messages
    if thread_id in thread_messages:
        agent_runs = []
        for i, msg in enumerate(thread_messages[thread_id]):
            if msg.get("role") == "assistant":
                agent_runs.append({
                    "agent_run_id": msg.get("id", f"run-{i}"),
                    "status": "completed",
                    "thread_id": thread_id,
                    "response": msg.get("content", ""),
                    "created_at": msg.get("created_at")
                })
        return {"agent_runs": agent_runs}
    
    return {"agent_runs": []}
# ─── Missing Frontend Endpoints ──────────────────────────────────────────────
@api_router.get("/agent-runs")
async def get_agent_runs():
    """Get agent runs - frontend expects this endpoint"""
    return []

@api_router.get("/agent-runs/{agent_run_id}")
async def get_agent_run_status(agent_run_id: str):
    """Get specific agent run status"""
    return {
        "agent_run_id": agent_run_id,
        "status": "completed",
        "thread_id": "default",
        "response": "Ready to help!"
    }

@api_router.get("/thread/{thread_id}/agent")
async def get_thread_agent(thread_id: str):
    """Get agent for specific thread"""
    return {
        "agent_id": "kinber-assistant-001",
        "name": "Kinber Assistant", 
        "thread_id": thread_id,
        "status": "active"
    }

@api_router.get("/billing/status")
async def get_billing_status():
    """Billing status endpoint - different from check-status"""
    return {
        "status": "active",
        "plan": "free",
        "usage": {"requests": 0, "limit": 100}
    }

# Remove catch-all route temporarily for debugging
# @api_router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
# async def catch_all(request: Request, path: str):
#     """Log all unmatched requests"""
#     logger.info(f"Unmatched request: {request.method} /{path}")
#     return {"error": "Not found", "path": path, "method": request.method}

# Mount all routes under /api
app.include_router(api_router, prefix="/api")