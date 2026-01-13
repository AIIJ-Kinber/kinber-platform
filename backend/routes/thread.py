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
from backend.db.supabase_client import get_supabase

# --------------------------------------------------
# OpenAI services
# --------------------------------------------------
from backend.services.openai_agent import run_openai_agent, analyze_image_with_openai

# --------------------------------------------------
# Attachment text extraction (SAFE PLACEHOLDER)
# --------------------------------------------------
import pdfplumber
from io import BytesIO
from typing import Any

def extract_attachment_text(source: Any) -> str:
    """
    Extract text from PDF files with better Arabic support.
    Uses pdfplumber which handles RTL languages better than PyPDF2.
    
    Args:
        source: BytesIO object containing PDF bytes
    
    Returns:
        Extracted text as string
    """
    try:
        if isinstance(source, BytesIO):
            # Reset stream position
            source.seek(0)
            
            text_parts = []
            
            # Use pdfplumber for better text extraction
            with pdfplumber.open(source) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    try:
                        # Extract text with layout preserved
                        page_text = page.extract_text(
                            layout=True,  # Preserve layout
                            x_tolerance=3,
                            y_tolerance=3
                        )
                        
                        if page_text and page_text.strip():
                            text_parts.append(f"--- صفحة {page_num + 1} / Page {page_num + 1} ---\n{page_text}")
                            
                    except Exception as e:
                        print(f"⚠️ Failed to extract page {page_num + 1}: {e}")
                        continue
            
            extracted = "\n\n".join(text_parts)
            
            if extracted.strip():
                print(f"✅ Successfully extracted {len(extracted)} characters from PDF")
                print(f"📝 First 200 chars: {extracted[:200]}...")
                return extracted
            else:
                print("⚠️ PDF appears to be empty or contains only images")
                return ""
        
        else:
            print(f"⚠️ Unsupported source type: {type(source)}")
            return ""
    
    except Exception as e:
        print(f"❌ PDF extraction error: {e}")
        import traceback
        traceback.print_exc()
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
@router.post("/")
async def create_thread(body: ThreadCreate):
    try:
        print(f"🧵 Creating new thread → title={body.title}, user_id={body.user_id}")

        supabase = get_supabase()

        thread_id = str(uuid.uuid4())

        now = datetime.utcnow().isoformat()

        insert_data = {
            "thread_id": thread_id,
            "title": body.title or "New Conversation",
            "created_at": now,
            "updated_at": now,
        }

        # Map incoming user_id → threads.account_id (your DB column)
        if body.user_id:
            try:
                uuid.UUID(body.user_id)
                insert_data["account_id"] = body.user_id
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
async def start_agent_run(thread_id: str, request: Request):
    try:
        body = await request.json()

        message = (body.get("message") or "").strip()
        model_name = body.get("model_name", "gemini-2.0-flash-exp")
        agent = body.get("agent", "default")
        attachments = body.get("attachments", []) or []

        print(f"\n🚀 Agent Start → thread={thread_id}")
        print(f"💬 User message: {message}")
        print(f"📎 Attachments received: {len(attachments)}")

        supabase = get_supabase()
        now = datetime.utcnow().isoformat()

        # ── Save user message ──────────────────────
        supabase.table("messages").insert(
            {
                "thread_id": thread_id,
                "role": "user",
                "content": message,
                "created_at": now,
            }
        ).execute()

        # 🔄 Touch thread updated_at
        supabase.table("threads").update(
            {"updated_at": now}
        ).eq("thread_id", thread_id).execute()

        # 🧠 Initialize memory variables (REQUIRED)
        recent_context = ""
        mid_summary = None
        ltm_string = ""

        # MEMORY LOADING FIX FOR THREAD.PY
# ==================================

# LOCATION: After line 208 (after ltm_string = "")
# BEFORE: The explicit memory save section (line 210)

