"""
Robust Base64 utility functions with comprehensive error handling
"""

import base64
from typing import Optional, Union

def decode_base64(data: Optional[Union[str, bytes]], field_name: str = "data") -> bytes:
    """
    Safely decode base64 data with comprehensive error handling
    
    Args:
        data: Base64 encoded string or bytes (can be None)
        field_name: Name of the field for error messages
        
    Returns:
        Decoded bytes
        
    Raises:
        ValueError: If data is None, empty, or invalid base64
    """
    # Handle None case explicitly - this is the main issue
    if data is None:
        raise ValueError(f"Cannot decode None value for {field_name}")
    
    # Handle empty string case
    if isinstance(data, str):
        if data == "" or data.strip() == "":
            raise ValueError(f"Cannot decode empty string for {field_name}")
        
        # Handle string representations of None
        if data.lower() in ["none", "null", "undefined"]:
            raise ValueError(f"Cannot decode string '{data}' for {field_name}")
    
    # Handle empty bytes case
    if isinstance(data, (bytes, bytearray)):
        if len(data) == 0:
            raise ValueError(f"Cannot decode empty bytes for {field_name}")
        
        # Convert bytes to string if needed
        try:
            data = data.decode('utf-8')
        except UnicodeDecodeError:
            raise ValueError(f"Cannot decode bytes to string for {field_name}")
    
    # Final type check
    if not isinstance(data, str):
        raise ValueError(f"Expected string for {field_name}, got {type(data).__name__}")
    
    # Additional validation for base64 format
    if len(data) % 4 != 0:
        # Add padding if needed
        data += '=' * (4 - len(data) % 4)
    
    try:
        # Use regular base64 decode
        return base64.b64decode(data, validate=True)
    except Exception as e:
        raise ValueError(f"Invalid base64 data for {field_name}: {str(e)}")


def encode_base64(data: Union[str, bytes], field_name: str = "data") -> str:
    """
    Safely encode data to base64 string
    
    Args:
        data: String or bytes to encode
        field_name: Name of the field for error messages
        
    Returns:
        Base64 encoded string
        
    Raises:
        ValueError: If data is None or invalid
    """
    if data is None:
        raise ValueError(f"Cannot encode None value for {field_name}")
    
    if isinstance(data, str):
        data = data.encode('utf-8')
    elif not isinstance(data, (bytes, bytearray)):
        raise ValueError(f"Expected string or bytes for {field_name}, got {type(data).__name__}")
    
    try:
        return base64.b64encode(data).decode('utf-8')
    except Exception as e:
        raise ValueError(f"Failed to encode {field_name}: {str(e)}")


def safe_decode_base64(data: Optional[Union[str, bytes]], field_name: str = "data") -> Optional[bytes]:
    """
    Safely decode base64 data, returning None instead of raising errors
    
    Args:
        data: Base64 encoded string or bytes (can be None)
        field_name: Name of the field for logging
        
    Returns:
        Decoded bytes or None if decoding fails
    """
    try:
        return decode_base64(data, field_name)
    except ValueError:
        # Log the error but don't raise it
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to decode base64 for {field_name}: {data}")
        return None
