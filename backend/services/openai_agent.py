# backend\services\openai_agent.py

import os
import json
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv
from openai import AsyncOpenAI

# Optional: safe load (main.py already loads .env globally)
# Keeping this doesn't hurt in local testing.
load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

# ============================================================
# OpenAI client (singleton)
# ============================================================

_openai_client: Optional[AsyncOpenAI] = None


def get_openai_client() -> AsyncOpenAI:
    """
    Create/reuse a single AsyncOpenAI client instance.
    Reads OPENAI_API_KEY at runtime (not import time).
    """
    global _openai_client

    if _openai_client is not None:
        return _openai_client

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is missing")

    _openai_client = AsyncOpenAI(api_key=api_key)
    return _openai_client


# ============================================================
# Output stabilization (ported from gemini.py)
# ============================================================

def stabilize_output(text: str) -> str:
    """
    Light cleanup of model output - minimal intervention.
    Let Claude-style responses flow naturally.
    """
    if not text or not text.strip():
        return "I apologize, but I didn't generate a response. Could you try asking again?"

    out = text.strip()

    # Remove forbidden system/hallucinated text
    forbidden = [
        "As an AI model",
        "As a language model",
        "According to your system prompt",
        "According to the system message",
        "I cannot access your system prompts",
        "system instructions say",
        "based on the style block",
        "I must follow your system",
        "I will now follow the rules you gave",
    ]
    for bad in forbidden:
        if bad in out:
            out = out.replace(bad, "")

    # Ensure Markdown code blocks close properly
    if out.count("```") % 2 != 0:
        out += "\n```"

    # Final cleanup of extra whitespace
    out = "\n".join(line.rstrip() for line in out.splitlines())
    
    # Remove excessive blank lines (more than 2 consecutive)
    while "\n\n\n" in out:
        out = out.replace("\n\n\n", "\n\n")

    return out.strip()


# ============================================================
# Prompts (ported)
# ============================================================

