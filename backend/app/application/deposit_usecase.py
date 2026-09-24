from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.infrastructure.db.models import DepositTransaction, Wallet, User

async def submit_deposit_reference(
    db: AsyncSession,
    user_id: str,
    amount: float,
    payment_method: str,
    reference_code: str
) -> Dict[str, Any]:
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Deposit amount must be greater than 0")

    ref_clean = reference_code.strip().upper()
    if not ref_clean:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reference code cannot be empty")
    
    # Check if reference code already exists
    stmt_check = select(DepositTransaction).where(DepositTransaction.reference_code == ref_clean)
    res_check = await db.execute(stmt_check)
    if res_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail=f"Reference code '{ref_clean}' has already been submitted or processed."
        )

    deposit = DepositTransaction(
        user_id=user_id,
        amount=Decimal(str(amount)),
        payment_method=payment_method.upper(),
        reference_code=ref_clean,
        status="PENDING"
    )
    db.add(deposit)
    await db.commit()
    await db.refresh(deposit)

    return {
        "id": deposit.id,
        "user_id": deposit.user_id,
        "amount": float(deposit.amount),
        "payment_method": deposit.payment_method,
        "reference_code": deposit.reference_code,
        "status": deposit.status,
        "created_at": deposit.created_at.isoformat()
    }


async def approve_deposit_reference(
    db: AsyncSession,
    reference_code: str
) -> Dict[str, Any]:
    ref_clean = reference_code.strip().upper()
    stmt = select(DepositTransaction).where(
        DepositTransaction.reference_code == ref_clean
    ).options(selectinload(DepositTransaction.user))
    
    res = await db.execute(stmt)
    deposit = res.scalar_one_or_none()
    
    if not deposit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Deposit with reference code '{ref_clean}' not found."
        )

    if deposit.status == "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Deposit '{ref_clean}' is already completed."
        )

    # Mark completed
    deposit.status = "COMPLETED"
    deposit.completed_at = datetime.now(timezone.utc)

    # Credit wallet
    dec_amount = Decimal(str(deposit.amount))
    stmt_wallet = select(Wallet).where(Wallet.user_id == deposit.user_id)
    w_res = await db.execute(stmt_wallet)
    wallet = w_res.scalar_one_or_none()
    
    if not wallet:
        wallet = Wallet(user_id=deposit.user_id, balance=dec_amount)
        db.add(wallet)
    else:
        wallet.balance = Decimal(str(wallet.balance)) + dec_amount

    await db.commit()
    await db.refresh(wallet)

    user_telegram_id = deposit.user.telegram_id if deposit.user else None

    return {
        "status": "SUCCESS",
        "deposit_id": deposit.id,
        "reference_code": deposit.reference_code,
        "amount": float(deposit.amount),
        "user_id": deposit.user_id,
        "telegram_id": user_telegram_id,
        "new_balance": float(wallet.balance)
    }


async def reject_deposit_reference(
    db: AsyncSession,
    reference_code: str
) -> Dict[str, Any]:
    ref_clean = reference_code.strip().upper()
    stmt = select(DepositTransaction).where(
        DepositTransaction.reference_code == ref_clean
    ).options(selectinload(DepositTransaction.user))
    
    res = await db.execute(stmt)
    deposit = res.scalar_one_or_none()
    
    if not deposit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Deposit with reference code '{ref_clean}' not found."
        )

    if deposit.status == "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Deposit '{ref_clean}' is already completed and cannot be rejected."
        )

    deposit.status = "REJECTED"
    deposit.completed_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "status": "REJECTED",
        "deposit_id": deposit.id,
        "reference_code": deposit.reference_code,
        "amount": float(deposit.amount),
        "user_id": deposit.user_id,
        "telegram_id": deposit.user.telegram_id if deposit.user else None
    }


async def list_pending_deposits(db: AsyncSession) -> List[Dict[str, Any]]:
    stmt = select(DepositTransaction).where(
        DepositTransaction.status == "PENDING"
    ).options(selectinload(DepositTransaction.user)).order_by(DepositTransaction.created_at.desc())
    
    res = await db.execute(stmt)
    deposits = res.scalars().all()

    out = []
    for d in deposits:
        out.append({
            "id": d.id,
            "user_id": d.user_id,
            "user_name": d.user.first_name if d.user else "Unknown",
            "telegram_id": d.user.telegram_id if d.user else None,
            "phone_number": d.user.phone_number if d.user else None,
            "amount": float(d.amount),
            "payment_method": d.payment_method,
            "reference_code": d.reference_code,
            "status": d.status,
            "created_at": d.created_at.isoformat()
        })
    return out


async def list_user_deposits(db: AsyncSession, user_id: str) -> List[Dict[str, Any]]:
    stmt = select(DepositTransaction).where(
        DepositTransaction.user_id == user_id
    ).order_by(DepositTransaction.created_at.desc())
    
    res = await db.execute(stmt)
    deposits = res.scalars().all()

    out = []
    for d in deposits:
        out.append({
            "id": d.id,
            "user_id": d.user_id,
            "amount": float(d.amount),
            "payment_method": d.payment_method,
            "reference_code": d.reference_code,
            "status": d.status,
            "created_at": d.created_at.isoformat(),
            "completed_at": d.completed_at.isoformat() if d.completed_at else None
        })
    return out

