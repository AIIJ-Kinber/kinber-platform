# backend/services/local_executor.py

import asyncio
import time
import subprocess
import tempfile
import os
from typing import Dict, Any, Optional
import json

class LocalExecutor:
    """Fast local execution fallback for immediate 2-3s responses"""
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="kinber_")
        print(f"[LOCAL_EXECUTOR] Initialized with temp dir: {self.temp_dir}")
    
    async def create_workspace(self, project_id: str) -> Dict[str, Any]:
        """Create local workspace instantly"""
        start_time = time.time()
        
        workspace_path = os.path.join(self.temp_dir, f"workspace_{project_id}")
        os.makedirs(workspace_path, exist_ok=True)
        
        workspace = {
            "id": f"local_{project_id}",
            "path": workspace_path,
            "status": "ready",
            "type": "local"
        }
        
        duration = time.time() - start_time
        print(f"[LOCAL_EXECUTOR] Workspace created in {duration:.3f}s")
        return workspace
    
    async def execute_code(self, workspace_id: str, code: str, language: str = "python") -> Dict[str, Any]:
        """Execute code locally with safety checks"""
        start_time = time.time()
        
        try:
            if language == "python":
                result = await self._execute_python(code)
            elif language == "javascript":
                result = await self._execute_javascript(code)
            elif language == "bash":
                result = await self._execute_bash(code)
            else:
                result = {"error": f"Language {language} not supported locally"}
            
            duration = time.time() - start_time
            print(f"[LOCAL_EXECUTOR] Code executed in {duration:.3f}s")
            
            return {
                "status": "success" if "error" not in result else "error",
                "output": result.get("output", ""),
                "error": result.get("error", ""),
                "execution_time": duration,
                "environment": "local"
            }
            
        except Exception as e:
            duration = time.time() - start_time
            return {
                "status": "error",
                "output": "",
                "error": str(e),
                "execution_time": duration,
                "environment": "local"
            }
    
    async def _execute_python(self, code: str) -> Dict[str, Any]:
        """Execute Python code safely"""
        # Basic safety checks
        if any(dangerous in code.lower() for dangerous in ['import os', 'subprocess', 'open(', '__import__']):
            return {"error": "Potentially unsafe code detected"}
        
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            # Execute with timeout
            process = await asyncio.create_subprocess_exec(
                'python', temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=3.0)
                
                if process.returncode == 0:
                    return {"output": stdout.decode('utf-8')}
                else:
                    return {"error": stderr.decode('utf-8')}
                    
            except asyncio.TimeoutError:
                process.kill()
                return {"error": "Code execution timed out (3s limit)"}
            
            finally:
                # Cleanup temp file
                os.unlink(temp_file)
                
        except Exception as e:
            return {"error": f"Execution failed: {str(e)}"}
    
    async def _execute_javascript(self, code: str) -> Dict[str, Any]:
        """Execute JavaScript code using Node.js"""
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            process = await asyncio.create_subprocess_exec(
                'node', temp_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=3.0)
                
                if process.returncode == 0:
                    return {"output": stdout.decode('utf-8')}
                else:
                    return {"error": stderr.decode('utf-8')}
                    
            except asyncio.TimeoutError:
                process.kill()
                return {"error": "JavaScript execution timed out"}
            
            finally:
                os.unlink(temp_file)
                
        except Exception as e:
            return {"error": f"JavaScript execution failed: {str(e)}"}
    
    async def _execute_bash(self, code: str) -> Dict[str, Any]:
        """Execute bash commands safely"""
        # Basic safety checks
        dangerous_commands = ['rm -rf', 'dd if=', 'mkfs', 'fdisk', 'format']
        if any(cmd in code.lower() for cmd in dangerous_commands):
            return {"error": "Potentially dangerous command detected"}
        
        try:
            process = await asyncio.create_subprocess_shell(
                code,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.temp_dir
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=3.0)
                
                if process.returncode == 0:
                    return {"output": stdout.decode('utf-8')}
                else:
                    return {"error": stderr.decode('utf-8')}
                    
            except asyncio.TimeoutError:
                process.kill()
                return {"error": "Command execution timed out"}
                
        except Exception as e:
            return {"error": f"Command execution failed: {str(e)}"}
    
    async def cleanup_workspace(self, workspace_id: str):
        """Clean up workspace files"""
        try:
            workspace_path = os.path.join(self.temp_dir, f"workspace_{workspace_id.replace('local_', '')}")
            if os.path.exists(workspace_path):
                import shutil
                shutil.rmtree(workspace_path)
                print(f"[LOCAL_EXECUTOR] Cleaned up workspace: {workspace_id}")
        except Exception as e:
            print(f"[LOCAL_EXECUTOR] Cleanup error: {e}")
    
    def __del__(self):
        """Cleanup on destruction"""
        try:
            import shutil
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
        except:
            pass

# Global instance
local_executor = LocalExecutor()