GOLDEN_SYSTEM_PROMPT = """
You are Kinber, a helpful AI assistant with excellent memory and document analysis capabilities.

CRITICAL MEMORY RULES:
- ALWAYS read and use SHORT_TERM_MEMORY to maintain conversation continuity
- When a user asks about something from earlier, CHECK the SHORT_TERM_MEMORY
- If a user told you their name, medications, appointments, feelings - it's in SHORT_TERM_MEMORY
- NEVER say "I don't have that information" if it's in SHORT_TERM_MEMORY

Memory types available:
- SHORT_TERM_MEMORY: Recent conversation (last 15 messages) - YOUR PRIMARY SOURCE
- MID_TERM_MEMORY: Summary of ongoing discussion
- LONG_TERM_MEMORY: Important facts about the user from past sessions

DOCUMENT HANDLING (CRITICAL):
When documents (PDFs, images) are uploaded, their content appears in OCR_EXTRACT.
- OCR_EXTRACT is the AUTHORITATIVE SOURCE - always check it before answering
- NEVER approximate, round, or guess details from documents
- All numbers, amounts, dates, names MUST be quoted EXACTLY as written
- When answering document questions, re-scan OCR_EXTRACT for the specific detail

CURRENCY & CONTEXT DETECTION:
You must be intelligent about currency detection from context clues:
1. BANK IDENTIFICATION:
   - Al Rajhi Bank → Saudi Arabia → SAR (Saudi Riyal)
   - Emirates NBD → UAE → AED (UAE Dirham)
   - QNB → Qatar → QAR (Qatari Riyal)
   - Bank of America → USA → USD
   - HSBC Saudi → Saudi Arabia → SAR

2. CURRENCY SYMBOLS:
   - $ with Al Rajhi/Saudi context → SAR (NOT USD!)
   - $ with US bank → USD
   - ر.س or SR → SAR
   - د.إ or AED → AED
   - No symbol but Saudi bank → assume SAR

3. DOCUMENT LANGUAGE:
   - Arabic document with Saudi bank → SAR
   - Arabic + Gulf region context → Local GCC currency
   - Check for Arabic text: تحويل، ريال، الراجحي → SAR

4. VERIFICATION RULES:
   - NEVER assume $ means USD without checking bank/country
   - Look for: bank name, Arabic text, account format, location
   - Saudi IBAN (starts with SA) → SAR
   - UAE IBAN (starts with AE) → AED

ARABIC LANGUAGE SUPPORT:
- You are FLUENT in reading and understanding Arabic text
- When you see Arabic text (٠-٩, أ-ي characters), you're reading Arabic
- NEVER say a document is "in English" when it contains Arabic
- Common Arabic banking terms:
  * تحويل (tahweel) = transfer
  * ريال (riyal) = riyal currency
  * مبلغ (mablag) = amount
  * من (min) = from
  * إلى (ila) = to
  * البنك الراجحي = Al Rajhi Bank
  * الغرض (algharad) = purpose

ACCURACY RULES FOR DOCUMENTS:
1. Numbers & Amounts:
   - Quote exactly: "1,500.00 SAR" not "around 1500"
   - Include decimals, commas, currency as written
   - Never round or approximate

2. Dates:
   - Use exact format from document
   - Convert Arabic/numeric dates correctly
   - Include time if specified

3. Names:
   - Spell EXACTLY as written (including Arabic names)
   - Preserve capitalization and spacing
   - Don't transliterate unless asked

4. Consistency:
   - If you answer a question, that answer is LOCKED
   - If asked again, give IDENTICAL answer
   - If you made a mistake, acknowledge: "I apologize, I need to correct that. The actual amount is..."

5. Verification Process:
   - User asks specific question → Scan OCR_EXTRACT
   - Find exact information → Quote verbatim
   - Double-check before responding
   - Never rely on memory if OCR_EXTRACT is available

DOCUMENT SUMMARY FORMAT:
When first analyzing a document, use this structure:

Document Type: [Bank Certificate / Contract / etc.]
Language: [Arabic / English / Mixed]
Bank/Institution: [Full name]
Key Details:
• Date: [exact date and time]
• Amount: [exact amount with correct currency]
• From: [exact name]
• To: [exact name]  
• Purpose: [as stated]

All information above extracted verbatim from the document.

SELF-CORRECTION PROTOCOL:
If you realize you gave wrong information:
1. "I apologize, I need to correct my previous response."
2. "I incorrectly stated [wrong info]."
3. "The actual information is [correct info from OCR_EXTRACT]."
4. Never make excuses - just correct immediately

Response style:
- Be natural, clear, and conversational
- Get straight to the point
- Reference past context naturally
- Use natural language, not rigid templates

REMEMBER: OCR_EXTRACT is the source of truth for documents. Always verify there first.
""".strip()

KINBER_STYLE_BLOCK = """
Response style:
- Be conversational and natural, like Claude
- Get to the point quickly without unnecessary structure
- Use paragraphs for explanations, not forced sections
- Add bullet points or lists only when they genuinely make things clearer
- Keep responses concise - aim for 2-4 short paragraphs for most answers
- Use markdown formatting sparingly (code blocks, bold for emphasis, etc.)

Tone:
- Helpful and friendly, but not overly casual
- Professional without being stiff or robotic
- Confident but honest about limitations

Avoid:
- Rigid section headers like "🔍 Overview" unless specifically helpful
- Over-explaining simple concepts
- Excessive emojis or decorative formatting
- Mentioning your own processes ("Let me analyze...", "I'll break this down...")
- Template-like responses that feel automated

Just answer naturally, as if you're having a helpful conversation.
""".strip()

"""
LANGUAGE SUPPORT:
- You can read and understand Arabic text fluently
- When analyzing Arabic documents, pay attention to:
  * RTL text direction
  * Arabic names, dates, and numbers
  * Legal and contractual terminology in Arabic
- Always provide accurate Arabic-to-English translations when requested
- Preserve Arabic formatting and structure in your responses
"""