# INSERT THIS CODE BLOCK:
# ------------------------

        # ──────────────────────────────────────────
        # 🧠 LOAD SHORT-TERM MEMORY (STM)
        # ──────────────────────────────────────────
        try:
            print("🧠 Loading SHORT-TERM memory...")
            history_res = (
                supabase.table("messages")
                .select("role, content, created_at")
                .eq("thread_id", thread_id)
                .order("created_at", desc=False)
                .limit(16)  # Last 8 messages
                .execute()
            )
            
            history = history_res.data or []
            if history:
                stm_lines = []
                for msg in history[-16:]:
                    role = msg.get("role", "user")
                    content = (msg.get("content") or "").strip()
                    if content:
                        stm_lines.append(f"{role}: {content}")
                
                recent_context = "\n".join(stm_lines)
                print(f"✅ Loaded {len(stm_lines)} messages into STM")
        except Exception as e:
            print(f"⚠️ Failed to load STM: {e}")

        # ──────────────────────────────────────────
        # 🧠 LOAD MID-TERM MEMORY (MTM)
        # ──────────────────────────────────────────
        try:
            print("🧠 Loading MID-TERM memory...")
            thread_res = (
                supabase.table("threads")
                .select("summary, metadata")
                .eq("thread_id", thread_id)
                .limit(1)
                .execute()
            )
            
            if thread_res.data:
                thread_data = thread_res.data[0]
                
                # Try metadata first, then summary
                metadata = thread_data.get("metadata") or {}
                if isinstance(metadata, dict):
                    mid_summary = metadata.get("memory", {}).get("mid_summary")
                
                # Fallback to summary field
                if not mid_summary:
                    mid_summary = thread_data.get("summary")
                
                if mid_summary:
                    print(f"✅ Loaded MTM: {mid_summary[:50]}...")
                else:
                    print("ℹ️ No MTM found for this thread")
        except Exception as e:
            print(f"⚠️ Failed to load MTM: {e}")

        # ──────────────────────────────────────────
        # 🧠 LOAD LONG-TERM MEMORY (LTM)
        # ──────────────────────────────────────────
        try:
            print("🧠 Loading LONG-TERM memory...")
            
            # Try to get user_id from thread
            user_id = None
            thread_info = (
                supabase.table("threads")
                .select("account_id")
                .eq("thread_id", thread_id)
                .limit(1)
                .execute()
            )
            
            if thread_info.data:
                user_id = thread_info.data[0].get("account_id")
            
            if user_id:
                # Fetch LTM for this user
                ltm_res = (
                    supabase.table("long_term_memory")
                    .select("content, memory_type, importance")
                    .eq("thread_id", thread_id)
                    .order("importance", desc=True)
                    .order("created_at", desc=False)
                    .limit(10)
                    .execute()
                )
                
                ltm_items = ltm_res.data or []
                if ltm_items:
                    ltm_lines = ["Long-term facts:"]
                    for item in ltm_items:
                        content = item.get("content", "").strip()
                        if content:
                            ltm_lines.append(f"- {content}")
                    
                    ltm_string = "\n".join(ltm_lines)
                    print(f"✅ Loaded {len(ltm_items)} LTM facts")
                else:
                    print("ℹ️ No LTM found for this user")
            else:
                print("ℹ️ No user_id found, skipping LTM")
        except Exception as e:
            print(f"⚠️ Failed to load LTM: {e}")

        # ──────────────────────────────────────────
        # 📄 Check if question is about a document
        # ──────────────────────────────────────────
        document_keywords = ["document", "pdf", "file", "agreement", "contract", "وثيقة", "ملف", "عقد"]
        if any(keyword in message.lower() for keyword in document_keywords):
            try:
                print("📄 Document-related query detected, loading document memories...")
                
                doc_ltm_res = (
                    supabase.table("long_term_memory")
                    .select("content")
                    .eq("thread_id", thread_id)
                    .eq("memory_type", "document")
                    .order("created_at", desc=False)
                    .limit(3)  # Last 3 documents
                    .execute()
                )
                
                if doc_ltm_res.data:
                    doc_memories = [item.get("content", "") for item in doc_ltm_res.data]
                    
                    # Add to LTM string
                    if ltm_string:
                        ltm_string += "\n\nRecent Documents:\n"
                    else:
                        ltm_string = "Recent Documents:\n"
                    
                    for doc in doc_memories:
                        ltm_string += f"\n{doc}\n"
                    
                    print(f"✅ Added {len(doc_memories)} document memories to context")
                    
            except Exception as e:
                print(f"⚠️ Failed to load document memories: {e}")

