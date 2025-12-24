from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

import traceback
import uuid
from io import BytesIO
from datetime import datetime
import base64

# --------------------------------------------------
# Supabase
# --------------------------------------------------
from db.supabase_client import get_supabase

# --------------------------------------------------
# Gemini services
# --------------------------------------------------
from services.gemini import (
    run_gemini_agent,
    analyze_image_with_gemini,
)

# --------------------------------------------------
# Attachment text extraction (SAFE PLACEHOLDER)
# --------------------------------------------------
def extract_attachment_text(source: Any) -> str:
    """
    Placeholder for attachment text extraction.

    - source can be:
      • BytesIO (raw file bytes)
      • str (URL or base64)

    Returns extracted text as string.
    """
    # TODO: plug OCR / PDF / DOCX extraction later
    return ""

# --------------------------------------------------
# Router
# --------------------------------------------------
router = APIRouter(tags=["Thread"])


# ────────────────────────────────────────────────
# MODELS
# ────────────────────────────────────────────────

class ThreadCreate(BaseModel):
    title: str = "New Conversation"
    user_id: Optional[str] = None


class MessageBody(BaseModel):
    model_config = {"protected_namespaces": ()}

    message: str
    model_name: Optional[str] = "gemini-2.0-flash-exp"
    agent: Optional[str] = "default"
    attachments: Optional[List[Dict[str, Any]]] = []