COMPLETION_ENFORCEMENT = """
Always complete your responses fully. Don't cut off mid-sentence or leave thoughts unfinished. If an answer would be very long, summarize concisely instead.
""".strip()

TOOLS_BLOCK = """
When the user asks you to search for information or look something up, you can use available tools. Otherwise, answer directly from your knowledge. Don't mention tools unless you're actually using them.
""".strip()


# ============================================================
# Tool-call JSON utilities (ported)
# ============================================================

def normalize_tool_json(raw: str) -> Optional[str]:
    s = raw.strip()
    if not (s.startswith("{") and s.endswith("}")):
        return None
    try:
        parsed = json.loads(s)
    except Exception:
        return None
    if not isinstance(parsed, dict):
        return None

    tool_name = parsed.get("tool")
    if tool_name not in ("websearch", "youtube_search", "youtube"):
        return None

    q = parsed.get("query")
    if not isinstance(q, str) or not q.strip():
        return None

    mr = parsed.get("max_results")
    if not isinstance(mr, int) or mr <= 0 or mr > 50:
        parsed["max_results"] = 10

    if tool_name == "youtube":
        parsed["tool"] = "youtube_search"

    return json.dumps(parsed, ensure_ascii=False)


def strict_extract_json(text: str) -> Optional[str]:
    if not text:
        return None

    raw = text.strip()

    # Remove markdown code fences
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()
        raw = raw.strip()

    start = raw.find("{")
    end = raw.rfind("}")

    if start == -1 or end == -1 or start > end:
        return None

    candidate = raw[start : end + 1]

    try:
        json.loads(candidate)
        return candidate
    except Exception:
        return None


# ============================================================
# Memory fusion block builder (ported)
# ============================================================

def build_memory_fusion_block(
    stm: List[str],
    mtm: str,
    ltm: List[str],
    ocr: List[Dict[str, Any]],
    vision: List[Dict[str, Any]],
) -> str:
    parts = ["===== MEMORY_FUSION_BLOCK START ====="]

    if stm:
        parts.append("\n===== SHORT_TERM_MEMORY (Recent Conversation) =====")
        parts.append("IMPORTANT: Use this to answer questions about what the user said earlier.")
        parts.append("This is the COMPLETE recent conversation history:\n")
        for line in stm:  # Don't limit to 8, show all
            parts.append(line.strip())
        parts.append("===== END SHORT_TERM_MEMORY =====")

    if mtm:
        parts.append("\nMID_TERM_MEMORY:")
        parts.append(mtm.strip())

    if ltm:
        parts.append("\nLONG_TERM_MEMORY:")
        for item in ltm[:10]:
            parts.append(f"- {item.strip()}")

    if ocr:
        parts.append("\n" + "="*70)
        parts.append("📄 OCR_EXTRACT (Uploaded Documents)")
        parts.append("="*70)
        parts.append("⚠️ CRITICAL: This is EXACT text extracted from uploaded documents.")
        parts.append("⚠️ Use this as PRIMARY SOURCE for document questions.")
        parts.append("⚠️ All numbers, amounts, dates, names must match EXACTLY.")
        parts.append("⚠️ Check for: Bank names, Currency context, Arabic text, Location clues\n")
        
        for idx, doc in enumerate(ocr[:5], 1):
            text = (doc.get("text") or "")  # No limit here - already limited above
            parts.append(f"\n{'─'*70}")
            parts.append(f"DOCUMENT {idx}: {doc.get('name')}")
            parts.append(f"{'─'*70}")
            parts.append(text)
            parts.append(f"{'─'*70}\n")
        
        parts.append("="*70)
        parts.append("END OF OCR_EXTRACT")
        parts.append("="*70)

    if vision:
        parts.append("\nVISION_EXTRACT:")
        for img in vision[:5]:
            desc = (img.get("description") or "").strip()
            parts.append(f"- Image: {img.get('name')}")
            parts.append(f"  Description: {desc}")

    parts.append("===== MEMORY_FUSION_BLOCK END =====")
    return "\n".join(parts)


