import os
import requests
from dotenv import load_dotenv

# Load backend/.env
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=os.path.abspath(env_path))

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

if not TAVILY_API_KEY:
    print("⚠️ WARNING: TAVILY_API_KEY not found in backend/.env")
else:
    print("🔎 Tavily API Key loaded successfully.")


def tavily_search(query: str, max_results: int = 10) -> dict:
    """
    Perform a real web search using Tavily Search API.
    Returns structured JSON data that can be sent back to Gemini.
    """

    if not TAVILY_API_KEY:
        return {"error": "TAVILY_API_KEY is missing"}

    url = "https://api.tavily.com/search"

    payload = {
        "api_key": TAVILY_API_KEY,
        "query": query,
        "max_results": max_results,
    }

    try:
        response = requests.post(url, json=payload, timeout=20)

        if response.status_code != 200:
            return {"error": f"Tavily returned {response.status_code}"}

        data = response.json()

        # Clean result for Gemini tool_result
        clean_results = []

        for item in data.get("results", []):
            clean_results.append({
                "title": item.get("title"),
                "url": item.get("url"),
                "content": item.get("content"),
            })

        return {
            "query": query,
            "results": clean_results[:max_results]
        }

    except Exception as e:
        return {"error": f"Tavily search failed: {str(e)}"}
