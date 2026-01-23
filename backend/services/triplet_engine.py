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


# ------------------------------------------------------------
# ULTRA-OPTIMIZED Model calls
# ------------------------------------------------------------
async def _get_gpt(prompt: str, attachments: Optional[List] = None) -> str:
    """Call OpenAI GPT-4o-mini - ULTRA OPTIMIZED"""
    try:
        messages = []
        content = []
        
        # Add text prompt
        content.append({"type": "text", "text": prompt})
        
        # Add images if any
        if attachments:
            for att in attachments:
                if att.get("type", "").startswith("image/"):
                    base64_data = att.get("base64", "")
                    if base64_data.startswith("data:"):
                        base64_data = base64_data.split(",", 1)[1]
                    
                    content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{att['type']};base64,{base64_data}",
                            "detail": "low"  # Changed from "high" to "low" for speed
                        }
                    })
        
        messages.append({"role": "user", "content": content})
        
        res = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o-mini",  # Changed from gpt-4o to mini for speed
            messages=messages,
            temperature=0.3,  # Reduced from 0.5
            max_tokens=800,  # Reduced from 1200
        )
        return res.choices[0].message.content
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"GPT Error: {str(e)}"


async def _get_claude(prompt: str, attachments: Optional[List] = None) -> str:
    """Call Claude Sonnet 4.5 - ULTRA OPTIMIZED"""
    try:
        content = []
        
        # Add images first
        if attachments:
            for att in attachments:
                if att.get("type", "").startswith("image/"):
                    base64_data = att.get("base64", "")
                    if base64_data.startswith("data:"):
                        base64_data = base64_data.split(",", 1)[1]
                    
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
            model="claude-sonnet-4-5-20250929",  # Changed from Opus to Sonnet for speed
            max_tokens=800,  # Reduced from 1200
            temperature=0.3,  # Added for consistency
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
    """Call DeepSeek - ULTRA OPTIMIZED"""
    if not deepseek_client:
        return "DeepSeek Error: Client not initialized"
    
    try:
        system_instruction = "You are a helpful AI assistant. Be concise."
        
        # DeepSeek doesn't support vision
        if attachments and any(att.get("type", "").startswith("image/") for att in attachments):
            return "DeepSeek Note: This model doesn't support image analysis."
        
        res = await asyncio.to_thread(
            deepseek_client.chat.completions.create,
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            max_tokens=800,  # Reduced from 1200
            temperature=0.3,  # Reduced from 0.5
        )
        return res.choices[0].message.content
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"DeepSeek Error: {str(e)}"


# ------------------------------------------------------------
# ULTRA-OPTIMIZED Verdict Generator
# ------------------------------------------------------------
async def _generate_blind_verdict(
    prompt: str, 
    results: Dict[str, str], 
    has_images: bool = False
) -> str:
    """
    Generate professional verdict - ULTRA OPTIMIZED
    """
    try:
        vision_context = ""
        if has_images:
            vision_context = """

CONTEXT: Image analysis involved.
- Response A and B: Full vision support
- Response C: Text-only (no vision)"""

        # Simplified, more concise prompt for faster verdict
        blind_prompt = f"""You are an AI evaluation judge. Analyze three responses concisely.

USER QUESTION: {prompt}

RESPONSE A: {results.get('gpt', 'N/A')}
RESPONSE B: {results.get('claude', 'N/A')}
RESPONSE C: {results.get('deepseek', 'N/A')}
{vision_context}

Provide:
1. Score each response /10 (accuracy, completeness, clarity, relevance)
2. Synthesize the best answer combining insights from all three

FORMAT:

EVALUATION SUMMARY

Response A: [Score]/10
[2 sentences - strengths/weaknesses]

Response B: [Score]/10
[2 sentences - strengths/weaknesses]

Response C: [Score]/10
[2 sentences - strengths/weaknesses]

RECOMMENDED ANSWER

[Synthesized answer combining best insights, 150-250 words]

Be objective and concise."""

        res = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o-mini",  # Changed from gpt-4o for speed
            messages=[{"role": "user", "content": blind_prompt}],
            temperature=0.2,  # Reduced from 0.3
            max_tokens=700,  # Reduced from 1000
        )
        
        verdict_text = res.choices[0].message.content.strip()
        
        if has_images:
            vision_note = """

MODEL CAPABILITIES
- GPT-4o-mini: Vision support ✓
- Claude Sonnet 4.5: Vision support ✓
- DeepSeek: Text-only ✗"""
            verdict_text = verdict_text + "\n" + vision_note
        
        footer = """

───────────────────────────────────────────────────────────────
This verdict was generated by an independent AI judge that did not know which model produced which response."""
        
        final_verdict = verdict_text + "\n" + footer
        
        return final_verdict
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        fallback = f"""EVALUATION SUMMARY

Response A: N/A
Verdict generation error. Review responses above.

Response B: N/A
Verdict generation error. Review responses above.

Response C: N/A
Verdict generation error. Review responses above.

RECOMMENDED ANSWER

Error: {str(e)}

───────────────────────────────────────────────────────────────
This verdict was generated by an independent AI judge that did not know which model produced which response."""
        
        return fallback