# HOW TO APPLY:
# -------------
# 1. Open thread.py
# 2. Find line 208: ltm_string = ""
# 3. Add a blank line after it
# 4. Paste the entire code block above
# 5. Keep the existing "EXPLICIT MEMORY SAVE" section after this

# BEFORE:
# -------
#         ltm_string = ""
#
#         # ──────────────────────────────────────────
#         # 🧠 EXPLICIT MEMORY SAVE ("remember this")

# AFTER:
# ------
#         ltm_string = ""
#
#         # [PASTE THE MEMORY LOADING CODE HERE]
#
#         # ──────────────────────────────────────────
#         # 🧠 EXPLICIT MEMORY SAVE ("remember this")

        # ──────────────────────────────────────────
        # 🧠 EXPLICIT MEMORY SAVE ("remember this")
        # ──────────────────────────────────────────
        memory_triggers = [
            "remember this",
            "please remember",
            "save this",
            "add to memory",
        ]

        lower_msg = message.lower()

        if any(trigger in lower_msg for trigger in memory_triggers):
            try:
                memory_text = message
                for t in memory_triggers:
                    memory_text = memory_text.replace(t, "", 1)
                    memory_text = memory_text.replace(t.capitalize(), "", 1)

                memory_text = memory_text.strip(" .:\n")

                if memory_text:
                    supabase.table("long_term_memory").insert({
                        "thread_id": thread_id,
                        "memory_type": "explicit_user_memory",
                        "content": memory_text,
                        "importance": 9,
                        "created_at": now,
                    }).execute()

                    print("🧠 Saved explicit long-term memory:", memory_text)

            except Exception as e:
                print("⚠️ Failed to save memory:", e)


        # ──────────────────────────────────────────
        # ✅ PROCESS ATTACHMENTS (OCR + VISION)
        # ──────────────────────────────────────────
        ocr_metadata = []
        vision_metadata = []

        # Process attachments if present
        if attachments:
            print(f"🔍 Processing {len(attachments)} attachments...")

            for idx, file in enumerate(attachments):
                mime = file.get("type", "") or ""
                base64_data = file.get("base64")
                file_name = file.get("name", f"file_{idx}")

                # -------------------------
                # Handle PDFs with OCR
                # -------------------------
                if mime == "application/pdf" and base64_data:
                    print(f"📄 OCR processing PDF: {file_name}")
                    try:
                        # Extract base64 content
                        if base64_data.startswith("data:"):
                            base64_content = base64_data.split(",", 1)[1]
                        else:
                            base64_content = base64_data

                        pdf_bytes = base64.b64decode(base64_content)
                        extracted_text = extract_attachment_text(BytesIO(pdf_bytes))

                        if extracted_text:
                            ocr_metadata.append({
                                "name": file_name,
                                "text": extracted_text,
                            })
                            print(f"✅ OCR extracted {len(extracted_text)} chars from {file_name}")
                            # ──────────────────────────────────────────
                            # 💾 Save PDF content to Long-Term Memory
                            # ──────────────────────────────────────────
                            try:
                                # Create a summary of the PDF for LTM
                                pdf_summary = f"Document: {file_name}\n"
                                pdf_summary += f"Type: PDF\n"
                                pdf_summary += f"Size: {len(extracted_text)} characters\n"
                                
                                # Save first 2000 chars as preview
                                preview = extracted_text[:2000]
                                if len(extracted_text) > 2000:
                                    preview += f"\n\n[... {len(extracted_text) - 2000} more characters ...]"
                                
                                pdf_summary += f"Content Preview:\n{preview}"
                                
                                # Save to LTM
                                supabase.table("long_term_memory").insert({
                                    "thread_id": thread_id,
                                    "memory_type": "document",
                                    "content": pdf_summary,
                                    "importance": 8,  # High importance
                                    "created_at": now,
                                }).execute()
                                
                                print(f"💾 Saved PDF content to Long-Term Memory: {file_name}")
                                
                            except Exception as e:
                                print(f"⚠️ Failed to save PDF to LTM: {e}")

                    except Exception as e:
                        print(f"❌ OCR failed for {file_name}: {e}")

                # ──────────────────────────────────────────
                # ✅ Handle images with OpenAI Vision
                # ──────────────────────────────────────────
                elif mime.startswith("image") and base64_data:
                    print(f"📸 Vision analyzing image: {file_name}")
                    try:
                        # Ensure proper base64 format
                        if base64_data.startswith("data:"):
                            base64_content = base64_data  # Keep data URI for OpenAI
                        else:
                            # Add data URI prefix if missing
                            base64_content = f"data:{mime};base64,{base64_data}"
                        
                        # Actually analyze the image using OpenAI Vision
                        description = await analyze_image_with_openai(
                            base64_content,
                            mime_type=mime,
                            prompt="Describe this image in detail. What do you see? Include any text, objects, people, colors, and overall context."
                        )
                        
                        vision_metadata.append({
                            "name": file_name,
                            "description": description,
                        })
                        print(f"✅ Vision analyzed {file_name}")
                        print(f"📝 Description preview: {description[:100]}...")
                        
                    except Exception as e:
                        print(f"❌ Vision failed for {file_name}: {e}")
                        # Fallback to basic metadata
                        vision_metadata.append({
                            "name": file_name,
                            "description": f"Image file: {file_name}",
                        })
        
        # ──────────────────────────────────────────
        # 📄 Inject OCR text into prompt (OpenAI)
        # ──────────────────────────────────────────
        if ocr_metadata:
            print(f"📄 Injecting OCR text into prompt ({len(ocr_metadata)} docs)")
            blocks = []
            for doc in ocr_metadata:
                blocks.append(
                    f"OCR_EXTRACT — {doc['name']}:\n{doc.get('text', '')}"
                )
            message += "\n\n" + "\n\n".join(blocks)

        # Force OpenAI model if anything legacy is sent
        if model_name.startswith("gemini"):
            model_name = "gpt-4o-mini"

        # ──────────────────────────────────────────
        # 🤖 RUN OPENAI AGENT (WITH MEMORY + FILES)
        # ──────────────────────────────────────────
        print(f"🤖 Running OpenAI agent: model={model_name}")
        print(
            f"🧠 MEMORY: "
            f"STM={'yes' if recent_context else 'no'}, "
            f"MTM={'yes' if mid_summary else 'no'}, "
            f"LTM={'yes' if ltm_string else 'no'}, "
            f"OCR={len(ocr_metadata)}, "
            f"Vision={len(vision_metadata)}"
        )

        raw_result = await run_openai_agent(
            message,
            ocr=ocr_metadata,
            vision=vision_metadata,
            conversation=recent_context,
            mid_summary=mid_summary,
            long_term_memory=ltm_string,
            model_name=model_name,
            agent=agent,
        )

        # ──────────────────────────────────────────
        # ✅ NORMALIZE RESPONSE
        # ──────────────────────────────────────────
        agent_reply = None

        if isinstance(raw_result, str):
            agent_reply = raw_result.strip()
        elif isinstance(raw_result, dict):
            agent_reply = (
                raw_result.get("assistant_reply")
                or raw_result.get("text")
                or raw_result.get("output")
            )
        else:
            agent_reply = getattr(raw_result, "text", None)

        if not agent_reply or not isinstance(agent_reply, str):
            agent_reply = "I’m sorry — I couldn’t generate a response this time."

        # ──────────────────────────────────────────
        # ✅ SAVE ASSISTANT MESSAGE
        # ──────────────────────────────────────────
        supabase.table("messages").insert(
            {
                "thread_id": thread_id,
                "role": "assistant",
                "content": agent_reply,
                "created_at": datetime.utcnow().isoformat(),
            }
        ).execute()

        # ──────────────────────────────────────────
        # ✅ AUTO-TITLE THREAD
        # ──────────────────────────────────────────
        short_title = (message or "Conversation")[:40]
        if len(message) > 40:
            short_title += "…"

        supabase.table("threads").update(
            {
                "title": short_title,
                "updated_at": datetime.utcnow().isoformat(),
            }
        ).eq("thread_id", thread_id).execute()

        print(f"🧾 Auto-titled thread → {short_title}")

        # ──────────────────────────────────────────
        # ✅ FINAL RESPONSE (FRONTEND SAFE)
        # ──────────────────────────────────────────
        return JSONResponse(
            {
                "status": "success",
                "assistant_reply": agent_reply,
                "data": {
                    "assistant_reply": agent_reply
                },
            }
        )

    except Exception as e:
        print("❌ agent/start error:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


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

            # Use memory report as assistant reply
            agent_reply = reply_text

            # Optional: attach memory report for later use
            extra_payload = {
                "memory_report": {
                    "stm": stm_list,
                    "mtm": mtm_value,
                    "ltm": ltm_list,
                }
            }

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
        # OCR Extraction (PDF / DOCX / TXT)
        # Priority: BASE64 → URL fallback
        # ───────────────────────────────
        ocr_metadata: List[Dict[str, Any]] = []

        for file in attachments:
            file_name = (file.get("name") or "").lower()
            base64_data = file.get("base64")
            url = file.get("url")

            # -----------------------------
            # 1️⃣ PDF via BASE64 (PRIMARY)
            # -----------------------------
            if base64_data and file_name.endswith(".pdf"):
                print(f"📄 OCR base64 PDF detected: {file_name}")

                try:
                    # Clean base64 prefix if present
                    b64 = base64_data.split(",")[-1].strip()
                    pdf_bytes = base64.b64decode(b64)

                    text = ""

                    try:
                        from pypdf import PdfReader

                        reader = PdfReader(BytesIO(pdf_bytes))
                        extracted_pages = []

                        for i, page in enumerate(reader.pages):
                            page_text = page.extract_text() or ""
                            if page_text.strip():
                                extracted_pages.append(page_text)

                        text = "\n\n".join(extracted_pages)

                    except Exception as e:
                        print(f"⚠️ pypdf parsing failed for {file_name}: {e}")

                    if text and text.strip():
                        ocr_metadata.append({
                            "name": file.get("name"),
                            "text": text[:4000],  # safety cap
                        })
                        print(f"✅ OCR extracted from PDF ({len(text)} chars)")
                        continue
                    else:
                        print("⚠️ PDF OCR completed but no readable text found")

                except Exception as e:
                    print(f"❌ PDF base64 OCR fatal error for {file_name}: {e}")
            # ---------------------------------
            # 2️⃣ Generic BASE64 (non-PDF)
            # ---------------------------------
            if base64_data and not file_name.endswith(".pdf"):
                print(f"📄 OCR generic base64 file: {file_name}")
                try:
                    b64 = base64_data.split(",")[-1]
                    raw_bytes = base64.b64decode(b64)
                    text = extract_attachment_text(BytesIO(raw_bytes)) or ""

                    if text.strip():
                        ocr_metadata.append({
                            "name": file.get("name"),
                            "text": text[:4000],
                        })
                        print(f"✅ OCR extracted ({len(text)} chars)")
                        continue
                    else:
                        # ⚠️ File exists but no extractable text
                        ocr_metadata.append({
                            "name": file.get("name"),
                            "text": "[File detected but text could not be extracted automatically.]",
                        })
                        print("⚠️ Generic OCR empty output — placeholder injected")
                        continue

                except Exception as e:
                    print(f"❌ Generic base64 OCR error: {e}")
                    ocr_metadata.append({
                        "name": file.get("name"),
                        "text": "[File detected but OCR processing failed due to an internal error.]",
                    })
                    continue

            # -----------------------------
            # 3️⃣ URL fallback (last resort)
            # -----------------------------
            if url and not base64_data:
                print(f"🌐 OCR URL fallback: {file_name}")
                try:
                    text = extract_attachment_text(url) or ""
                    if text.strip():
                        ocr_metadata.append({
                            "name": file.get("name"),
                            "text": text[:4000],
                        })
                        print(f"✅ OCR extracted from URL ({len(text)} chars)")
                    else:
                        ocr_metadata.append({
                            "name": file.get("name"),
                            "text": "[File detected via URL but text could not be extracted.]",
                        })
                        print("⚠️ URL OCR empty output — placeholder injected")
                except Exception as e:
                    print(f"❌ OCR URL error: {e}")
                    ocr_metadata.append({
                        "name": file.get("name"),
                        "text": "[File detected via URL but OCR failed due to an internal error.]",
                    })


        # ───────────────────────────────
        # DEBUG: OCR SUMMARY (CRITICAL)
        # ───────────────────────────────
        print("📄 OCR_METADATA summary:", [
            {
                "name": d.get("name"),
                "text_len": len(d.get("text", "")),
            }
            for d in ocr_metadata
        ])

        # ───────────────────────────────
        # Store OCR text in thread metadata
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
        # Inject OCR text into user message
        # (Prevents Gemini asking for PDF again)
        # ───────────────────────────────
        if ocr_metadata:
            print(f"📄 Injecting OCR text into prompt ({len(ocr_metadata)} docs)")
            blocks = []
            for doc in ocr_metadata:
                blocks.append(
                    f"OCR_EXTRACT — {doc['name']}:\n{doc.get('text', '')}"
                )

            message += "\n\n" + "\n\n".join(blocks)

        # ───────────────────────────────
        # Vision Analysis (Images) — OpenAI-compatible
        # ───────────────────────────────
        vision_results = []
        vision_metadata = []

        for idx, file in enumerate(attachments):
            mime = file.get("type", "") or ""
            base64_data = file.get("base64")

            if mime.startswith("image") and base64_data:
                print(f"📸 Image received {idx+1}: {file.get('name')}")

                # 🔍 Image metadata prepared for OpenAI (no Gemini)
                description = (
                    f"Image uploaded: {file.get('name')}. "
                    f"MIME type: {mime}. "
                    f"User may be asking about the contents of this image."
                )

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

        raw_result = await run_gemini_agent(
            message,
            ocr=ocr_metadata,
            vision=vision_metadata,
            conversation=recent_context,
            mid_summary=mid_summary,
            long_term_memory=ltm_string,
            model_name=model_name,
            agent=agent,
        )

        # ───────────────────────────────
        # ✅ NORMALIZE GEMINI OUTPUT (CRITICAL)
        # ───────────────────────────────
        agent_reply = None

        if isinstance(raw_result, str):
            agent_reply = raw_result.strip()

        elif isinstance(raw_result, dict):
            agent_reply = (
                raw_result.get("assistant_reply")
                or raw_result.get("text")
                or raw_result.get("output")
            )

        else:
            # Gemini SDK object fallback
            agent_reply = getattr(raw_result, "text", None)

        print("🧠 Gemini raw result type:", type(raw_result))
        print("🧠 Gemini reply extracted:", repr(agent_reply))

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
                print("🧪 FINAL OCR METADATA COUNT:", len(ocr_metadata))

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

                if isinstance(second_pass, str):
                    agent_reply = second_pass.strip()
                elif isinstance(second_pass, dict):
                    agent_reply = second_pass.get("assistant_reply") or second_pass.get("text")
                else:
                    agent_reply = getattr(second_pass, "text", None)

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
                from backend.services.gemini import _get_model
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
        # ───────────────────────────────
        # ✅ FINAL SAFETY: Ensure agent_reply ALWAYS exists
        # ───────────────────────────────
        if not agent_reply or not isinstance(agent_reply, str):
            agent_reply = "I’m sorry — I couldn’t generate a response this time."

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
                        "created_at": datetime.utcnow().isoformat(),
                    },
                    {
                        "thread_id": thread_id,
                        "role": "assistant",
                        "content": agent_reply,
                        "attachments": [],
                        "metadata": metadata_assistant,
                        "created_at": datetime.utcnow().isoformat(),
                    },
                ]
            ).execute()

            short_title = (message or "Conversation")[:40]
            if message and len(message) > 40:
                short_title += "…"

            supabase.table("threads").update(
                {
                    "title": short_title,
                    "updated_at": datetime.utcnow().isoformat(),
                }
            ).eq("thread_id", thread_id).execute()

            print(f"🧾 Auto-titled thread → {short_title}")

        except Exception as e:
            print("⚠️ DB insert/update failed:", e)

        # ───────────────────────────────
        # ✅ SINGLE FINAL RETURN (FRONTEND SAFE)
        # ───────────────────────────────
        return JSONResponse(
            {
                "status": "success",
                "data": {
                    "assistant_reply": agent_reply
                },
            }
        )

    except Exception as e:
        print("❌ start_agent_run failed:", e)
        traceback.print_exc()
        return JSONResponse(
            {
                "status": "error",
                "message": "Agent execution failed.",
                "details": str(e),
            },
            status_code=500,
        )