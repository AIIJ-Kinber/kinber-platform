# backend/core/agents/info_tasks.py

import os
from openai import AsyncOpenAI


# ---------------------------------------------------------
# 🔐 Lazy OpenAI Client (SAFE)
# ---------------------------------------------------------
def get_openai_client() -> AsyncOpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. "
            "Set it in Railway / local environment variables."
        )
    return AsyncOpenAI(api_key=api_key)


# ---------------------------------------------------------
# 🔍 Search the web (placeholder – extend later)
# ---------------------------------------------------------
async def search_web(query: str):
    return f"Search results for: {query}"


# ---------------------------------------------------------
# 🧠 Summarize text
# ---------------------------------------------------------
async def summarize_text(text: str, max_words: int = 200):
    client = get_openai_client()

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Summarize the following text clearly."},
            {"role": "user", "content": text},
        ],
        max_tokens=max_words,
    )

    return response.choices[0].message.content


# ---------------------------------------------------------
# 🧾 Extract key points
# ---------------------------------------------------------
async def extract_key_points(text: str):
    client = get_openai_client()

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Extract key insights from the following text."},
            {"role": "user", "content": text},
        ],
    )

    return response.choices[0].message.content


# ---------------------------------------------------------
# 🌐 Translate text
# ---------------------------------------------------------
async def translate_text(text: str, target_lang: str):
    client = get_openai_client()

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": f"Translate this text into {target_lang}.",
            },
            {"role": "user", "content": text},
        ],
    )

    return response.choices[0].message.content


# ---------------------------------------------------------
# ✍️ Rewrite text
# ---------------------------------------------------------
async def rewrite_text(text: str, style: str = "simple"):
    client = get_openai_client()

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": f"Rewrite this text in a {style} style.",
            },
            {"role": "user", "content": text},
        ],
    )

    return response.choices[0].message.content
