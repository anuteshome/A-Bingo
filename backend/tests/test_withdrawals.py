import asyncio
import pytest
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.infrastructure.db.models import User, Wallet, WithdrawalTransaction
from app.application.withdrawal_usecase import (
    request_withdrawal,
    approve_withdrawal,
    reject_withdrawal,
    list_user_withdrawals,
    list_pending_withdrawals
)

def test_withdrawal_full_flow():
    async def run_test():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
        async with async_session() as async_db:
            # 1. Create test user with 500 ETB
            user = User(
                telegram_id=987654321,
                username="test_withdrawer",
                first_name="Withdrawer"
            )
            async_db.add(user)
            await async_db.flush()

            wallet = Wallet(user_id=user.id, balance=Decimal("500.00"))
            async_db.add(wallet)
            await async_db.commit()

            # 2. Request withdrawal of 100 ETB
            w_res = await request_withdrawal(
                async_db,
                user_id=user.id,
                amount=100.0,
                payment_method="TELEBIRR",
                account_number="0912345678",
                account_name="Abebe Bikila"
            )

            assert w_res["status"] == "PENDING"
            assert w_res["amount"] == 100.0
            assert w_res["new_balance"] == 400.0  # 500 - 100 held

            w_id = w_res["id"]

            # 3. Check pending list
            pending = await list_pending_withdrawals(async_db)
            assert len(pending) == 1
            assert pending[0]["id"] == w_id

            # 4. Admin approves withdrawal
            app_res = await approve_withdrawal(async_db, withdrawal_id=w_id)
            assert app_res["status"] == "SUCCESS"

            # 5. Check pending list is empty
            pending_after = await list_pending_withdrawals(async_db)
            assert len(pending_after) == 0

            # 6. User withdrawal history
            history = await list_user_withdrawals(async_db, user.id)
            assert len(history) == 1
            assert history[0]["status"] == "COMPLETED"

        await engine.dispose()

    asyncio.run(run_test())


def test_withdrawal_rejection_refund():
    async def run_test():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
        async with async_session() as async_db:
            user = User(telegram_id=555444333, username="refund_user", first_name="RefundTest")
            async_db.add(user)
            await async_db.flush()

            wallet = Wallet(user_id=user.id, balance=Decimal("200.00"))
            async_db.add(wallet)
            await async_db.commit()

            # Request 150 ETB
            w_res = await request_withdrawal(
                async_db,
                user_id=user.id,
                amount=150.0,
                payment_method="CBE_BIRR",
                account_number="1000999888",
                account_name="Kebede Kassaye"
            )
            assert w_res["new_balance"] == 50.0  # 200 - 150

            # Reject withdrawal -> Should refund 150 back to balance (50 + 150 = 200)
            rej_res = await reject_withdrawal(async_db, withdrawal_id=w_res["id"])
            assert rej_res["status"] == "REJECTED"
            assert rej_res["refunded_balance"] == 200.0

        await engine.dispose()

    asyncio.run(run_test())
