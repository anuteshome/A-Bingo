import random
import asyncio
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.infrastructure.db.models import User, Round, Card, CardPurchase, Wallet
from app.infrastructure.redis.pubsub import publish_round_event
from app.application.game_loop_usecase import run_round_game_loop, ACTIVE_ROUND_TASKS

BOT_PROFILES = [
    {"telegram_id": 90001, "username": "kebede_bot", "first_name": "Kebede (Bot)"},
    {"telegram_id": 90002, "username": "abebe_bot", "first_name": "Abebe (Bot)"},
    {"telegram_id": 90003, "username": "tigist_bot", "first_name": "Tigist (Bot)"},
    {"telegram_id": 90004, "username": "dawit_bot", "first_name": "Dawit (Bot)"},
    {"telegram_id": 90005, "username": "bethel_bot", "first_name": "Bethel (Bot)"},
    {"telegram_id": 90006, "username": "mulugeta_bot", "first_name": "Mulugeta (Bot)"},
    {"telegram_id": 90007, "username": "haile_bot", "first_name": "Haile (Bot)"},
    {"telegram_id": 90008, "username": "aster_bot", "first_name": "Aster (Bot)"},
    {"telegram_id": 90009, "username": "solomon_bot", "first_name": "Solomon (Bot)"},
    {"telegram_id": 90010, "username": "yared_bot", "first_name": "Yared (Bot)"},
]

async def ensure_bot_users(db: AsyncSession) -> List[User]:
    bot_users = []
    for prof in BOT_PROFILES:
        stmt = select(User).where(User.telegram_id == prof["telegram_id"])
        res = await db.execute(stmt)
        u = res.scalar_one_or_none()
        if not u:
            u = User(
                telegram_id=prof["telegram_id"],
                username=prof["username"],
                first_name=prof["first_name"]
            )
            db.add(u)
            await db.flush()
            w = Wallet(user_id=u.id, balance=1000.00)
            db.add(w)
        bot_users.append(u)
    await db.commit()
    return bot_users

async def auto_populate_bots_and_start_round(db: AsyncSession, round_id: str, bot_count: int = 5):
    """
    Populates round with AI bot players to raise prize pool & auto-starts game loop!
    """
    round_obj = await db.get(Round, round_id)
    if not round_obj:
        return

    bot_users = await ensure_bot_users(db)
    
    # Get taken card IDs
    stmt_p = select(CardPurchase.card_id).where(CardPurchase.round_id == round_id)
    p_res = await db.execute(stmt_p)
    taken_ids = set(p_res.scalars().all())

    # Get available cards
    stmt_cards = select(Card).where(Card.id.not_in(taken_ids)).limit(50)
    c_res = await db.execute(stmt_cards)
    available_cards = c_res.scalars().all()

    if not available_cards:
        return

    random.shuffle(available_cards)
    random.shuffle(bot_users)

    num_to_add = min(bot_count, len(available_cards), len(bot_users))
    for i in range(num_to_add):
        bot_u = bot_users[i]
        card = available_cards[i]

        purchase = CardPurchase(
            round_id=round_id,
            card_id=card.id,
            user_id=bot_u.id,
            price_paid=round_obj.card_price
        )
        db.add(purchase)
        round_obj.prize_pool += round_obj.card_price

        # Broadcast WS event
        await publish_round_event(round_id, "CARD_RESERVED", {
            "card_number": card.card_number,
            "status": "LOCKED",
            "bot_name": bot_u.first_name
        })

    await db.commit()

    # Automatically start game loop background task if not running
    if round_id not in ACTIVE_ROUND_TASKS or ACTIVE_ROUND_TASKS[round_id].done():
        task = asyncio.create_task(run_round_game_loop(round_id))
        ACTIVE_ROUND_TASKS[round_id] = task