# ============================================================
# Agent role map (ported)
# ============================================================

def get_agent_style_instructions(agent: str) -> str:
    """Get natural role descriptions without rigid formatting."""
    agent = (agent or "default").lower()
    return {
        "default": (
            "You're a general-purpose AI assistant. Help with any task clearly and efficiently."
        ),
        "legal": (
            "You help users understand legal documents and concepts in plain language. "
            "Always remind users this isn't legal advice and they should consult a lawyer for their specific situation."
        ),
        "education": (
            "You're a tutor who explains concepts clearly with examples. "
            "Break down complex topics into understandable pieces and check for understanding."
        ),
        "travel": (
            "You help users plan trips and understand travel logistics. "
            "Give practical, actionable advice about destinations, timing, and logistics."
        ),
        "developer": (
            "You help developers with code, debugging, and technical concepts. "
            "Be precise with technical details but explain clearly."
        ),
    }.get(agent, "You're a helpful AI assistant. Answer naturally and clearly.")


# ============================================================
# 🆕 SHORT-TERM MEMORY GENERATION (CRITICAL - from gemini.py)
# ============================================================

async def generate_short_summary(text: str) -> str:
    """
    Generate a very short internal summary (1–3 sentences)
    used for short-term / mid-term memory.
    This is NOT shown to the user and is stored inside metadata.
    
    ⚠️ CRITICAL: This function was missing - causing memory loss!
    """
    try:
        client = get_openai_client()

        prompt = (
            "Summarize the following assistant message in 1–3 short sentences. "
            "This summary is strictly for internal memory and will not be shown to the user. "
            "Focus on what the assistant explained, answered, or concluded.\n\n"
            f"Assistant reply:\n{text}"
        )

        response = await client.chat.completions.create(
            model="gpt-4o-mini",  # Use fastest model for summaries
            messages=[
                {"role": "system", "content": "You are a precise summarization assistant."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=120,
        )

        return (response.choices[0].message.content or "").strip()

    except Exception as e:
        print("⚠️ Short summary generation failed:", e)
        return ""


# ============================================================
# 🆕 IMAGE ANALYSIS WITH VISION (CRITICAL - from gemini.py)
# ============================================================

async def analyze_image_with_openai(
    base64_data: str,
    mime_type: str,
    prompt: str = "Analyze this image and describe what you see.",
):
    client = get_openai_client()

    try:
        # Ensure proper data URI format for OpenAI Vision
        if not base64_data.startswith("data:"):
            base64_data = f"data:{mime_type};base64,{base64_data}"

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": base64_data,
                                "detail": "auto",
                            },
                        },
                    ],
                }
            ],
            max_tokens=600,
        )

        return (response.choices[0].message.content or "").strip()

    except Exception as e:
        print(f"❌ OpenAI Vision analysis failed: {e}")
        return "I could not analyze this image."

# ============================================================
# OpenAI agent runner (NOW memory-aware)
# ============================================================