# ────────────────────────────────────────────────
# CREATE THREAD
# ────────────────────────────────────────────────
@router.post("")
async def create_thread(body: ThreadCreate):
    try:
        print(f"🧵 Creating new thread → title={body.title}, user_id={body.user_id}")

        supabase = get_supabase()

        thread_id = str(uuid.uuid4())

        insert_data = {
            "thread_id": thread_id,
            "title": body.title or "New Conversation",
            "created_at": datetime.utcnow().isoformat(),
        }

        if body.user_id:
            try:
                uuid.UUID(body.user_id)
                insert_data["user_id"] = body.user_id
            except ValueError:
                print(f"⚠️ Invalid user_id ignored: {body.user_id}")

        supabase.table("threads").insert(insert_data).execute()

        print(f"✅ Thread created: {thread_id}")
        return JSONResponse({"thread_id": thread_id})

    except Exception as e:
        print("❌ create_thread error:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ────────────────────────────────────────────────
# GET THREAD MESSAGES
# ────────────────────────────────────────────────
@router.get("/{thread_id}")
async def get_thread(thread_id: str):
    try:
        print(f"📨 Fetching messages for thread: {thread_id}")

        # Validate UUID early
        try:
            uuid.UUID(thread_id)
        except ValueError:
            return JSONResponse(
                {"thread_id": thread_id, "messages": []}
            )


        # Fetch messages
        supabase = get_supabase()

        result = (
            supabase
            .table("messages")
            .select("*")
            .eq("thread_id", thread_id)
            .order("created_at", desc=False)
            .execute()
        )

        messages = result.data or []

        return JSONResponse(
            {
                "thread_id": thread_id,
                "messages": messages,
            }
        )

    except Exception as e:
        print("❌ get_thread error:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ────────────────────────────────────────────────
# START AGENT RUN
# ────────────────────────────────────────────────
@router.post("/{thread_id}/agent/start")
async def start_agent_run(thread_id: str, body: MessageBody):
    try:
        print(f"🤖 Agent start → thread={thread_id}")

        supabase = get_supabase()

                # Save user message
        supabase = get_supabase()

        supabase.table("messages").insert(
            {
                "thread_id": thread_id,
                "role": "user",
                "content": body.message,
                "created_at": datetime.utcnow().isoformat(),
            }
        ).execute()


        # Run Gemini
        ai_reply = await run_gemini_agent(
            body.message,
            agent=body.agent,
            model_name=body.model_name,
        )

        # Save assistant reply
        supabase = get_supabase()

        supabase.table("messages").insert(
            {
                "thread_id": thread_id,
                "role": "assistant",
                "content": ai_reply,
                "created_at": datetime.utcnow().isoformat(),
            }
        ).execute()

        return JSONResponse(
            {
                "assistant_reply": ai_reply,
            }
        )

    except Exception as e:
        print("❌ agent/start error:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ────────────────────────────────────────────────
# PROCESS USER MESSAGE (AGENT RUN)
# ────────────────────────────────────────────────
@router.post("/{thread_id}/agent/start")
async def start_agent_run(thread_id: str, request: Request):
    try:
        body = await request.json()

        message = body.get("message", "").strip()
        model_name = body.get("model_name", "gemini-2.0-flash-exp")
        attachments = body.get("attachments", []) or []
        agent = body.get("agent", "default")

        print(f"\n🚀 Agent Start → thread={thread_id}")
        print(f"💬 User message: {message}")
        print(f"📎 Attachments received: {len(attachments)}")

        # ───────────────────────────────
        # 🧠 Static Memory Report Command
        # ───────────────────────────────
        memory_query_keywords = [
            "what do you remember",
            "show memory",
            "show memories",
            "show thread memory",
            "memory report",
            "recall memory",
            "what do you remember about this",
            "what do you remember about this thread",
        ]

        if any(k in message.lower() for k in memory_query_keywords):
            print("🧠 Memory report requested")

            # Short-Term Memory (STM)
            stm_list: List[Dict[str, Any]] = []
            try:

                supabase = get_supabase()
                history_res = (
                    supabase.table("messages")
                    .select("role, content, created_at")
                    .eq("thread_id", thread_id)
                    .order("created_at", desc=False)
                    .limit(8)
                    .execute()
                )

                history = history_res.data or []
                for m in history[-8:]:
                    stm_list.append(
                        {
                            "role": (m.get("role") or "assistant"),
                            "content": (m.get("content") or ""),
                            "created_at": m.get("created_at"),
                        }
                    )
            except Exception as e:
                print("⚠️ STM load failed:", e)

            # ───────────────────────────────
            # Mid-Term Memory (MTM)
            # ───────────────────────────────
            mtm_value = None
            try:
                supabase = get_supabase()
                trow = (
                    supabase.table("threads")
                    .select("summary, metadata")
                    .eq("thread_id", thread_id)
                    .limit(1)
                    .execute()
                )

                row = (trow.data or [{}])[0]

                mtm_value = (
                    row.get("summary")
                    or (
                        row.get("metadata", {})
                        .get("memory", {})
                        .get("mid_summary")
                        if isinstance(row.get("metadata"), dict)
                        else None
                    )
                )

            except Exception as e:
                print("⚠️ MTM load failed:", e)

            # ───────────────────────────────
            # Long-Term Memory (LTM)
            # ───────────────────────────────
            ltm_list: List[Dict[str, Any]] = []
            try:
                supabase = get_supabase()
                ltm_res = (
                    supabase.table("long_term_memory")
                    .select("memory_type, content, importance, source, created_at")
                    .eq("thread_id", thread_id)
                    .order("importance", desc=True)
                    .limit(25)
                    .execute()
                )

                ltm_list = ltm_res.data or []

            except Exception as e:
                print("⚠️ LTM load failed:", e)

            # -----------------------------------------------
            # Build human-readable memory report reply
            # -----------------------------------------------
            reply_text = "Here is what I remember about this thread:\n\n"

            reply_text += "🧠 **Long-Term Memory:**\n"
            if ltm_list:
                for row in ltm_list:
                    reply_text += (
                        f"- ({row.get('memory_type')}, importance {row.get('importance')}): "
                        f"{row.get('content')}\n"
                    )
            else:
                reply_text += "- No long-term memories stored yet.\n"

            reply_text += "\n🧩 **Mid-Term Memory:**\n"
            if mtm_value:
                reply_text += mtm_value + "\n"
            else:
                reply_text += "No mid-term summary available.\n"

            reply_text += "\n🕒 **Short-Term Memory (recent messages):**\n"
            if stm_list:
                for m in stm_list:
                    reply_text += f"- {m['role'].capitalize()}: {m['content']}\n"
            else:
                reply_text += "- No recent messages found.\n"

            return JSONResponse(
                {
                    "status": "success",
                    "data": {
                        "assistant_reply": reply_text,
                        "memory_report": {
                            "stm": stm_list,
                            "mtm": mtm_value,
                            "ltm": ltm_list,
                        },
                    },
                }
            )

        # ───────────────────────────────
        # ───────────────────────────────
        # 0️⃣ Load user_id for LTM writing
        # ───────────────────────────────
        user_id = None
        try:
            supabase = get_supabase()
            res = (
                supabase.table("threads")
                .select("user_id")
                .eq("thread_id", thread_id)
                .limit(1)
                .execute()
            )

            if res.data and len(res.data) > 0:
                user_id = res.data[0].get("user_id")

        except Exception as e:
            print("⚠️ Failed to load thread user_id:", e)

        # ───────────────────────────────
        # 🧠 Auto-assign user_id if missing
        # ───────────────────────────────
        if not user_id:
            print("🧠 No user_id found — assigning thread_id as default user identity.")

            user_id = thread_id  # assign default identity

            try:
                supabase.table("threads").update(
                    {
                        "user_id": user_id,
                    }
                ).eq("thread_id", thread_id).execute()
                print("🧠 user_id updated successfully in thread.")
            except Exception as e:
                print("⚠️ Failed to update thread user_id:", e)

        # ───────────────────────────────
        # 🧠 Explicit Memory Save (user-initiated)
        # ───────────────────────────────
        try:
            explicit_memory_keywords = [
                "remember this",
                "remember that",
                "remember",
                "please remember",
                "store this",
                "save this",
                "save this information",
                "add this to memory",
                "add to memory",
            ]

            if user_id and any(k in message.lower() for k in explicit_memory_keywords):
                supabase.table("long_term_memory").insert(
                    {
                        "user_id": user_id,
                        "thread_id": thread_id,
                        "memory_type": "fact",
                        "content": message[:2000],  # truncate for safety
                        "importance": 0.7,
                        "source": "user",
                    }
                ).execute()

                print("🧠 Explicit user memory saved.")

        except Exception as e:
            print("⚠️ Explicit memory save failed:", e)

        # ───────────────────────────────
        # Load recent conversation (STM)
        # ───────────────────────────────
        recent_context = ""
        try:
            supabase = get_supabase()

            history_res = (
                supabase.table("messages")
                .select("role, content, created_at")
                .eq("thread_id", thread_id)
                .order("created_at", desc=False)
                .limit(8)
                .execute()
            )

            history = history_res.data or []
            lines: List[str] = []

            for m in history:
                role = (m.get("role") or "assistant").lower()
                label = "User" if role == "user" else "Assistant"
                content = (m.get("content") or "").strip()

                if not content:
                    continue

                if len(content) > 500:
                    content = content[:500] + "…"

                lines.append(f"{label}: {content}")

            recent_context = "\n".join(lines)

        except Exception as e:
            print("⚠️ Failed to load recent messages (STM):", e)
            recent_context = ""

        except Exception as e:
            print("⚠️ Failed to load recent messages:", e)
            recent_context = ""

        # ───────────────────────────────
        # ───────────────────────────────
        # Load Long-Term Memory (LTM)
        # ───────────────────────────────
        ltm_string = ""
        try:
            supabase = get_supabase()

            ltm_res = (
                supabase.table("long_term_memory")
                .select("memory_type, content, importance")
                .eq("thread_id", thread_id)
                .order("importance", desc=True)
                .limit(10)
                .execute()
            )

            ltm_items = ltm_res.data or []

            if ltm_items:
                lines = ["Long-Term Memory:"]
                for row in ltm_items:
                    memory_type = row.get("memory_type", "unknown")
                    importance = row.get("importance", 0)
                    content = (row.get("content") or "").strip()

                    if not content:
                        continue

                    if len(content) > 600:
                        content = content[:600] + "…"

                    lines.append(
                        f"- ({memory_type}, importance={importance}): {content}"
                    )

                ltm_string = "\n".join(lines)

            print(f"🧠 Loaded LTM entries: {len(ltm_items)}")

        except Exception as e:
            print("⚠️ Failed to load long-term memory (LTM):", e)
            ltm_string = ""

        # ───────────────────────────────
        # ───────────────────────────────
        # Load Mid-Term Memory (MTM)
        # ───────────────────────────────
        mid_summary = None
        try:
            supabase = get_supabase()

            res = (
                supabase.table("threads")
                .select("summary, metadata")
                .eq("thread_id", thread_id)
                .limit(1)
                .execute()
            )

            row = (res.data or [None])[0]

            if row:
                thread_summary = row.get("summary")
                metadata = row.get("metadata") or {}

                meta_summary = (
                    metadata.get("memory", {}).get("mid_summary")
                    if isinstance(metadata, dict)
                    else None
                )

                mid_summary = meta_summary or thread_summary

                if mid_summary:
                    if len(mid_summary) > 800:
                        mid_summary = mid_summary[:800] + "…"

                    print("🧠 MTM loaded")

        except Exception as e:
            print("⚠️ Failed to load thread mid-term memory (MTM):", e)
            mid_summary = None

        # ───────────────────────────────
        # OCR Extraction (PDF / DOCX / TXT) — FIXED
        # Prioritize BASE64. Avoid Google Drive URL downloads (403 issue)
        # ───────────────────────────────
        ocr_metadata: List[Dict[str, Any]] = []

        for file in attachments:
            file_name = (file.get("name") or "").lower()
            base64_data = file.get("base64")
            url = file.get("url")

            # -----------------------------
            # 1️⃣ BASE64 FIRST (PDF primary)
            # -----------------------------
            if base64_data and file_name.endswith(".pdf"):
                print(f"📄 OCR (base64) for PDF: {file_name}")
                try:
                    b64 = base64_data.split(",")[-1]
                    pdf_bytes = base64.b64decode(b64)

                    try:
                        from pypdf import PdfReader
                        reader = PdfReader(BytesIO(pdf_bytes))
                        text = "\n".join(
                            (page.extract_text() or "") for page in reader.pages
                        )
                    except Exception as e:
                        print(f"⚠️ pypdf failed for {file_name}: {e}")
                        text = ""

                    if text:
                        ocr_metadata.append({
                            "name": file.get("name"),
                            "text": text[:4000],
                        })
                        continue

                except Exception as e:
                    print(f"⚠️ PDF base64 OCR failed for {file_name}: {e}")

            # -------------------------------------------
            # 2️⃣ GENERIC BASE64 EXTRACTION
            # -------------------------------------------
            if base64_data and not file_name.endswith(".pdf"):
                print(f"📄 OCR (base64 generic) for: {file_name}")
                try:
                    b64 = base64_data.split(",")[-1]
                    raw_bytes = base64.b64decode(b64)
                    text = extract_attachment_text(BytesIO(raw_bytes))
                    if text:
                        ocr_metadata.append({
                            "name": file.get("name"),
                            "text": text[:4000]
                        })
                        continue
                except Exception as e:
                    print(f"⚠️ Generic base64 OCR failed: {e}")

            # -------------------------------------------
            # 3️⃣ URL FALLBACK
            # -------------------------------------------
            if url and not base64_data:
                print(f"📄 OCR (url) fallback for: {file_name}")
                try:
                    text = extract_attachment_text(url)
                    if text:
                        ocr_metadata.append({
                            "name": file.get("name"),
                            "text": text[:4000]
                        })
                except Exception as e:
                    print(f"⚠️ OCR URL error for {file_name}: {e}")

        # <-- OCR extraction loop just ended here

        # ───────────────────────────────
        # Store OCR text in thread metadata (only once)
        # ───────────────────────────────
        try:
            if ocr_metadata:
                print("📝 Saving OCR text to thread metadata...")

                supabase = get_supabase()

                res = (
                    supabase.table("threads")
                    .select("metadata")
                    .eq("thread_id", thread_id)
                    .limit(1)
                    .execute()
                )

                row = (res.data or [None])[0]
                old_meta = row.get("metadata") if row else {}

                if not isinstance(old_meta, dict):
                    old_meta = {}

                supabase.table("threads").update(
                    {
                        "metadata": {
                            **old_meta,
                            "ocr_documents": ocr_metadata,
                        }
                    }
                ).eq("thread_id", thread_id).execute()

                print("✅ OCR text stored in thread metadata.")

        except Exception as e:
            print("⚠️ Failed to save OCR to metadata:", e)

        # ───────────────────────────────
        # Inject OCR Text into User Message
        # ───────────────────────────────
        if ocr_metadata:
            print(f"📄 Injecting {len(ocr_metadata)} document(s) OCR into message")
            blocks = []
            for doc in ocr_metadata:
                blocks.append(
                    f"--- DOCUMENT: {doc['name']} ---\n{doc.get('text', '')}"
                )

            message += "\n\n" + "\n\n".join(blocks)

        # ───────────────────────────────
        # Vision Analysis (Images)
        # ───────────────────────────────
        vision_results = []
        vision_metadata = []

        for idx, file in enumerate(attachments):
            mime = file.get("type", "") or ""
            base64_data = file.get("base64")

            if mime.startswith("image") and base64_data:
                print(f"📸 Vision → analyzing image {idx+1}: {file.get('name')}")
                try:
                    description = await analyze_image_with_gemini(
                        base64_data,
                        mime_type=mime,
                    )
                except Exception as e:
                    print(f"❌ Vision failed on image {file.get('name')}: {e}")
                    description = "I could not analyze this image."

                vision_results.append(
                    {
                        "index": idx + 1,
                        "name": file.get("name"),
                        "description": description,
                    }
                )

                vision_metadata.append(
                    {
                        "name": file.get("name"),
                        "description": description,
                    }
                )

        # ───────────────────────────────
        # Run Gemini Agent (uses STM + MTM + LTM)
        # ───────────────────────────────
        print(f"🔍 Running Gemini agent: model={model_name}")

        agent_reply = await run_gemini_agent(
            message,
            ocr=ocr_metadata,
            vision=vision_metadata,
            conversation=recent_context,
            mid_summary=mid_summary,
            long_term_memory=ltm_string,
            model_name=model_name,
            agent=agent,
        )

        # -------------------------------------------------------
        # 🛠️ TOOL CALL HANDLER (JSON tool-call from Gemini)
        # -------------------------------------------------------
        tool_result = None
        tool_call = None

        # Extract tool_call from agent_reply if present
        try:
            import json
            if isinstance(agent_reply, str):
                parsed = json.loads(agent_reply)
                if isinstance(parsed, dict):
                    tool_call = parsed.get("tool_call")
        except Exception:
            tool_call = None

        if tool_call:
            tool = tool_call.get("tool")
            print("🔧 Detected tool call:", tool_call)

            # -----------------------------------
            # WEB SEARCH TOOL
            # -----------------------------------
            if tool == "websearch":
                try:
                    from routes.agent_actions import search_web

                    query = tool_call.get("query", "")
                    max_results = tool_call.get("max_results", 10)

                    print("🔍 Backend executing websearch:", query)

                    tool_result = await search_web(
                        {"query": query, "max_results": max_results},
                    )
                except Exception as e:
                    print("❌ Websearch tool failed:", e)
                    tool_result = {"error": str(e)}

            # -----------------------------------
            # YOUTUBE SEARCH TOOL
            # -----------------------------------
            elif tool == "youtube_search":
                try:
                    from routes.agent_actions import youtube_search_action

                    query = tool_call.get("query", "")
                    max_results = tool_call.get("max_results", 5)

                    print("📺 Backend executing YouTube search:", query)

                    tool_result = await youtube_search_action(
                        {"query": query, "max_results": max_results},
                    )
                except Exception as e:
                    print("❌ YouTube search tool failed:", e)
                    tool_result = {"error": str(e)}

            # ---------------------------------------------
            # SECOND-PASS → Provide tool_result to Gemini
            # ---------------------------------------------
            if tool_result is not None:
                print("🔄 Sending tool result back to Gemini...")

                second_pass = await run_gemini_agent(
                    message=json.dumps({
                        "tool": tool,
                        "tool_result": tool_result,
                    }),
                    agent=agent,
                    model_name=model_name,
                    mid_summary=mid_summary,
                    long_term_memory=ltm_string,
                    conversation=recent_context,
                    ocr=ocr_metadata,
                    vision=vision_metadata,
                )

                agent_reply = second_pass

        # ───────────────────────────────
        # Generate Short-Term Summary (STM)
        # ───────────────────────────────
        short_summary = await generate_short_summary(agent_reply)
        print("🧠 Short summary generated:", short_summary)

        # ───────────────────────────────
        # Rolling Mid-Term Memory Writing
        # ───────────────────────────────
        try:
            old_summary = None

            supabase = get_supabase()

            res = (
                supabase.table("threads")
                .select("summary, metadata")
                .eq("thread_id", thread_id)
                .limit(1)
                .execute()
            )

            row = (res.data or [None])[0]

            if row:
                summary = row.get("summary")
                metadata = row.get("metadata") or {}

                meta_summary = (
                    metadata.get("memory", {}).get("mid_summary")
                    if isinstance(metadata, dict)
                    else None
                )

                old_summary = meta_summary or summary

        except Exception as e:
            print("⚠️ Failed to load existing MTM:", e)
            old_summary = None

            # Prepare MTM generation prompt
            mtm_prompt = f"""
Summarize the conversation so far into a concise mid-term memory summary.
Keep it to 1–3 sentences. Capture only the key user goals, facts, or decisions.

Previous summary:
{old_summary or ''}

Latest update:
{short_summary or ''}
""".strip()

            # Use Gemini to create rolling MTM
            new_mtm = ""
            try:
                from services.gemini import _get_model
                import google.generativeai as genai
                import asyncio

                model = _get_model("gemini-2.0-flash-exp")
                loop = asyncio.get_event_loop()
                mtm_result = await loop.run_in_executor(
                    None,
                    lambda: model.generate_content(
                        mtm_prompt,
                        generation_config=genai.types.GenerationConfig(
                            max_output_tokens=120,
                            temperature=0.3,
                        ),
                    ),
                )
                new_mtm = (getattr(mtm_result, "text", "") or "").strip()
                print("🧠 New MTM generated:", new_mtm)

            except Exception as e:
                print("⚠️ MTM generation failed:", e)
                new_mtm = old_summary or short_summary or ""

            # Save MTM back into threads table
            try:
                supabase.table("threads").update(
                    {
                        "summary": new_mtm,
                        "metadata": {
                            "memory": {
                                "mid_summary": new_mtm,
                            }
                        },
                    }
                ).eq("thread_id", thread_id).execute()
                print("🧠 MTM saved successfully.")
            except Exception as e:
                print("⚠️ Failed to save MTM:", e)

        except Exception as e:
            print("⚠️ MTM block failure:", e)

        # ───────────────────────────────
        # Save Long-Term Memory (summary)
        # ───────────────────────────────
        try:
            if user_id and short_summary:
                supabase.table("long_term_memory").insert(
                    {
                        "user_id": user_id,
                        "thread_id": thread_id,
                        "memory_type": "summary",
                        "content": short_summary,
                        "importance": 0.2,
                        "source": "assistant",
                    }
                ).execute()
                print("🧠 LTM saved successfully.")
            else:
                print("ℹ️ LTM skip: missing user_id or summary.")
        except Exception as e:
            print("⚠️ Failed to save LTM:", e)

        # ───────────────────────────────
        # Merge Vision Output (User-facing)
        # ───────────────────────────────
        if vision_results:
            vision_block = ""
            for v in vision_results:
                vision_block += (
                    f"🖼️ **Image {v['index']} – {v['name']}**\n"
                    f"{v['description']}\n\n"
                )
            agent_reply = vision_block + agent_reply

        # ───────────────────────────────
        # Save Messages
        # ───────────────────────────────
        try:
            cleaned_attachments = clean_attachments(attachments)

            metadata_user = {
                "ocr": ocr_metadata,
                "vision": vision_metadata,
            }

            metadata_assistant = {
                "vision": vision_metadata,
                "summary": short_summary or "",
            }
            supabase = get_supabase()
            supabase.table("messages").insert(
                [
                    {
                        "thread_id": thread_id,
                        "role": "user",
                        "content": message,
                        "attachments": cleaned_attachments,
                        "metadata": metadata_user,
                    },
                    {
                        "thread_id": thread_id,
                        "role": "assistant",
                        "content": agent_reply,
                        "attachments": [],
                        "metadata": metadata_assistant,
                    },
                ]
            ).execute()

            short_title = message[:40] + ("…" if len(message) > 40 else "")

            supabase.table("threads").update(
                {
                    "title": short_title,
                    "updated_at": "now()",
                }
            ).eq("thread_id", thread_id).execute()

            print(f"🧾 Auto-titled thread → {short_title}")

        except Exception as e:
            print("⚠️ DB insert/update failed:", e)

        return JSONResponse(
            {"status": "success", "data": {"assistant_reply": agent_reply}}
        )

    except Exception as e:
        print("❌ start_agent_run failed:", e)
        traceback.print_exc()
        return JSONResponse(
            {"status": "error", "message": str(e)},
            status_code=500,
        )

def clean_attachments(attachments):
    """
    Remove base64 data from attachments before saving to DB.
    Keeps only name, type, and url fields.
    """
    cleaned = []
    for att in attachments or []:
        cleaned.append({
            "name": att.get("name"),
            "type": att.get("type"),
            "url": att.get("url"),
        })
    return cleaned
