from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.config import settings
from app.infrastructure.db.models import User, Wallet

security_bearer = HTTPBearer(auto_error=False)

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db)
) -> User:
    user_id = None
    if credentials and credentials.credentials:
        try:
            payload = decode_access_token(credentials.credentials)
            user_id = payload.get("sub")
        except Exception:
            pass

    if user_id:
        user = await db.get(User, user_id)
        if user:
            return user

    # Development / Testing fallback for seamless testing in browser
    if settings.ENVIRONMENT == "development":
        stmt = select(User).where(User.telegram_id == 12345678)
        res = await db.execute(stmt)
        dev_user = res.scalar_one_or_none()
        if not dev_user:
            dev_user = User(telegram_id=12345678, username="demo_player", first_name="Demo Player")
            db.add(dev_user)
            await db.flush()
            wallet = Wallet(user_id=dev_user.id, balance=20.00)
            db.add(wallet)
            await db.commit()
            await db.refresh(dev_user)
        return dev_user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing or invalid authentication credentials"
    )


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to access this resource"
        )
    return current_user

