from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from app.infrastructure.db.models import Card, CardPurchase, Round, Wallet, User
from app.infrastructure.redis.lock_manager import acquire_card_lock
from app.infrastructure.redis.pubsub import publish_round_event
from app.core.config import settings

async def get_round_cards(
    db: AsyncSession,
    round_id: str,
    page: int = 1,
    limit: int = 50,
    search_number: int = None
) -> Dict[str, Any]:
    # Fetch taken card IDs in this round
    stmt_purchases = select(CardPurchase.card_id).where(CardPurchase.round_id == round_id)
    purchases_res = await db.execute(stmt_purchases)
    taken_card_ids = set(purchases_res.scalars().all())

    # Build query
    query = select(Card)
    if search_number is not None:
        query = query.where(Card.card_number == search_number)
    
    query = query.order_by(Card.card_number.asc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(query)
    cards = res.scalars().all()

    # Get total count
    count_query = select(Card)
    if search_number is not None:
        count_query = count_query.where(Card.card_number == search_number)
    count_res = await db.execute(count_query)
    total_count = len(count_res.scalars().all())

    cards_out = []
    for c in cards:
        cards_out.append({
            "card_id": c.id,
            "card_number": c.card_number,
            "status": "LOCKED" if c.id in taken_card_ids else "AVAILABLE",
            "grid_matrix": c.grid_matrix
        })

    return {
        "round_id": round_id,
        "page": page,
        "limit": limit,
        "total_cards": total_count,
        "cards": cards_out
    }


async def purchase_card(
    db: AsyncSession,
    user_id: str,
    round_id: str,
    card_number: int
) -> Dict[str, Any]:
    # 1. Acquire Redis distributed lock for round + card_number
    try:
        async with acquire_card_lock(round_id, card_number, ttl=3):
            # Check round state
            round_obj = await db.get(Round, round_id)
            if not round_obj:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Round not found")

            # Check if round status allows buying. If PLAYING/FINISHED, check if zero cards were bought
            if round_obj.status not in ["WAITING", "COUNTDOWN"]:
                stmt_purchased_count = select(CardPurchase).where(CardPurchase.round_id == round_id)
                p_res = await db.execute(stmt_purchased_count)
                bought_count = len(p_res.scalars().all())

                if bought_count == 0 or settings.ENVIRONMENT == "development":
                    # Auto reset status to WAITING so user can buy card
                    round_obj.status = "WAITING"
                    await db.commit()
                else:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Card buying is closed for this active round")

            # Check card entity
            stmt_card = select(Card).where(Card.card_number == card_number)
            card_res = await db.execute(stmt_card)
            card_obj = card_res.scalar_one_or_none()
            if not card_obj:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card number does not exist")

            # Check if card is already purchased in this round
            stmt_exists = select(CardPurchase).where(
                CardPurchase.round_id == round_id,
                CardPurchase.card_id == card_obj.id
            )
            exists_res = await db.execute(stmt_exists)
            if exists_res.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Card already taken by another player in this round")

            # Check user wallet
            stmt_wallet = select(Wallet).where(Wallet.user_id == user_id)
            wallet_res = await db.execute(stmt_wallet)
            wallet_obj = wallet_res.scalar_one_or_none()
            
            # If no wallet found or insufficient balance in dev mode, auto top-up
            if not wallet_obj:
                wallet_obj = Wallet(user_id=user_id, balance=500.00)
                db.add(wallet_obj)
                await db.flush()
            elif wallet_obj.balance < round_obj.card_price:
                if settings.ENVIRONMENT == "development":
                    wallet_obj.balance += 500.00
                else:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient wallet balance")

            # Deduct balance & add to prize pool
            wallet_obj.balance -= round_obj.card_price
            round_obj.prize_pool += round_obj.card_price

            # Create purchase record
            purchase = CardPurchase(
                round_id=round_id,
                card_id=card_obj.id,
                user_id=user_id,
                price_paid=round_obj.card_price
            )
            db.add(purchase)
            await db.commit()
            await db.refresh(wallet_obj)

            # Broadcast CARD_RESERVED WS event
            await publish_round_event(round_id, "CARD_RESERVED", {
                "card_number": card_number,
                "status": "LOCKED"
            })

            # Check distinct real (non-bot) players in this round
            stmt_real = select(CardPurchase.user_id).join(User, CardPurchase.user_id == User.id).where(
                CardPurchase.round_id == round_id,
                User.is_bot == False
            ).distinct()
            real_res = await db.execute(stmt_real)
            real_players_count = len(real_res.scalars().all())

            if real_players_count < 2:
                # Broadcast WAITING_FOR_PLAYERS event
                await publish_round_event(round_id, "WAITING_FOR_PLAYERS", {
                    "real_players_count": real_players_count,
                    "min_players_required": 2,
                    "message": f"Waiting for at least 2 real players. Current: {real_players_count}/2"
                })
            else:
                # 2 or more real players have joined: start game loop
                import asyncio
                from app.application.game_loop_usecase import run_round_game_loop, ACTIVE_ROUND_TASKS
                if round_id not in ACTIVE_ROUND_TASKS or ACTIVE_ROUND_TASKS[round_id].done():
                    task = asyncio.create_task(run_round_game_loop(round_id))
                    ACTIVE_ROUND_TASKS[round_id] = task

            return {
                "purchase_id": purchase.id,
                "card_number": card_number,
                "grid_matrix": card_obj.grid_matrix,
                "price_paid": float(round_obj.card_price),
                "new_balance": float(wallet_obj.balance),
                "real_players_count": real_players_count,
                "min_players_required": 2
            }
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Card is currently being purchased by another player. Please try again."
        )
