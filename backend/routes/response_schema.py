from pydantic import BaseModel
from typing import Any

class KinberResponse(BaseModel):
    status: str
    data: Any = None
    message: str = ""
