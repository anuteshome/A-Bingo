from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.presentation.api.deps import get_current_user
from app.infrastructure.db.models import User, Wallet

router = APIRouter(prefix="/wallet", tags=["Wallet"])

@router.get("/balance")
async def get_balance(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Wallet).where(Wallet.user_id == user.id)
    res = await db.execute(stmt)
    wallet = res.scalar_one_or_none()
    if not wallet:
        return {"balance": 0.00, "currency": "ETB"}
    return {
        "balance": float(wallet.balance),
        "currency": "ETB"
    }

@router.post("/deposit")
async def deposit_demo_funds(
    amount: float = 100.00,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Deposit amount must be greater than 0")

    dec_amount = Decimal(str(amount))
    stmt = select(Wallet).where(Wallet.user_id == user.id)
    res = await db.execute(stmt)
    wallet = res.scalar_one_or_none()
    if not wallet:
        wallet = Wallet(user_id=user.id, balance=dec_amount)
        db.add(wallet)
    else:
        wallet.balance = Decimal(str(wallet.balance)) + dec_amount
    await db.commit()
    await db.refresh(wallet)
    return {"balance": float(wallet.balance), "currency": "ETB"}

