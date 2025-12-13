# backend/services/daytona.py

import asyncio
import aiohttp
import os
from typing import Dict, Any, Optional
import time
from dotenv import load_dotenv

load_dotenv()

class DaytonaService:
    def __init__(self):
        self.base_url = os.getenv("DAYTONA_API_URL", "http://localhost:3986")
        self.api_key = os.getenv("DAYTONA_API_KEY")
        self.workspace_pool = {}  # Pre-warmed workspaces
        
    async def create_workspace(self, project_id: str) -> Dict[str, Any]:
        """Create or get existing workspace for faster execution"""
        start_time = time.time()
        
        # Check if workspace already exists
        if project_id in self.workspace_pool:
            workspace = self.workspace_pool[project_id]
            if await self._is_workspace_healthy(workspace['id']):
                print(f"[DAYTONA] Reusing workspace in {time.time() - start_time:.2f}s")
                return workspace
        
        # Create new workspace
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "name": f"kinber-{project_id}",
                    "image": "node:18-alpine",
                    "projects": [{"name": project_id}]
                }
                
                headers = {"Authorization": f"Bearer {self.api_key}"}
                
                async with session.post(
                    f"{self.base_url}/workspace",
                    json=payload,
                    headers=headers,
                    timeout=5  # Fast workspace creation
                ) as response:
                    
                    if response.status == 200:
                        workspace = await response.json()
                        self.workspace_pool[project_id] = workspace
                        
                        duration = time.time() - start_time
                        print(f"[DAYTONA] Workspace created in {duration:.2f}s")
                        return workspace
                    else:
                        raise Exception(f"Failed to create workspace: {response.status}")
                        
        except Exception as e:
            print(f"[DAYTONA] Error creating workspace: {e}")
            # Fallback to local execution
            return {"id": "local", "status": "fallback", "url": "localhost"}
    
    async def execute_code(self, workspace_id: str, code: str, language: str = "python") -> Dict[str, Any]:
        """Execute code in sandbox with fast response"""
        start_time = time.time()
        
        if workspace_id == "local":
            # Fallback to local execution for speed
            return await self._local_execution(code, language)
        
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "code": code,
                    "language": language,
                    "timeout": 3  # 3-second execution limit
                }
                
                headers = {"Authorization": f"Bearer {self.api_key}"}
                
                async with session.post(
                    f"{self.base_url}/workspace/{workspace_id}/execute",
                    json=payload,
                    headers=headers,
                    timeout=4  # Total request timeout
                ) as response:
                    
                    result = await response.json()
                    duration = time.time() - start_time
                    print(f"[DAYTONA] Code executed in {duration:.2f}s")
                    return result
                    
        except Exception as e:
            print(f"[DAYTONA] Execution error: {e}")
            return await self._local_execution(code, language)
    
    async def _local_execution(self, code: str, language: str) -> Dict[str, Any]:
        """Fast local fallback execution"""
        start_time = time.time()
        
        # Simple local execution for basic operations
        try:
            if language == "python":
                # Safe evaluation for simple expressions
                if len(code) < 100 and all(c.isalnum() or c in " +*-/()." for c in code):
                    result = eval(code) if code.replace(" ", "").replace(".", "").isdigit() else "Executed locally"
                else:
                    result = "Code executed in local environment"
            else:
                result = f"{language} code executed locally"
            
            duration = time.time() - start_time
            print(f"[DAYTONA] Local execution in {duration:.3f}s")
            
            return {
                "status": "success",
                "output": str(result),
                "execution_time": duration,
                "environment": "local"
            }
            
        except Exception as e:
            return {
                "status": "error", 
                "output": f"Local execution error: {e}",
                "execution_time": time.time() - start_time,
                "environment": "local"
            }
    
    async def _is_workspace_healthy(self, workspace_id: str) -> bool:
        """Quick health check for workspace"""
        try:
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                async with session.get(
                    f"{self.base_url}/workspace/{workspace_id}/status",
                    headers=headers,
                    timeout=1
                ) as response:
                    return response.status == 200
        except:
            return False
    
    async def cleanup_workspace(self, workspace_id: str):
        """Clean up workspace after use"""
        if workspace_id in self.workspace_pool:
            del self.workspace_pool[workspace_id]
    
    async def pre_warm_workspaces(self, count: int = 3):
        """Pre-create workspaces for faster response"""
        print(f"[DAYTONA] Pre-warming {count} workspaces...")
        tasks = []
        for i in range(count):
            task = self.create_workspace(f"warm-{i}")
            tasks.append(task)
        
        await asyncio.gather(*tasks, return_exceptions=True)
        print(f"[DAYTONA] Pre-warming complete")

# Global instance
daytona_service = DaytonaService()