import os
import requests

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

def web_search(query: str, max_results: int = 5):
    if not TAVILY_API_KEY:
        return {"error": "TAVILY_API_KEY missing"}

    url = "https://api.tavily.com/search"
    payload = {
        "api_key": TAVILY_API_KEY,
        "query": query,
        "max_results": max_results,
    }

    try:
        r = requests.post(url, json=payload)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return {"error": str(e)}
