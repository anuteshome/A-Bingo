from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.infrastructure.db.models import WithdrawalTransaction, Wallet, User

MIN_WITHDRAWAL_AMOUNT = 50.0

async def request_withdrawal(
    db: AsyncSession,
    user_id: str,
    amount: float,
    payment_method: str,
    account_number: str,
    account_name: str
) -> Dict[str, Any]:
    if amount < MIN_WITHDRAWAL_AMOUNT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum withdrawal amount is {MIN_WITHDRAWAL_AMOUNT:.2f} ETB"
        )

    acc_num_clean = account_number.strip()
    acc_name_clean = account_name.strip()
    if not acc_num_clean or not acc_name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account number and account holder name are required"
        )

    # Check user wallet balance
    stmt_wallet = select(Wallet).where(Wallet.user_id == user_id)
    w_res = await db.execute(stmt_wallet)
    wallet = w_res.scalar_one_or_none()

    dec_amount = Decimal(str(amount))
    if not wallet or Decimal(str(wallet.balance)) < dec_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient wallet balance for this withdrawal request"
        )

    # Immediately hold / deduct balance from user wallet
    wallet.balance = Decimal(str(wallet.balance)) - dec_amount

    # Create pending withdrawal record
    withdrawal = WithdrawalTransaction(
        user_id=user_id,
        amount=dec_amount,
        payment_method=payment_method.upper(),
        account_number=acc_num_clean,
        account_name=acc_name_clean,
        status="PENDING"
    )
    db.add(withdrawal)
    await db.commit()
    await db.refresh(withdrawal)
    await db.refresh(wallet)

    return {
        "id": withdrawal.id,
        "user_id": withdrawal.user_id,
        "amount": float(withdrawal.amount),
        "payment_method": withdrawal.payment_method,
        "account_number": withdrawal.account_number,
        "account_name": withdrawal.account_name,
        "status": withdrawal.status,
        "new_balance": float(wallet.balance),
        "created_at": withdrawal.created_at.isoformat()
    }


async def approve_withdrawal(
    db: AsyncSession,
    withdrawal_id: str
) -> Dict[str, Any]:
    stmt = select(WithdrawalTransaction).where(
        WithdrawalTransaction.id == withdrawal_id
    ).options(selectinload(WithdrawalTransaction.user))

    res = await db.execute(stmt)
    withdrawal = res.scalar_one_or_none()

    if not withdrawal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Withdrawal request '{withdrawal_id}' not found."
        )

    if withdrawal.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Withdrawal request is already {withdrawal.status.lower()}."
        )

    withdrawal.status = "COMPLETED"
    withdrawal.completed_at = datetime.now(timezone.utc)
    await db.commit()

    user_telegram_id = withdrawal.user.telegram_id if withdrawal.user else None

    return {
        "status": "SUCCESS",
        "withdrawal_id": withdrawal.id,
        "amount": float(withdrawal.amount),
        "user_id": withdrawal.user_id,
        "telegram_id": user_telegram_id,
        "account_number": withdrawal.account_number,
        "account_name": withdrawal.account_name,
        "payment_method": withdrawal.payment_method
    }


async def reject_withdrawal(
    db: AsyncSession,
    withdrawal_id: str
) -> Dict[str, Any]:
    stmt = select(WithdrawalTransaction).where(
        WithdrawalTransaction.id == withdrawal_id
    ).options(selectinload(WithdrawalTransaction.user))

    res = await db.execute(stmt)
    withdrawal = res.scalar_one_or_none()

    if not withdrawal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Withdrawal request '{withdrawal_id}' not found."
        )

    if withdrawal.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Withdrawal request is already {withdrawal.status.lower()}."
        )

    withdrawal.status = "REJECTED"
    withdrawal.completed_at = datetime.now(timezone.utc)

    # Automatically refund held balance back to user's wallet
    dec_amount = Decimal(str(withdrawal.amount))
    stmt_wallet = select(Wallet).where(Wallet.user_id == withdrawal.user_id)
    w_res = await db.execute(stmt_wallet)
    wallet = w_res.scalar_one_or_none()

    if wallet:
        wallet.balance = Decimal(str(wallet.balance)) + dec_amount

    await db.commit()

    return {
        "status": "REJECTED",
        "withdrawal_id": withdrawal.id,
        "amount": float(withdrawal.amount),
        "user_id": withdrawal.user_id,
        "refunded_balance": float(wallet.balance) if wallet else None,
        "telegram_id": withdrawal.user.telegram_id if withdrawal.user else None
    }


async def list_pending_withdrawals(db: AsyncSession) -> List[Dict[str, Any]]:
    stmt = select(WithdrawalTransaction).where(
        WithdrawalTransaction.status == "PENDING"
    ).options(selectinload(WithdrawalTransaction.user)).order_by(WithdrawalTransaction.created_at.desc())

    res = await db.execute(stmt)
    withdrawals = res.scalars().all()

    out = []
    for w in withdrawals:
        out.append({
            "id": w.id,
            "user_id": w.user_id,
            "user_name": w.user.first_name if w.user else "Unknown",
            "telegram_id": w.user.telegram_id if w.user else None,
            "phone_number": w.user.phone_number if w.user else None,
            "amount": float(w.amount),
            "payment_method": w.payment_method,
            "account_number": w.account_number,
            "account_name": w.account_name,
            "status": w.status,
            "created_at": w.created_at.isoformat()
        })
    return out


async def list_user_withdrawals(db: AsyncSession, user_id: str) -> List[Dict[str, Any]]:
    stmt = select(WithdrawalTransaction).where(
        WithdrawalTransaction.user_id == user_id
    ).order_by(WithdrawalTransaction.created_at.desc())

    res = await db.execute(stmt)
    withdrawals = res.scalars().all()

    out = []
    for w in withdrawals:
        out.append({
            "id": w.id,
            "user_id": w.user_id,
            "amount": float(w.amount),
            "payment_method": w.payment_method,
            "account_number": w.account_number,
            "account_name": w.account_name,
            "status": w.status,
            "created_at": w.created_at.isoformat(),
            "completed_at": w.completed_at.isoformat() if w.completed_at else None
        })
    return out