# ------------------------------------------------------------
# Main Triplet Runner - ULTRA OPTIMIZED
# ------------------------------------------------------------
async def run_triplet(
    prompt: str, 
    attachments: Optional[List] = None, 
    skip_ai_verdict: bool = False  # ✅ ADDED: skip_ai_verdict parameter
) -> dict:
    """
    Run prompt across 3 models - ULTRA OPTIMIZED
    
    Args:
        prompt: User's question
        attachments: Optional attachments
        skip_ai_verdict: If True, skip AI verdict generation for maximum speed
    
    Returns:
        Dict with model responses and verdict
    """
    print(f"\n{'═' * 60}")
    print(f"🔀 TRIPLET REQUEST (ULTRA-OPTIMIZED)")
    print(f"{'═' * 60}")
    print(f"Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
    print(f"Skip AI Verdict: {skip_ai_verdict}")
    
    has_images = False
    if attachments:
        has_images = any(att.get("type", "").startswith("image/") for att in attachments)
        print(f"📎 Attachments: {len(attachments)} files")
        print(f"🖼️  Images: {'Yes' if has_images else 'No'}")
    
    # ✅ Run all three models in parallel
    print(f"⚡ Starting parallel model execution...")
    start_time = asyncio.get_event_loop().time()
    
    gpt_res, claude_res, deepseek_res = await asyncio.gather(
        _get_gpt(prompt, attachments),
        _get_claude(prompt, attachments),
        _get_deepseek(prompt, attachments),
    )
    
    models_time = asyncio.get_event_loop().time() - start_time
    print(f"⚡ Models completed in {models_time:.2f}s")
    
    results = {
        "gpt": gpt_res,
        "claude": claude_res,
        "deepseek": deepseek_res,
    }
    
    print(f"\n📊 Model Response Status:")
    print(f"   GPT-4o-mini: {'✅' if not gpt_res.startswith('GPT Error:') else '❌'} ({len(gpt_res)} chars)")
    print(f"   Claude Sonnet: {'✅' if not claude_res.startswith('Claude Error:') else '❌'} ({len(claude_res)} chars)")
    print(f"   DeepSeek: {'✅' if not deepseek_res.startswith('DeepSeek Error:') else '❌'} ({len(deepseek_res)} chars)")
    
    # ✅ Generate verdict (or skip if requested)
    if skip_ai_verdict:
        print(f"⚡ Skipping AI verdict (fast mode)")
        verdict = f"""EVALUATION SUMMARY

All three models have provided their responses above. Review them to determine which answer best suits your needs.

Response A (GPT-4o-mini): {len(gpt_res)} characters
Response B (Claude Sonnet 4.5): {len(claude_res)} characters  
Response C (DeepSeek): {len(deepseek_res)} characters

RECOMMENDED ANSWER

Compare the responses above. Each model offers unique insights:
- Response A: Fast, efficient, good for general queries
- Response B: Balanced speed and depth
- Response C: Alternative perspective, text-only

───────────────────────────────────────────────────────────────
Compare all three responses to find the answer that best matches your needs."""
    else:
        print(f"⚡ Generating AI verdict...")
        verdict_start = asyncio.get_event_loop().time()
        verdict = await _generate_blind_verdict(prompt, results, has_images=has_images)
        verdict_time = asyncio.get_event_loop().time() - verdict_start
        print(f"⚡ Verdict completed in {verdict_time:.2f}s")
    
    results["verdict"] = verdict
    
    total_time = asyncio.get_event_loop().time() - start_time
    print(f"{'═' * 60}")
    print(f"✅ TRIPLET COMPLETED in {total_time:.2f}s")
    print(f"{'═' * 60}\n")
    
    return results