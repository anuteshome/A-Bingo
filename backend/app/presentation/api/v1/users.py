from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.presentation.api.deps import get_current_user
from app.infrastructure.db.models import User, Wallet
from sqlalchemy.future import select

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "telegram_id": user.telegram_id,
        "username": user.username,
        "first_name": user.first_name,
        "status": user.status,
        "created_at": user.created_at.isoformat()
    }
