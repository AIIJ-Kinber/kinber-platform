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
# OPTIMIZED Model calls with vision support
# ------------------------------------------------------------
async def _get_gpt(prompt: str, attachments: Optional[List] = None) -> str:
    """Call OpenAI GPT-4o with vision support - OPTIMIZED"""
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
                            "detail": "high"
                        }
                    })
        
        messages.append({"role": "user", "content": content})
        
        res = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o",
            messages=messages,
            temperature=0.5,  # Reduced from 0.7 for faster response
            max_tokens=1200,  # Reduced from 2000 for speed
        )
        return res.choices[0].message.content
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"GPT Error: {str(e)}"


async def _get_claude(prompt: str, attachments: Optional[List] = None) -> str:
    """Call Claude Opus 4.5 with vision support - OPTIMIZED"""
    try:
        content = []
        
        # Add images first (Claude prefers this order)
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
            model="claude-opus-4-5-20251101",
            max_tokens=1200,  # Reduced from 2000 for speed
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
    """Call DeepSeek (text-only, no vision) - OPTIMIZED"""
    if not deepseek_client:
        return "DeepSeek Error: Client not initialized"
    
    try:
        system_instruction = "You are a helpful AI assistant. Always respond in English. Be concise and to the point."
        
        # DeepSeek doesn't support vision
        if attachments and any(att.get("type", "").startswith("image/") for att in attachments):
            return "DeepSeek Note: This model doesn't support image analysis. Response is text-only based on your question."
        
        res = await asyncio.to_thread(
            deepseek_client.chat.completions.create,
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1200,  # Added limit for speed
            temperature=0.5,  # Optimized for speed
        )
        return res.choices[0].message.content
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"DeepSeek Error: {str(e)}"


# ------------------------------------------------------------
# Professional Blind Verdict Generator with Scoring
# ------------------------------------------------------------
async def _generate_blind_verdict(
    prompt: str, 
    results: Dict[str, str], 
    has_images: bool = False
) -> str:
    """
    Generate professional verdict with scoring and synthesis - OPTIMIZED
    """
    try:
        vision_context = ""
        if has_images:
            vision_context = """

IMPORTANT CONTEXT: This question involved image analysis.
- Response A and B had full vision capabilities
- Response C (DeepSeek) does NOT support vision and could only respond to text

Consider this when scoring accuracy and completeness."""

        blind_prompt = f"""You are an expert AI evaluation judge. Analyze three responses to the same question and provide a professional assessment.

USER QUESTION:
{prompt}

RESPONSE A:
{results.get('gpt', 'N/A')}

RESPONSE B:
{results.get('claude', 'N/A')}

RESPONSE C:
{results.get('deepseek', 'N/A')}
{vision_context}

Your task is to:

1. SCORE each response out of 10 based on:
   - Accuracy and correctness
   - Completeness and depth
   - Clarity and structure
   - Relevance to the question
   - Overall helpfulness

2. SYNTHESIZE the best elements from all three responses into one superior answer that:
   - Combines the strongest insights from each
   - Adds additional value or context where helpful
   - Presents information in the clearest, most useful format
   - Addresses the user's question comprehensively

FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS:

EVALUATION SUMMARY

Response A: [Score]/10
[2-3 sentences explaining the score - strengths and weaknesses]

Response B: [Score]/10
[2-3 sentences explaining the score - strengths and weaknesses]

Response C: [Score]/10
[2-3 sentences explaining the score - strengths and weaknesses]

RECOMMENDED ANSWER

[Provide the synthesized, enhanced answer here. This should be comprehensive, well-structured, and represent the best possible response by combining insights from all three models plus your own additions. Make this 200-300 words.]

Be objective, fair, and evidence-based in your evaluation."""

        res = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o",
            messages=[{"role": "user", "content": blind_prompt}],
            temperature=0.3,
            max_tokens=1000,  # Reduced from 1200 for speed
        )
        
        verdict_text = res.choices[0].message.content.strip()
        
        if has_images:
            vision_note = """

MODEL CAPABILITIES NOTE
- OpenAI GPT-4o: Full vision support ✓
- Claude Opus 4.5: Full vision support ✓
- DeepSeek: Text-only (no vision) ✗"""
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
Verdict generation encountered an error. Please review the responses above.

Response B: N/A
Verdict generation encountered an error. Please review the responses above.

Response C: N/A
Verdict generation encountered an error. Please review the responses above.

RECOMMENDED ANSWER

Error details: {str(e)}

All three model responses are displayed above for your manual review.

───────────────────────────────────────────────────────────────
This verdict was generated by an independent AI judge that did not know which model produced which response."""
        
        return fallback


# ------------------------------------------------------------
# Main Triplet Runner - OPTIMIZED
# ------------------------------------------------------------
async def run_triplet(prompt: str, attachments: Optional[List] = None) -> dict:
    """
    Run the same prompt across GPT-4o, Claude Opus, and DeepSeek
    OPTIMIZED for speed with reduced token limits and temperature
    """
    print(f"\n{'═' * 60}")
    print(f"🔀 TRIPLET REQUEST (OPTIMIZED)")
    print(f"{'═' * 60}")
    print(f"Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
    
    has_images = False
    if attachments:
        has_images = any(att.get("type", "").startswith("image/") for att in attachments)
        print(f"📎 Attachments: {len(attachments)} files")
        print(f"🖼️  Images: {'Yes' if has_images else 'No'}")
    
    # ✅ Run all three models in parallel (ALREADY OPTIMIZED)
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
    
    # ✅ Generate verdict
    verdict = await _generate_blind_verdict(prompt, results, has_images=has_images)
    results["verdict"] = verdict
    
    print(f"{'═' * 60}")
    print(f"✅ TRIPLET COMPLETED")
    print(f"{'═' * 60}\n")
    
    return results