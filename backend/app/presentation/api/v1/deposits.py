from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.presentation.api.deps import get_current_user, get_current_admin_user
from app.infrastructure.db.models import User
from app.application.deposit_usecase import (
    submit_deposit_reference, 
    approve_deposit_reference, 
    reject_deposit_reference,
    list_pending_deposits,
    list_user_deposits
)

router = APIRouter(prefix="/deposits", tags=["Deposits"])

class SubmitDepositRequest(BaseModel):
    amount: float
    payment_method: str = "TELEBIRR"
    reference_code: str

class ApproveDepositRequest(BaseModel):
    reference_code: str

class RejectDepositRequest(BaseModel):
    reference_code: str

@router.post("/submit")
async def submit_deposit(
    req: SubmitDepositRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await submit_deposit_reference(
        db, 
        user_id=user.id, 
        amount=req.amount, 
        payment_method=req.payment_method, 
        reference_code=req.reference_code
    )

@router.post("/approve")
async def approve_deposit(
    req: ApproveDepositRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    return await approve_deposit_reference(db, reference_code=req.reference_code)

@router.post("/reject")
async def reject_deposit(
    req: RejectDepositRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    return await reject_deposit_reference(db, reference_code=req.reference_code)

@router.get("/pending")
async def get_pending_deposits(
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    return await list_pending_deposits(db)

@router.get("/my")
async def get_my_deposits(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await list_user_deposits(db, user_id=user.id)


