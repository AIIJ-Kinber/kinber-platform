# backend/services/claude.py
# UPDATED WITH CORRECT MODEL NAMES (Jan 2025)

import os
from typing import Optional, List, Dict, Any
from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# Claude Client (singleton)
# ============================================================

_claude_client: Optional[AsyncAnthropic] = None


def get_claude_client() -> AsyncAnthropic:
    """
    Create/reuse a single AsyncAnthropic client instance.
    """
    global _claude_client

    if _claude_client is not None:
        return _claude_client

    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is missing")

    _claude_client = AsyncAnthropic(api_key=api_key)
    return _claude_client


# ============================================================
# Main Agent Function
# ============================================================

async def run_claude_agent(
    message: str,
    model_name: str = "claude-sonnet-4-20250514",
    agent: str = "default",
    ocr: Optional[List[Dict[str, Any]]] = None,
    vision: Optional[List[Dict[str, Any]]] = None,
    conversation: str = "",
    mid_summary: Optional[str] = None,
    long_term_memory: str = "",
    **kwargs
) -> str:
    """
    Run Claude agent with the given message.
    """
    try:
        client = get_claude_client()
        
        # ✅ Build system message as LIST (required by Claude API)
        system_messages = []
        
        if long_term_memory:
            system_messages.append({
                "type": "text",
                "text": f"Long-term memory:\n{long_term_memory}"
            })
        
        if mid_summary:
            system_messages.append({
                "type": "text",
                "text": f"Conversation summary:\n{mid_summary}"
            })
        
        if conversation:
            system_messages.append({
                "type": "text",
                "text": f"Recent conversation:\n{conversation}"
            })
        
        # ✅ Try current model names (as of Jan 2025)
        models_to_try = [
            "claude-sonnet-4-20250514",      # Sonnet 4 (newest)
            "claude-3-5-sonnet-20241022",    # Sonnet 3.5 v2
            "claude-3-5-sonnet-20240620",    # Sonnet 3.5 v1
            "claude-3-opus-20240229",        # Opus 3 (fallback)
        ]
        
        last_error = None
        
        for model in models_to_try:
            try:
                print(f"🟠 Trying Claude model: {model}")
                
                # Create message
                if system_messages:
                    response = await client.messages.create(
                        model=model,
                        max_tokens=2000,
                        system=system_messages,  # ✅ LIST format
                        messages=[{
                            "role": "user",
                            "content": message
                        }]
                    )
                else:
                    response = await client.messages.create(
                        model=model,
                        max_tokens=2000,
                        messages=[{
                            "role": "user",
                            "content": message
                        }]
                    )
                
                # Extract text
                if hasattr(response, 'content') and len(response.content) > 0:
                    text = response.content[0].text
                    print(f"✅ Claude succeeded with {model}: {len(text)} chars")
                    return text.strip()
                
            except Exception as e:
                last_error = str(e)
                print(f"⚠️ Model {model} failed: {last_error[:150]}")
                continue
        
        # If all models failed
        raise Exception(f"All Claude models failed. Last error: {last_error}")
        
    except Exception as e:
        print(f"❌ Claude agent error: {e}")
        return f"Claude Error: {str(e)}"


# ============================================================
# Image Analysis
# ============================================================

async def analyze_image_with_claude(
    base64_data: str,
    mime_type: str = "image/jpeg",
    prompt: str = "Describe this image."
) -> str:
    """
    Analyze an image using Claude's vision capabilities.
    """
    try:
        client = get_claude_client()
        
        # Remove data URI prefix if present
        if base64_data.startswith("data:"):
            base64_data = base64_data.split(",", 1)[1]
        
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",  # Updated model
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": mime_type,
                            "data": base64_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ],
            }]
        )
        
        return response.content[0].text
        
    except Exception as e:
        print(f"❌ Claude vision error: {e}")
        return f"Could not analyze image: {str(e)}"