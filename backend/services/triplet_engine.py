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
# NEUTRAL SYSTEM INSTRUCTION (Same for all models)
# ------------------------------------------------------------
NEUTRAL_INSTRUCTION = "You are a helpful AI assistant. Provide nuanced, concise, and direct answers. Focus on accuracy and clarity."


# ------------------------------------------------------------
# Model calls with IDENTICAL INSTRUCTIONS (Unbiased)
# ------------------------------------------------------------
async def _get_gpt(prompt: str, attachments: Optional[List] = None) -> str:
    """Call OpenAI GPT-4o-mini with neutral instructions"""
    try:
        content = []
        
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
                            "detail": "high"  # Changed back to high for better quality
                        }
                    })
        
        # Add text prompt
        content.append({"type": "text", "text": prompt})
        
        # Neutral system message (same for all)
        messages = [
            {
                "role": "system",
                "content": NEUTRAL_INSTRUCTION
            },
            {
                "role": "user",
                "content": content
            }
        ]
        
        res = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.3,  # Slightly increased for better responses
            max_tokens=600,   # Increased for more complete answers
        )
        return res.choices[0].message.content
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"GPT Error: {str(e)}"


async def _get_claude(prompt: str, attachments: Optional[List] = None) -> str:
    """Call Claude Sonnet 4.5 with neutral instructions"""
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
        
        # Add text prompt with neutral instruction
        prompt_with_instruction = f"{prompt}\n\n{NEUTRAL_INSTRUCTION}"
        content.append({"type": "text", "text": prompt_with_instruction})
        
        res = await asyncio.to_thread(
            anthropic_client.messages.create,
            model="claude-sonnet-4-5-20250929",
            max_tokens=600,   # Increased for more complete answers
            temperature=0.3,  # Slightly increased for better responses
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
    """Call DeepSeek with neutral instructions"""
    if not deepseek_client:
        return "DeepSeek Error: Client not initialized"
    
    try:
        content = []
        
        # Add images if any (DeepSeek now supports vision!)
        if attachments:
            for att in attachments:
                if att.get("type", "").startswith("image/"):
                    base64_data = att.get("base64", "")
                    if base64_data.startswith("data:"):
                        base64_data = base64_data.split(",", 1)[1]
                    
                    content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{att['type']};base64,{base64_data}"
                        }
                    })
        
        # Add text prompt
        content.append({"type": "text", "text": prompt})
        
        # Neutral system instruction (same as others)
        res = await asyncio.to_thread(
            deepseek_client.chat.completions.create,
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": NEUTRAL_INSTRUCTION},
                {"role": "user", "content": content}
            ],
            max_tokens=600,   # Increased for more complete answers
            temperature=0.3,  # Slightly increased for better responses
        )
        
        return res.choices[0].message.content
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"DeepSeek Error: {str(e)}"


# ------------------------------------------------------------
# Unbiased Verdict Generator
# ------------------------------------------------------------
async def _generate_blind_verdict(
    prompt: str, 
    results: Dict[str, str], 
    has_images: bool = False
) -> str:
    """
    Generate professional unbiased verdict
    All models received identical instructions for fair comparison
    """
    try:
        vision_context = ""
        if has_images:
            vision_context = "\nCONTEXT: All three models have vision capabilities and received identical instructions."

        blind_prompt = f"""You are an impartial AI judge evaluating three responses to the same question. All models received identical instructions, ensuring a fair comparison.

QUESTION: {prompt}

RESPONSE A: {results.get('gpt', 'N/A')}

RESPONSE B: {results.get('claude', 'N/A')}

RESPONSE C: {results.get('deepseek', 'N/A')}
{vision_context}

Evaluate based on:
- Accuracy and correctness
- Completeness and depth
- Clarity and structure
- Directness and conciseness
- Overall helpfulness

FORMAT:

EVALUATION SUMMARY

Response A: [X]/10
[2 sentences explaining strengths and weaknesses]

Response B: [X]/10
[2 sentences explaining strengths and weaknesses]

Response C: [X]/10
[2 sentences explaining strengths and weaknesses]

RECOMMENDED ANSWER

[Synthesize the best elements from all three responses into one superior answer. 150-200 words.]

Be objective, fair, and evidence-based."""

        res = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": blind_prompt}],
            temperature=0.2,
            max_tokens=700,
        )
        
        verdict_text = res.choices[0].message.content.strip()
        
        if has_images:
            vision_note = "\n\nMODEL CAPABILITIES\n• GPT-4o-mini: Vision support ✓\n• Claude Sonnet 4.5: Vision support ✓\n• DeepSeek: Vision support ✓"
            verdict_text = verdict_text + vision_note
        
        footer = "\n\n───────────────────────────────────────────────────────────────\nThis verdict was generated by an independent AI judge that did not know which model produced which response."
        
        return verdict_text + footer
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        return f"""EVALUATION SUMMARY

Response A: N/A
Response B: N/A
Response C: N/A

RECOMMENDED ANSWER

Error: {str(e)}

───────────────────────────────────────────────────────────────
This verdict was generated by an independent AI judge that did not know which model produced which response."""


