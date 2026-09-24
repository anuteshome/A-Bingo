from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.infrastructure.db.models import User, Wallet
from app.core.security import verify_telegram_init_data, create_access_token
from app.core.config import settings

async def authenticate_telegram_user(db: AsyncSession, init_data: str) -> dict:
    tg_user_data = verify_telegram_init_data(init_data, settings.BOT_TOKEN)
    telegram_id = int(tg_user_data.get("id"))
    username = tg_user_data.get("username", "")
    first_name = tg_user_data.get("first_name", "")

    # Check if user exists
    stmt = select(User).where(User.telegram_id == telegram_id)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        # Create user
        user = User(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name
        )
        db.add(user)
        await db.flush()

        # Create wallet with initial balance of 20 ETB
        wallet = Wallet(user_id=user.id, balance=20.00)
        db.add(wallet)
        await db.commit()
        await db.refresh(user)
    else:
        # Update username/first_name if changed
        if user.username != username or user.first_name != first_name:
            user.username = username
            user.first_name = first_name
            await db.commit()

    token_payload = {
        "sub": user.id,
        "telegram_id": user.telegram_id,
        "first_name": user.first_name
    }
    access_token = create_access_token(token_payload)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "telegram_id": user.telegram_id,
            "username": user.username,
            "first_name": user.first_name,
            "phone_number": user.phone_number,
            "is_admin": user.is_admin
        }
    }

async def authenticate_contact_user(
    db: AsyncSession, 
    phone_number: str, 
    telegram_id: int, 
    first_name: str, 
    username: str = ""
) -> dict:
    # Check by telegram_id or phone_number
    stmt = select(User).where((User.telegram_id == telegram_id) | (User.phone_number == phone_number))
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        user = User(
            telegram_id=telegram_id,
            phone_number=phone_number,
            username=username,
            first_name=first_name,
            is_bot=False
        )
        db.add(user)
        await db.flush()

        wallet = Wallet(user_id=user.id, balance=20.00)
        db.add(wallet)
        await db.commit()
        await db.refresh(user)
    else:
        user.phone_number = phone_number
        if first_name:
            user.first_name = first_name
        if username:
            user.username = username
        await db.commit()

    token_payload = {
        "sub": user.id,
        "telegram_id": user.telegram_id,
        "phone_number": user.phone_number,
        "first_name": user.first_name
    }
    access_token = create_access_token(token_payload)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "telegram_id": user.telegram_id,
            "phone_number": user.phone_number,
            "username": user.username,
            "first_name": user.first_name,
            "is_admin": user.is_admin
        }
    }

async def claim_admin_rights(db: AsyncSession, user_id: str, admin_secret: str) -> dict:
    if admin_secret.strip() != settings.ADMIN_SECRET:
        raise ValueError("Invalid admin secret key")
    
    user = await db.get(User, user_id)
    if not user:
        raise ValueError("User not found")
    
    user.is_admin = True
    await db.commit()
    return {
        "status": "SUCCESS",
        "is_admin": True,
        "message": "Admin privileges granted successfully"
    }


