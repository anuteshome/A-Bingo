import hmac
import hashlib
from urllib.parse import parse_qsl, unquote
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from fastapi import HTTPException, status
from app.core.config import settings

def verify_telegram_init_data(init_data_raw: str, bot_token: str) -> Dict[str, Any]:
    """
    Validates Telegram WebApp initData query string cryptographically using HMAC-SHA256.
    Returns parsed dictionary containing user data if valid.
    """
    if not init_data_raw:
        raise ValueError("Missing initData string")

    # If dev/mock mode and token matches mock prefix, allow dev bypass for testing UI
    if settings.ENVIRONMENT == "development" and init_data_raw.startswith("dev_user_"):
        telegram_id = int(init_data_raw.split("dev_user_")[1])
        return {
            "id": telegram_id,
            "first_name": f"Player_{telegram_id}",
            "username": f"user_{telegram_id}"
        }

    parsed_data = dict(parse_qsl(init_data_raw, keep_blank_values=True))
    received_hash = parsed_data.pop("hash", None)
    if not received_hash:
        raise ValueError("Missing hash in initData")

    # Sort remaining parameters lexicographically
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))

    # Secret key calculation
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()

    # Computed HMAC hash calculation
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise ValueError("Invalid Telegram cryptographic signature")

    import json
    user_dict = {}
    if "user" in parsed_data:
        user_dict = json.loads(parsed_data["user"])

    return user_dict or parsed_data


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token signature has expired"
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token credential"
        )