# ------------------------------------------------------------
# Main Triplet Runner
# ------------------------------------------------------------
async def run_triplet(
    prompt: str, 
    attachments: Optional[List] = None, 
    skip_ai_verdict: bool = False
) -> dict:
    """
    Run prompt across 3 models with IDENTICAL INSTRUCTIONS for fair comparison
    """
    print(f"\n{'═' * 60}")
    print(f"🔀 TRIPLET REQUEST (UNBIASED)")
    print(f"{'═' * 60}")
    print(f"Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
    print(f"Skip AI Verdict: {skip_ai_verdict}")
    
    has_images = False
    if attachments:
        has_images = any(att.get("type", "").startswith("image/") for att in attachments)
        print(f"📎 Attachments: {len(attachments)} files")
        print(f"🖼️  Images: {'Yes' if has_images else 'No'}")
    
    # ✅ Run all three models in parallel with identical instructions
    print(f"⚡ Starting parallel execution (all models: {NEUTRAL_INSTRUCTION})...")
    start = asyncio.get_event_loop().time()
    
    gpt_res, claude_res, deepseek_res = await asyncio.gather(
        _get_gpt(prompt, attachments),
        _get_claude(prompt, attachments),
        _get_deepseek(prompt, attachments),
    )
    
    models_time = asyncio.get_event_loop().time() - start
    print(f"⚡ Models: {models_time:.1f}s")
    
    results = {
        "gpt": gpt_res,
        "claude": claude_res,
        "deepseek": deepseek_res,
    }
    
    print(f"📊 GPT: {'✅' if not gpt_res.startswith('GPT Error:') else '❌'} ({len(gpt_res)}ch)")
    print(f"📊 Claude: {'✅' if not claude_res.startswith('Claude Error:') else '❌'} ({len(claude_res)}ch)")
    print(f"📊 DeepSeek: {'✅' if not deepseek_res.startswith('DeepSeek Error:') else '❌'} ({len(deepseek_res)}ch)")
    
    # ✅ Generate unbiased verdict
    if skip_ai_verdict:
        print(f"⚡ Skipping verdict")
        verdict = f"""EVALUATION SUMMARY

All three models received identical instructions for fair comparison.

Response A (GPT-4o-mini): {len(gpt_res)} chars
Response B (Claude Sonnet 4.5): {len(claude_res)} chars  
Response C (DeepSeek): {len(deepseek_res)} chars

RECOMMENDED ANSWER

Compare the three responses above to find the answer that best matches your needs. All models used the same instructions: "{NEUTRAL_INSTRUCTION}"

───────────────────────────────────────────────────────────────
Fair comparison ensured through identical instructions."""
    else:
        print(f"⚡ Generating unbiased verdict...")
        verdict_start = asyncio.get_event_loop().time()
        verdict = await _generate_blind_verdict(prompt, results, has_images=has_images)
        verdict_time = asyncio.get_event_loop().time() - verdict_start
        print(f"⚡ Verdict: {verdict_time:.1f}s")
    
    results["verdict"] = verdict
    
    total = asyncio.get_event_loop().time() - start
    print(f"{'═' * 60}")
    print(f"✅ TOTAL: {total:.1f}s")
    print(f"{'═' * 60}\n")
    
    return results


# ------------------------------------------------------------
# Streaming Triplet Runner
# ------------------------------------------------------------
async def run_triplet_streaming(
    prompt: str, 
    attachments: Optional[List] = None, 
    skip_ai_verdict: bool = False
):
    """
    Stream Triplet results as they complete (with identical instructions)
    """
    print(f"\n{'═' * 60}")
    print(f"🔀⚡ STREAMING TRIPLET (UNBIASED)")
    print(f"{'═' * 60}")
    
    has_images = False
    if attachments:
        has_images = any(att.get("type", "").startswith("image/") for att in attachments)
    
    start = asyncio.get_event_loop().time()
    
    # Create tasks for all 3 models with identical instructions
    tasks = {
        "gpt": asyncio.create_task(_get_gpt(prompt, attachments)),
        "claude": asyncio.create_task(_get_claude(prompt, attachments)),
        "deepseek": asyncio.create_task(_get_deepseek(prompt, attachments)),
    }
    
    results = {}
    
    # Stream each result as it completes
    for model_name, task in tasks.items():
        try:
            result = await task
            results[model_name] = result
            elapsed = asyncio.get_event_loop().time() - start
            
            print(f"✅ {model_name}: {elapsed:.1f}s ({len(result)}ch)")
            
            # Send this model's result immediately
            yield {
                "model": model_name,
                "response": result,
                "elapsed": round(elapsed, 1)
            }
            
        except Exception as e:
            error_msg = f"{model_name.upper()} Error: {str(e)}"
            results[model_name] = error_msg
            yield {
                "model": model_name,
                "response": error_msg,
                "error": True
            }
    
    # Generate verdict after all models complete
    if not skip_ai_verdict:
        print(f"⚡ Generating unbiased verdict...")
        verdict_start = asyncio.get_event_loop().time()
        verdict = await _generate_blind_verdict(prompt, results, has_images=has_images)
        verdict_time = asyncio.get_event_loop().time() - verdict_start
        print(f"✅ Verdict: {verdict_time:.1f}s")
    else:
        verdict = "Verdict skipped for faster response."
    
    # Send verdict
    yield {
        "model": "verdict",
        "response": verdict
    }
    
    total = asyncio.get_event_loop().time() - start
    print(f"✅ TOTAL: {total:.1f}s\n")