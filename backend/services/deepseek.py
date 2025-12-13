# backend/services/deepseek.py

import os
from dotenv import load_dotenv
from openai import OpenAI
import time

# Load environment variables
load_dotenv()

# Configure API client
deepseek_key = os.getenv("DEEPSEEK_API_KEY")
if not deepseek_key:
    print("⚠️  WARNING: DEEPSEEK_API_KEY not found in environment")

# Optimized client configuration for best performance
client = OpenAI(
    api_key=deepseek_key,
    base_url="https://api.deepseek.com",
    timeout=15.0,  # Increased for R1-0528 reasoning
    max_retries=1   # Allow one retry for reliability
)

async def generate_response(message: str, instructions: str = None) -> str:
    """
    Generate AI response using DeepSeek-R1-0528 model
    Optimized for best balance of speed and reasoning quality
    """
    start_time = time.time()
    
    try:
        # Enhanced system prompt for better responses
        system_prompt = "You are Kinber, a helpful AI assistant. Be accurate, clear, and concise."
        
        # Use instructions if provided
        if instructions:
            system_prompt += f" {instructions}"
            
        print(f"🔍 DEEPSEEK: Using model: deepseek-r1-0528")
        print(f"🔍 DEEPSEEK: Processing message: {message[:50]}...")
        
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            max_tokens=500,        # Increased for better responses
            temperature=0.6,       # Optimal for R1-0528
            stream=False,
            timeout=15
        )
        
        # Extract response content
        full_response = response.choices[0].message.content
        
        # Performance logging
        end_time = time.time()
        duration = end_time - start_time
        print(f"✅ DEEPSEEK: Response generated in {duration:.2f}s")
        
        return full_response
        
    except Exception as e:
        end_time = time.time()
        duration = end_time - start_time
        print(f"❌ DEEPSEEK ERROR after {duration:.2f}s: {e}")
        
        # Fallback response
        return "I'm having trouble processing your request right now. Please try again in a moment."

async def test_connection() -> bool:
    """Test DeepSeek API connectivity"""
    try:
        print("🔄 Testing DeepSeek API connection...")
        
        start_time = time.time()
        response = client.chat.completions.create(
            model="deepseek-r1-0528",
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=50,
            temperature=0.6,
            timeout=10
        )
        
        content = response.choices[0].message.content
        duration = time.time() - start_time
        
        print(f"✅ DeepSeek connection successful in {duration:.2f}s")
        print(f"📝 Test response: {content}")
        return True
        
    except Exception as e:
        print(f"❌ DeepSeek connection failed: {e}")
        return False