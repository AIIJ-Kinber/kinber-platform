import os
import asyncio
from pathlib import Path

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
# Shared conciseness instruction (applied to ALL models)
# ------------------------------------------------------------
CONCISE_INSTRUCTION = (
    "Be concise and direct. "
    "Limit your response to a short paragraph (maximum 3–5 sentences). "
    "Avoid repetition, lists, examples, and unnecessary elaboration."
)

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
    try:
        res = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": CONCISE_INSTRUCTION,
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        )
        return res.choices[0].message.content
    except Exception as e:
        return f"GPT Error: {str(e)}"


async def _get_claude(prompt: str) -> str:
    try:
        res = await asyncio.to_thread(
            anthropic_client.messages.create,
            model="claude-opus-4-5-20251101",
            max_tokens=512,  # hard cap for conciseness
            messages=[
                {
                    "role": "user",
                    "content": f"{CONCISE_INSTRUCTION}\n\n{prompt}",
                }
            ],
        )
        return "".join(
            block.text for block in res.content
            if hasattr(block, "text")
        )
    except Exception as e:
        return f"Claude Error: {str(e)}"


async def _get_deepseek(prompt: str) -> str:
    """
    DeepSeek defaults to verbose Chinese output unless strongly constrained.
    We enforce English + strict brevity here.
    """
    try:
        deepseek_prompt = f"""
You are an AI assistant.

Rules (MANDATORY):
- Respond in English only.
- Be extremely concise.
- Maximum 3 sentences.
- No lists, no examples, no explanations.

User question:
{prompt}
"""
        res = await asyncio.to_thread(
            deepseek_client.chat.completions.create,
            model="deepseek-chat",
            messages=[
                {"role": "user", "content": deepseek_prompt}
            ],
        )
        return res.choices[0].message.content
    except Exception as e:
        return f"DeepSeek Error: {str(e)}"

# ------------------------------------------------------------
# Triplet orchestrator
# ------------------------------------------------------------
async def run_triplet(prompt: str) -> dict:
    """
    Runs GPT + Claude + DeepSeek in parallel,
    then synthesizes a concise verdict using GPT.
    """
    gpt_res, claude_res, deepseek_res = await asyncio.gather(
        _get_gpt(prompt),
        _get_claude(prompt),
        _get_deepseek(prompt),
    )

    verdict_prompt = f"""
You are the Triplet Verdict Engine.

Topic:
{prompt}

GPT Response:
{gpt_res[:800]}

Claude Response:
{claude_res[:800]}

DeepSeek Response:
{deepseek_res[:800]}

Task:
Write a concise 2-sentence consensus verdict.
Sentence 1: shared agreement.
Sentence 2: one unique nuance.
No filler.
"""

    try:
        verdict_res = await asyncio.to_thread(
            openai_client.chat.completions.create,
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You provide concise, professional AI consensus verdicts. "
                        "Maximum 2 sentences. No filler."
                    ),
                },
                {"role": "user", "content": verdict_prompt},
            ],
        )
        verdict = verdict_res.choices[0].message.content
    except Exception as e:
        verdict = f"Verdict Error: {str(e)}"

    return {
        "gpt": gpt_res,
        "claude": claude_res,
        "deepseek": deepseek_res,
        "verdict": verdict,
    }
