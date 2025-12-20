# backend/services/history_builder.py

"""
History Builder Module
----------------------
This module converts Supabase DB messages into a clean role-based message array
for Gemini (or any openAI-style) chat models.

It also summarises older history beyond the last `N` messages so your model
retains continuity without forgetting earlier turns.
"""

from typing import List, Dict, Any
from backend.db.supabase_client import get_supabase
import traceback


# -------------------------------------------------------------------
# Load last N messages from DB (role-based)
# -------------------------------------------------------------------
def load_recent_messages(thread_id: str, limit: int = 6) -> List[Dict[str, str]]:
    """
    Load only the last N messages from DB as role/content pairs.
    Perfect for modern ChatML format.
    """
    try:
        resp = (
            supabase.table("messages")
            .select("role, content")
            .eq("thread_id", thread_id)
            .order("created_at", desc=False)
            .limit(limit)
            .execute()
        )

        rows = resp.data or []
        messages = []

        for row in rows:
            role = row.get("role", "").strip()
            content = row.get("content", "").strip()
            if not content:
                continue

            messages.append({
                "role": role,
                "content": content,
            })

        return messages

    except Exception as e:
        print("⚠️ load_recent_messages failed:", e)
        traceback.print_exc()
        return []


# -------------------------------------------------------------------
# Load *all* DB messages for summarization
# -------------------------------------------------------------------
def load_full_history(thread_id: str) -> List[Dict[str, str]]:
    try:
        resp = (
            supabase.table("messages")
            .select("role, content")
            .eq("thread_id", thread_id)
            .order("created_at", desc=False)
            .execute()
        )
        return resp.data or []

    except Exception as e:
        print("⚠️ load_full_history failed:", e)
        traceback.print_exc()
        return []


# -------------------------------------------------------------------
# Summarize older messages into a compact summary block
# -------------------------------------------------------------------
def summarize_older_history(full_history: List[Dict[str, str]], recent_count: int) -> str:
    """
    Convert older messages into a short summarization string,
    so the LLM maintains context without bloating tokens.
    """
    if len(full_history) <= recent_count:
        return ""

    try:
        older = full_history[:-recent_count]
        summary_lines = []

        for row in older:
            role = row.get("role", "")
            content = row.get("content", "")
            content = content[:300]  # Trim extremely long messages

            summary_lines.append(f"{role.upper()}: {content}")

        summary_text = "\n".join(summary_lines)
        return summary_text.strip()

    except Exception as e:
        print("⚠️ summarize_older_history failed:", e)
        traceback.print_exc()
        return ""


# -------------------------------------------------------------------
# Main entry: produce final chat messages for Gemini
# -------------------------------------------------------------------
def build_history_messages(thread_id: str, limit: int = 6) -> List[Dict[str, Any]]:
    """
    FINAL OUTPUT FORMAT:
    [
        {"role": "system", "content": "...summary..."},
        {"role": "user", "content": "..."},
        {"role": "assistant", "content": "..."}
    ]

    1. Summaries older messages beyond `limit`
    2. Preserves last N messages exactly as-is
    """

    # 1) Load full history for summarization
    full = load_full_history(thread_id)

    # 2) Summarize older content
    summary = summarize_older_history(full, limit)

    # 3) Load last N messages
    recent = load_recent_messages(thread_id, limit)

    messages: List[Dict[str, Any]] = []

    # If older summary exists → inject as system message
    if summary:
        messages.append({
            "role": "system",
            "content": "Summary of earlier conversation:\n" + summary
        })

    # Append recent messages in order
    messages.extend(recent)

    return messages
