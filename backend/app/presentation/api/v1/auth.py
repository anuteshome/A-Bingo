from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.application.auth_usecase import authenticate_telegram_user, authenticate_contact_user, claim_admin_rights
from app.presentation.api.deps import get_current_user
from app.infrastructure.db.models import User

router = APIRouter(prefix="/auth", tags=["Auth"])

class TelegramAuthRequest(BaseModel):
    init_data: str

class ContactAuthRequest(BaseModel):
    phone_number: str
    telegram_id: int
    first_name: str
    username: str = ""

class ClaimAdminRequest(BaseModel):
    admin_secret: str

@router.post("/telegram")
async def telegram_auth(req: TelegramAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        res = await authenticate_telegram_user(db, req.init_data)
        return res
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@router.post("/contact")
async def contact_auth(req: ContactAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        res = await authenticate_contact_user(
            db, 
            phone_number=req.phone_number, 
            telegram_id=req.telegram_id, 
            first_name=req.first_name, 
            username=req.username
        )
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/claim-admin")
async def claim_admin(
    req: ClaimAdminRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        return await claim_admin_rights(db, user.id, req.admin_secret)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


