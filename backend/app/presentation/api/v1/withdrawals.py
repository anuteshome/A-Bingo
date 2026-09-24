from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.presentation.api.deps import get_current_user, get_current_admin_user
from app.infrastructure.db.models import User
from app.application.withdrawal_usecase import (
    request_withdrawal,
    approve_withdrawal,
    reject_withdrawal,
    list_pending_withdrawals,
    list_user_withdrawals
)

router = APIRouter(prefix="/withdrawals", tags=["Withdrawals"])

class RequestWithdrawalRequest(BaseModel):
    amount: float
    payment_method: str = "TELEBIRR"
    account_number: str
    account_name: str

class ApproveWithdrawalRequest(BaseModel):
    withdrawal_id: str

class RejectWithdrawalRequest(BaseModel):
    withdrawal_id: str

@router.post("/request")
async def create_withdrawal_request(
    req: RequestWithdrawalRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await request_withdrawal(
        db,
        user_id=user.id,
        amount=req.amount,
        payment_method=req.payment_method,
        account_number=req.account_number,
        account_name=req.account_name
    )

@router.get("/my")
async def get_my_withdrawals(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await list_user_withdrawals(db, user_id=user.id)

@router.get("/pending")
async def get_pending_withdrawals(
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    return await list_pending_withdrawals(db)

@router.post("/approve")
async def approve_user_withdrawal(
    req: ApproveWithdrawalRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    return await approve_withdrawal(db, withdrawal_id=req.withdrawal_id)

@router.post("/reject")
async def reject_user_withdrawal(
    req: RejectWithdrawalRequest,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    return await reject_withdrawal(db, withdrawal_id=req.withdrawal_id)
