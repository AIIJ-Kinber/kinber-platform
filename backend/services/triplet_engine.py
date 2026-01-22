# backend/services/triplet_engine.py

import asyncio
import base64
import os
from typing import Dict, List, Optional
from openai import OpenAI
from anthropic import Anthropic

# Initialize clients with environment variables
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

try:
    from openai import OpenAI as DeepSeekClient
    deepseek_client = DeepSeekClient(
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        base_url="https://api.deepseek.com"
    )
except Exception as e:
    print(f"⚠️ DeepSeek client init failed: {e}")
    deepseek_client = None


# ----------------------------------
# Model calls with vision support
# ---------------------------------
async def _get_gpt(prompt: str, attachments: Optional[List] = None) -> str:
    """Call OpenAI GPT-4o with vision support"""
    try:
        messages = []
        
        # Build message content with text and images
        content = []
        
        # Add text prompt
        content.append({"type": "text", "text": prompt})
        
        # Add images if any
        if attachments:
            for att in attachments:
                if att.get("type", "").startswith("image/"):
                    # Extract base64 data
                    base64_data = att.get("base64", "")
                    if base64_data.startswith("data:"):
                        base64_data = base64_data.split(",", 1)[1]
                    
                    content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{att['type']};base64,{base64_data}",
                            "detail": "high"
                        }
                    })
        
        messages.append({"role": "user", "content": content})
        
        res = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o",
            messages=messages,
            temperature=0.7,
            max_tokens=2000,
        )
        return res.choices[0].message.content
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"GPT Error: {str(e)}"


async def _get_claude(prompt: str, attachments: Optional[List] = None) -> str:
    """Call Claude Opus 4.5 with vision support"""
    try:
        content = []
        
        # Add images first (Claude prefers this order)
        if attachments:
            for att in attachments:
                if att.get("type", "").startswith("image/"):
                    # Extract base64 data
                    base64_data = att.get("base64", "")
                    if base64_data.startswith("data:"):
                        base64_data = base64_data.split(",", 1)[1]
                    
                    # Determine media type
                    media_type = att.get("type", "image/jpeg")
                    
                    content.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": base64_data
                        }
                    })
        
        # Add text prompt
        content.append({"type": "text", "text": prompt})
        
        res = await asyncio.to_thread(
            anthropic_client.messages.create,
            model="claude-opus-4-5-20251101",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": content}
            ],
        )
        return "".join(
            block.text for block in res.content
            if hasattr(block, "text")
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"Claude Error: {str(e)}"


async def _get_deepseek(prompt: str, attachments: Optional[List] = None) -> str:
    """Call DeepSeek (text-only, no vision)"""
    if not deepseek_client:
        return "DeepSeek Error: Client not initialized"
    
    try:
        system_instruction = "You are a helpful AI assistant. Always respond in English."
        
        # DeepSeek doesn't support vision, inform user if images attached
        if attachments and any(att.get("type", "").startswith("image/") for att in attachments):
            return "DeepSeek Note: This model doesn't support image analysis. Response is text-only based on your question."
        
        res = await asyncio.to_thread(
            deepseek_client.chat.completions.create,
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
        )
        return res.choices[0].message.content
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"DeepSeek Error: {str(e)}"


# ------------------------------------------------------------
# Blind verdict generator
# ------------------------------------------------------------
async def _generate_blind_verdict(
    prompt: str, 
    results: Dict[str, str], 
    has_images: bool = False
) -> str:
    """
    Generate unbiased verdict using GPT-4o
    
    Args:
        prompt: Original user question
        results: Dict with 'gpt', 'claude', 'deepseek' responses
        has_images: Whether image analysis was involved
    
    Returns:
        Verdict text
    """
    try:
        blind_prompt = f"""You are an impartial AI judge analyzing three responses to the same question.

**USER QUESTION:**
{prompt}

**RESPONSE A:**
{results.get('gpt', 'N/A')}

**RESPONSE B:**
{results.get('claude', 'N/A')}

**RESPONSE C:**
{results.get('deepseek', 'N/A')}

Provide a brief, objective analysis:
1. Which response(s) best answered the question?
2. Key strengths/weaknesses of each
3. Your recommended answer (synthesize if needed)

Keep it concise (200-300 words). Be fair and evidence-based."""

        res = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o",
            messages=[{"role": "user", "content": blind_prompt}],
            temperature=0.3,
            max_tokens=500,
        )
        
        verdict_text = res.choices[0].message.content
        
        # Add note about vision capabilities if images were attached
        vision_note = ""
        if has_images:
            vision_note = f"""

---

**Note on Vision Capabilities:**
- ✅ OpenAI GPT-4o: Full vision support
- ✅ Claude Opus 4.5: Full vision support
- ⚠️ DeepSeek: No vision support (text-only response)
"""
        
        disclaimer = f"""

---

*This verdict was generated by an independent AI judge who did not know which model produced which response.*"""
        
        final_verdict = verdict_text + vision_note + disclaimer
        
        return final_verdict
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"**Verdict Generation Failed:** {str(e)}\n\nAll three responses are displayed above for your review."


# ------------------------------------------------
# Main Triplet Runner
# ------------------------------------------------
async def run_triplet(prompt: str, attachments: Optional[List] = None) -> dict:
    """
    Run the same prompt across GPT-4o, Claude Opus, and DeepSeek
    With vision support for GPT and Claude
    
    Args:
        prompt: User's question/prompt
        attachments: Optional list of file attachments (images, PDFs)
        
    Returns:
        Dict with individual model responses and blind jury verdict
    """
    print(f"\n{'═' * 60}")
    print(f"🔀 TRIPLET REQUEST")
    print(f"{'═' * 60}")
    print(f"Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
    
    # Check for image attachments #
    has_images = False
    if attachments:
        has_images = any(att.get("type", "").startswith("image/") for att in attachments)
        print(f"📎 Attachments: {len(attachments)} files")
        print(f"🖼️  Images: {'Yes' if has_images else 'No'}")
    
    # ✅ Run all three models in parallel with attachments
    gpt_res, claude_res, deepseek_res = await asyncio.gather(
        _get_gpt(prompt, attachments),
        _get_claude(prompt, attachments),
        _get_deepseek(prompt, attachments),
    )
    
    results = {
        "gpt": gpt_res,
        "claude": claude_res,
        "deepseek": deepseek_res,
    }
    
    print(f"\n📊 Model Response Status:")
    print(f"   GPT-4o: {'✅' if not gpt_res.startswith('GPT Error:') else '❌'} ({len(gpt_res)} chars)")
    print(f"   Claude: {'✅' if not claude_res.startswith('Claude Error:') else '❌'} ({len(claude_res)} chars)")
    print(f"   DeepSeek: {'✅' if not deepseek_res.startswith('DeepSeek Error:') else '❌'} ({len(deepseek_res)} chars)")
    
    # ✅ Generate verdict (mention if image analysis was involved)
    verdict = await _generate_blind_verdict(prompt, results, has_images=has_images)
    results["verdict"] = verdict
    
    print(f"{'═' * 60}")
    print(f"✅ TRIPLET COMPLETED")
    print(f"{'═' * 60}\n")
    
    return results