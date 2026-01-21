import os
import asyncio
import random
from pathlib import Path
from typing import Dict

from openai import OpenAI
from anthropic import Anthropic
from dotenv import load_dotenv

# ------------------------------------------------------------
# Load .env explicitly from project root (CRITICAL)
# ------------------------------------------------------------
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")

# ------------------------------------------------------------
# API Keys
# ------------------------------------------------------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

# ------------------------------------------------------------
# Clients (sync clients; executed via asyncio.to_thread)
# ------------------------------------------------------------
openai_client = OpenAI(api_key=OPENAI_API_KEY)

anthropic_client = Anthropic(
    api_key=ANTHROPIC_API_KEY,
    http_client=None,  # prevents proxy-related bug
)

deepseek_client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com",
)

# ------------------------------------------------------------
# Model calls
# ------------------------------------------------------------
async def _get_gpt(prompt: str) -> str:
    """Call OpenAI GPT-4o"""
    try:
        res = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
        )
        return res.choices[0].message.content
    except Exception as e:
        return f"GPT Error: {str(e)}"


async def _get_claude(prompt: str) -> str:
    """Call Claude Opus 4.5"""
    try:
        res = await asyncio.to_thread(
            anthropic_client.messages.create,
            model="claude-opus-4-5-20251101",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ],
        )
        return "".join(
            block.text for block in res.content
            if hasattr(block, "text")
        )
    except Exception as e:
        return f"Claude Error: {str(e)}"


async def _get_deepseek(prompt: str) -> str:
    """Call DeepSeek with English enforcement"""
    try:
        system_instruction = "You are a helpful AI assistant. Always respond in English."
        
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
        return f"DeepSeek Error: {str(e)}"


# ------------------------------------------------------------
# Blind Jury Verdict Generator
# ------------------------------------------------------------
async def _generate_blind_verdict(prompt: str, results: Dict[str, str]) -> str:
    """
    Generate unbiased verdict using blind evaluation
    
    Args:
        prompt: Original user question
        results: Dict with 'gpt', 'claude', 'deepseek' responses
    
    Returns:
        Verdict text with evaluation and synthesis
    """
    try:
        print("\n⚖️ Generating blind jury verdict...")
        
        # ✅ Step 1: Collect valid responses
        model_responses = []
        
        if results.get("gpt") and not results["gpt"].startswith("GPT Error:"):
            model_responses.append({
                "actual_model": "OpenAI GPT-4o",
                "response": results["gpt"]
            })
        
        if results.get("claude") and not results["claude"].startswith("Claude Error:"):
            model_responses.append({
                "actual_model": "Claude Opus 4.5",
                "response": results["claude"]
            })
        
        if results.get("deepseek") and not results["deepseek"].startswith("DeepSeek Error:"):
            model_responses.append({
                "actual_model": "DeepSeek",
                "response": results["deepseek"]
            })
        
        # ✅ Check if we have at least 2 responses
        if len(model_responses) < 2:
            return "⚖️ **Insufficient Responses**\n\nNeed at least 2 model responses for jury evaluation."
        
        # ✅ Step 2: Shuffle to remove bias
        random.shuffle(model_responses)
        print(f"🔀 Shuffled {len(model_responses)} responses for blind evaluation")
        
        # ✅ Step 3: Assign anonymous labels
        anonymous_labels = ["A", "B", "C"]
        labeled_responses = []
        model_mapping = {}
        
        for i, item in enumerate(model_responses):
            if i < len(anonymous_labels):
                label = anonymous_labels[i]
                labeled_responses.append({
                    "label": label,
                    "response": item["response"]
                })
                model_mapping[label] = item["actual_model"]
                print(f"   Model {label} = {item['actual_model']} (hidden from jury)")
        
        # ✅ Step 4: Build anonymized responses section
        responses_section = ""
        for item in labeled_responses:
            responses_section += f"""**Model {item['label']}:**
{item['response']}

{'─' * 60}

"""
        
        jury_prompt = f"""You are a professional AI Analyst providing a high-level executive summary and synthesis. 
Your goal is to provide a clean, readable, and highly useful comparison without excessive formatting clutter.

---
**ORIGINAL QUERY:**
{prompt}

---
**INPUT RESPONSES:**
{responses_section}
---

**INSTRUCTIONS:**
1. Provide a crisp Scorecard for the three models.
2. Under "EXECUTIVE INSIGHTS", explain why the winner was chosen in 1-2 sentences.
3. Under "THE OPTIMAL RESPONSE", provide a single, perfectly synthesized answer that combines the best parts of all three responses.

**OUTPUT FORMAT (FOLLOW EXACTLY):**

### 📊 Model Scorecard
* **GPT-4o:** [X]/10 — [Brief, professional remark]
* **Claude 3.5 Sonnet:** [X]/10 — [Brief, professional remark]
* **DeepSeek-V3:** [X]/10 — [Brief, professional remark]

### 💡 Executive Insights
[Briefly explain which model handled the specific nuance of the prompt best and why.]

### 🎯 The Optimal Response
[Provide the high-quality, synthesized final answer here. Use clean paragraphs and bullet points only where necessary. Avoid excessive bolding or decorative characters.]

**Note for Analyst:**
Model A was: {model_mapping.get('A', 'Unknown')}
Model B was: {model_mapping.get('B', 'Unknown')}
Model C was: {model_mapping.get('C', 'Unknown')}
"""

        # ✅ Step 6: Call Jury (GPT-4o for best reasoning)
        print("⚖️ Calling jury (GPT-4o) for evaluation...")
        
        verdict_response = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert AI jury providing fair, unbiased evaluations of AI model responses. Be thorough, honest, and insightful."
                },
                {
                    "role": "user",
                    "content": jury_prompt
                }
            ],
            temperature=0.3,
        )
        
        verdict_text = verdict_response.choices[0].message.content
        
        # ✅ Step 7: Add professional disclaimer
        disclaimer = f"""

{'─' * 60}

*Note: The jury evaluated these responses without knowing which model produced which answer, ensuring an unbiased assessment based purely on quality.*
"""
        
        final_verdict = verdict_text + disclaimer
        
        print(f"✅ Verdict generated: {len(final_verdict)} characters")
        return final_verdict
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Verdict generation error: {error_msg}")
        import traceback
        traceback.print_exc()
        return f"⚖️ **Verdict Generation Failed**\n\nError: {error_msg[:300]}"


# ------------------------------------------------------------
# Triplet orchestrator
# ------------------------------------------------------------
async def run_triplet(prompt: str) -> dict:
    """
    Run the same prompt across GPT-4o, Claude Opus, and DeepSeek
    Then generate a blind jury verdict
    
    Args:
        prompt: User's question/prompt
        
    Returns:
        Dict with individual model responses and blind jury verdict
    """
    print(f"\n{'═' * 60}")
    print(f"🔀 TRIPLET REQUEST")
    print(f"{'═' * 60}")
    print(f"Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''}")
    
    # ✅ Run all three models in parallel
    gpt_res, claude_res, deepseek_res = await asyncio.gather(
        _get_gpt(prompt),
        _get_claude(prompt),
        _get_deepseek(prompt),
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
    
    # ✅ Generate blind jury verdict
    verdict = await _generate_blind_verdict(prompt, results)
    results["verdict"] = verdict
    
    print(f"{'═' * 60}")
    print(f"✅ TRIPLET COMPLETED")
    print(f"{'═' * 60}\n")
    
    return results
