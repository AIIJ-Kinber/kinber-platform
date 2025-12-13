# backend/services/youtube_search.py

import os
import requests

SERPER_API_KEY = os.getenv("SERPER_API_KEY")

# Dedicated YouTube / Video Search endpoint
API_URL = "https://google.serper.dev/videos"


def youtube_search(query: str, max_results: int = 10):
    """
    Perform a YouTube-focused video search using Serper.dev's video API.
    """

    if not SERPER_API_KEY:
        raise ValueError("SERPER_API_KEY is missing. Add it to backend/.env")

    headers = {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
    }

    payload = {
        "q": query,
        "num": max_results
    }

    response = requests.post(API_URL, json=payload, headers=headers)
    response.raise_for_status()

    data = response.json()

    # Serper "videos" endpoint returns a "videos" list
    video_items = data.get("videos", [])

    results = []
    for item in video_items:
        results.append({
            "title": item.get("title"),
            "url": item.get("link"),
            "snippet": item.get("snippet"),
            "channel": item.get("channel"),
            "platform": "YouTube",
        })

    return {
        "query": query,
        "max_results": max_results,
        "result_count": len(results),
        "results": results,
    }
