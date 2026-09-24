import asyncio
import pytest
from decimal import Decimal
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.infrastructure.db.models import User, Wallet, DepositTransaction
from app.application.deposit_usecase import (
    submit_deposit_reference,
    approve_deposit_reference,
    list_user_deposits,
    list_pending_deposits
)

def test_deposit_end_to_end_flow():
    async def run_test():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
        async with async_session() as async_db:
            # 1. Create test user
            user = User(
                telegram_id=999888777,
                username="test_depositor",
                first_name="Test"
            )
            async_db.add(user)
            await async_db.flush()

            # Create initial wallet
            wallet = Wallet(user_id=user.id, balance=Decimal("500.00"))
            async_db.add(wallet)
            await async_db.commit()

            # 2. Submit deposit with lowercase reference code
            sub_res = await submit_deposit_reference(
                async_db,
                user_id=user.id,
                amount=150.00,
                payment_method="telebirr",
                reference_code="  ft2409191234  "
            )

            assert sub_res["status"] == "PENDING"
            assert sub_res["reference_code"] == "FT2409191234"
            assert sub_res["amount"] == 150.00

            # 3. Check pending deposits list
            pending = await list_pending_deposits(async_db)
            assert len(pending) == 1
            assert pending[0]["reference_code"] == "FT2409191234"

            # 4. Check user deposit history
            user_deps = await list_user_deposits(async_db, user.id)
            assert len(user_deps) == 1
            assert user_deps[0]["status"] == "PENDING"

            # 5. Approve deposit reference
            app_res = await approve_deposit_reference(async_db, reference_code="ft2409191234")
            assert app_res["status"] == "SUCCESS"
            assert app_res["new_balance"] == 650.00  # 500 + 150

            # 6. Verify pending list is now empty and user history is COMPLETED
            pending_after = await list_pending_deposits(async_db)
            assert len(pending_after) == 0

            user_deps_after = await list_user_deposits(async_db, user.id)
            assert user_deps_after[0]["status"] == "COMPLETED"

        await engine.dispose()

    asyncio.run(run_test())


def test_reject_deposit_flow():
    async def run_test():
        engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
        async with async_session() as async_db:
            from app.application.deposit_usecase import reject_deposit_reference

            user = User(telegram_id=111222333, username="reject_user", first_name="RejectTest")
            async_db.add(user)
            await async_db.flush()

            await submit_deposit_reference(
                async_db,
                user_id=user.id,
                amount=50.00,
                payment_method="cbe_birr",
                reference_code="REJ12345"
            )

            rej_res = await reject_deposit_reference(async_db, reference_code="REJ12345")
            assert rej_res["status"] == "REJECTED"
            assert rej_res["reference_code"] == "REJ12345"

            pending = await list_pending_deposits(async_db)
            assert len(pending) == 0

        await engine.dispose()

    asyncio.run(run_test())