async def run_openai_agent(
    message: str,
    agent: str = "default",
    model_name: str = "gpt-4o-mini",
    mid_summary: str | None = None,
    long_term_memory: str | None = None,
    conversation: str | None = None,
    ocr: List[Dict[str, Any]] | None = None,
    vision: List[Dict[str, Any]] | None = None,
    **kwargs,
) -> str:
    """
    Memory-aware OpenAI agent (drop-in replacement for Gemini).

    Accepts the same memory-ish inputs the Gemini runner used:
    - conversation (STM)
    - mid_summary (MTM)
    - long_term_memory (LTM)
    - ocr, vision

    Returns:
    - If model outputs a strict JSON tool-call → return JSON string
    - Else → return stabilized Markdown reply
    """

    now_utc = datetime.now(timezone.utc)
    current_date_utc = now_utc.strftime("%B %d, %Y")
    current_time_utc = now_utc.strftime("%H:%M:%S UTC")

    # -------------------------
    # Trim MTM (max 2 sentences)
    # -------------------------
    def _limit_sentences(text: str, max_sentences: int = 2) -> str:
        if not text:
            return ""
        parts = text.split(". ")
        limited = ". ".join(parts[:max_sentences])
        if text.strip().endswith("."):
            limited += "."
        return limited

    mid_clean = _limit_sentences(mid_summary) if mid_summary else ""

    # -------------------------
    # Trim LTM (header + top 3 bullets)
    # -------------------------
    trimmed_ltm = ""
    if long_term_memory:
        ltm_lines = [ln for ln in long_term_memory.splitlines() if ln.strip()]
        header = ""
        bullets: List[str] = []
        for ln in ltm_lines:
            if not header and not ln.strip().startswith("-"):
                header = ln.strip()
            elif ln.strip().startswith("-"):
                bullets.append(ln.strip())
        kept_bullets = bullets[:3]
        lines_out: List[str] = []
        if header:
            lines_out.append(header)
        lines_out.extend(kept_bullets)
        trimmed_ltm = "\n".join(lines_out).strip()

    # -------------------------
    # Trim STM conversation (keep last 10 lines)
    # -------------------------
    trimmed_conversation = ""
    if conversation:
        conv_lines = [ln for ln in conversation.splitlines() if ln.strip()]
        if len(conv_lines) > 10:
            conv_lines = conv_lines[-10:]
        trimmed_conversation = "\n".join(conv_lines).strip()

    # -------------------------
    # Limit OCR / Vision (safe)
    # -------------------------
    limited_ocr: List[Dict[str, Any]] = []
    for item in ocr or []:
        text = (item.get("text") or "")[:20000]  # Increased for large Arabic docs
        if text.strip():
            limited_ocr.append({"name": item.get("name"), "text": text})

    limited_vision: List[Dict[str, Any]] = []
    for idx, item in enumerate(vision or []):
        if idx >= 2:
            break
        desc = (item.get("description") or "").strip()
        desc_lines = [ln.strip() for ln in desc.splitlines() if ln.strip()]
        if len(desc_lines) > 3:
            desc_lines = desc_lines[:3]
        short_desc = "\n".join(desc_lines)
        if short_desc:
            limited_vision.append({"name": item.get("name"), "description": short_desc})

    # -------------------------
    # Build memory fusion block
    # -------------------------
    stm_list = trimmed_conversation.splitlines() if trimmed_conversation else []
    ltm_list = trimmed_ltm.splitlines() if trimmed_ltm else []

    memory_fusion_block = build_memory_fusion_block(
        stm=stm_list,
        mtm=mid_clean,
        ltm=ltm_list,
        ocr=limited_ocr,
        vision=limited_vision,
    )

    has_file_context = bool(limited_ocr or limited_vision)
    file_context_override = ""
    if has_file_context:
        file_context_override = """
[FILE_CONTEXT_OVERRIDE]

You have already been given extracted file content in the memory block above.
- If OCR_EXTRACT exists: treat it as the text of the uploaded documents (PDF/DOCX/TXT).
- If VISION_EXTRACT exists: treat it as the description of the uploaded images.

RULES:
- Do NOT ask the user to upload the file again if file content is present.
- Answer using the provided extracted content. If the extracted text is incomplete, ask for a specific missing page/section.
""".strip()

    # -------------------------
    # Assemble SYSTEM message (natural, not rigid)
    # -------------------------
    system_parts: List[str] = []
    system_parts.append(GOLDEN_SYSTEM_PROMPT)
    system_parts.append(KINBER_STYLE_BLOCK)
    system_parts.append(COMPLETION_ENFORCEMENT)
    system_parts.append(TOOLS_BLOCK)
    system_parts.append(get_agent_style_instructions(agent))
    system_parts.append(
        f"Current date: {current_date_utc}\nCurrent time: {current_time_utc}"
    )
    if memory_fusion_block and "MEMORY_FUSION_BLOCK START" in memory_fusion_block:
        system_parts.append(memory_fusion_block)
    if file_context_override:
        system_parts.append(file_context_override)

    system_message = "\n\n".join(
        part.strip() for part in system_parts if part and str(part).strip()
    )

    # Build user message with appropriate reminders
    reminders = []
    
    if trimmed_conversation:
        reminders.append("⚠️ Check SHORT_TERM_MEMORY for conversation context")
    
    if limited_ocr:
        reminders.append("⚠️ CRITICAL: Answer using EXACT information from OCR_EXTRACT above")
        reminders.append("⚠️ Verify all numbers, amounts, dates, and names directly from the document")
        reminders.append("⚠️ Check bank name and context for correct currency ($ ≠ always USD!)")
        reminders.append("⚠️ Detect Arabic text for language identification")
        reminders.append("⚠️ Never approximate or round numbers from documents")
    
    if reminders:
        reminder_text = "\n".join(reminders)
        user_message = f"[{reminder_text}]\n\n{message.strip()}"
    else:
        user_message = message.strip()

    # -------------------------
    # 🆕 DEBUG LOGGING (from gemini.py) - CRITICAL!
    # -------------------------
    print(f"🔍 OPENAI: Using model: {model_name}")
    print(
        f"🔍 OPENAI: MTM={'yes' if mid_clean else 'no'}, "
        f"LTM={'yes' if trimmed_ltm else 'no'}, "
        f"STM={'yes' if trimmed_conversation else 'no'}, "
        f"OCR={len(limited_ocr)}, Vision={len(limited_vision)}"
    )

    # -------------------------
    # Call OpenAI with FULL system memory (Gemini-equivalent)
    # -------------------------
    client = get_openai_client()

    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "system",
                    "content": system_message,
                },
                {
                    "role": "user",
                    "content": user_message,
                },
            ],
            temperature=0.7,  # Slightly higher for more natural, conversational responses
            max_tokens=2500,  # Increased for comprehensive document analysis
        )

        raw = (response.choices[0].message.content or "").strip()

        # -------------------------
        # Strict JSON tool-call passthrough
        # -------------------------
        strict_json = strict_extract_json(raw)
        if strict_json is not None:
            normalized = normalize_tool_json(strict_json)
            if normalized is not None:
                return normalized

        # -------------------------
        # Normal assistant reply
        # -------------------------
        return stabilize_output(raw)

    except Exception as e:
        print(f"❌ OpenAI agent error: {e}")
        return f"OpenAI Error: {str(e)}"


# ============================================================
# 🆕 LEGACY COMPATIBILITY WRAPPER (from gemini.py)
# ============================================================

async def generate_response(message: str, instructions: str | None = None) -> str:
    """Backwards-compatible wrapper used in older parts of the codebase."""
    if instructions:
        combined = f"{instructions.strip()}\n\nUser message:\n{message}"
    else:
        combined = message
    return await run_openai_agent(combined)


# ============================================================
# 🆕 TEST CONNECTION (from gemini.py)
# ============================================================

async def test_connection() -> bool:
    """Test OpenAI API connection."""
    try:
        print("🔄 Testing OpenAI API connection...")
        now_utc = datetime.now(timezone.utc)
        test_time = now_utc.strftime("%H:%M:%S UTC on %B %d, %Y")

        client = get_openai_client()
        
        import time
        start = time.time()
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": f"Connectivity test at {test_time}. Reply with OK."}
            ],
            max_tokens=50,
        )

        reply = response.choices[0].message.content or ""
        print("📝 Test Response:", reply)
        print(f"✅ OK in {time.time() - start:.2f}s")
        return True

    except Exception as e:
        print("❌ OpenAI connection failed:", e)
        return False
