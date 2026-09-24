import asyncio
import json
from datetime import datetime, timezone
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import AsyncSessionLocal
from app.infrastructure.db.models import Round, DrawnNumber, GameType, GamePattern, BingoClaim, CardPurchase, User, Wallet
from app.domain.services.number_drawer import generate_draw_sequence, format_drawn_number_payload
from app.domain.services.bingo_validator import validate_bingo_claim
from app.infrastructure.redis.pubsub import publish_round_event
from app.infrastructure.redis.lock_manager import acquire_claim_lock
from app.core.redis import get_redis

# Global background tasks dictionary
ACTIVE_ROUND_TASKS = {}

async def run_round_game_loop(round_id: str):
    """
    Background worker loop for a single Bingo round:
    - Countdown state -> transition to PLAYING
    - Generate 1-75 draw sequence
    - Draw one number every 3 seconds, store in DB & Redis, broadcast NUMBER_DRAWN event
    - Terminate when state becomes FINISHED or 75 numbers drawn
    """
    async with AsyncSessionLocal() as db:
        round_obj = await db.get(Round, round_id)
        if not round_obj or round_obj.status in ["FINISHED", "CANCELLED"]:
            return

        # Check distinct real players count
        stmt_real = select(CardPurchase.user_id).join(User, CardPurchase.user_id == User.id).where(
            CardPurchase.round_id == round_id,
            User.is_bot == False
        ).distinct()
        real_res = await db.execute(stmt_real)
        real_count = len(real_res.scalars().all())

        if real_count < 2:
            round_obj.status = "WAITING"
            await db.commit()
            await publish_round_event(round_id, "WAITING_FOR_PLAYERS", {
                "real_players_count": real_count,
                "min_players_required": 2
            })
            return

        # Transition to COUNTDOWN if WAITING
        if round_obj.status == "WAITING":
            round_obj.status = "COUNTDOWN"
            await db.commit()
            await publish_round_event(round_id, "ROUND_STATUS_CHANGED", {"status": "COUNTDOWN"})
            await asyncio.sleep(30) # 30 second countdown before live draw start

        # Transition to PLAYING
        round_obj.status = "PLAYING"
        await db.commit()
        await publish_round_event(round_id, "ROUND_STATUS_CHANGED", {"status": "PLAYING"})

        sequence = generate_draw_sequence()
        redis = await get_redis()
        redis_drawn_key = f"round:{round_id}:drawn_set"

        # Fetch patterns for active game type
        stmt_gt = select(GameType).where(GameType.id == round_obj.game_type_id).options(selectinload(GameType.patterns))
        gt_res = await db.execute(stmt_gt)
        game_type = gt_res.scalar_one_or_none()
        patterns_coords = [p.coordinates for p in game_type.patterns] if game_type else []

        drawn_numbers_set = set()

        for idx, number in enumerate(sequence):
            # Check if round was marked FINISHED or CANCELLED externally (e.g. valid bingo claim by player)
            await db.refresh(round_obj)
            if round_obj.status != "PLAYING":
                break

            seq_order = idx + 1
            drawn_at = datetime.now(timezone.utc)
            drawn_numbers_set.add(number)

            # Store in DB
            dn = DrawnNumber(
                round_id=round_id,
                number_drawn=number,
                sequence_order=seq_order,
                drawn_at=drawn_at
            )
            db.add(dn)
            await db.commit()

            # Store in Redis set for O(1) membership check
            await redis.sadd(redis_drawn_key, number)

            # Broadcast NUMBER_DRAWN event over WebSockets
            payload = format_drawn_number_payload(number, seq_order)
            payload["drawn_at"] = drawn_at.isoformat()
            await publish_round_event(round_id, "NUMBER_DRAWN", payload)

            # Check if any AI Bot player card completed a winning pattern
            stmt_p = select(CardPurchase).where(CardPurchase.round_id == round_id).options(
                selectinload(CardPurchase.card), selectinload(CardPurchase.user)
            )
            p_res = await db.execute(stmt_p)
            all_purchases = p_res.scalars().all()

            bot_winner_found = False
            for purchase in all_purchases:
                if purchase.user and purchase.user.telegram_id and purchase.user.telegram_id >= 90000:
                    is_valid, _ = validate_bingo_claim(
                        purchase.card.grid_matrix,
                        drawn_numbers_set,
                        patterns_coords
                    )
                    if is_valid:
                        # Bot claims BINGO!
                        await validate_and_process_claim(
                            db, user_id=purchase.user_id, round_id=round_id, card_id=purchase.card_id
                        )
                        bot_winner_found = True
                        break

            if bot_winner_found:
                break

            # Pause between draws (0.6 seconds interval for smooth readable game pace)
            await asyncio.sleep(0.6)

        # If loop completes without winner
        await db.refresh(round_obj)
        if round_obj.status == "PLAYING":
            round_obj.status = "FINISHED"
            round_obj.finished_at = datetime.now(timezone.utc)
            await db.commit()
            await publish_round_event(round_id, "ROUND_STATUS_CHANGED", {"status": "FINISHED"})


async def validate_and_process_claim(
    db, user_id: str, round_id: str, card_id: str
) -> dict:
    """
    Executes atomic server-authoritative Bingo claim verification:
    Acquires Redlock 'lock:round:{round_id}:claim', checks round status, computes marked coordinates,
    evaluates game type patterns, credits user wallet, marks round FINISHED, and broadcasts BINGO_WINNER.
    """
    try:
        async with acquire_claim_lock(round_id, ttl=5):
            round_obj = await db.get(Round, round_id)
            if not round_obj or round_obj.status != "PLAYING":
                return {"result": "INVALID", "message": "Round is not currently in PLAYING state"}

            # Verify card purchase
            stmt_purchase = select(CardPurchase).where(
                CardPurchase.round_id == round_id,
                CardPurchase.card_id == card_id,
                CardPurchase.user_id == user_id
            ).options(selectinload(CardPurchase.card))
            p_res = await db.execute(stmt_purchase)
            purchase = p_res.scalar_one_or_none()
            if not purchase:
                return {"result": "INVALID", "message": "Card is not owned by user in this round"}

            # Fetch drawn numbers so far
            redis = await get_redis()
            redis_drawn_key = f"round:{round_id}:drawn_set"
            drawn_str_set = await redis.smembers(redis_drawn_key)
            drawn_numbers = {int(x) for x in drawn_str_set}

            # Fetch game type patterns
            stmt_gt = select(GameType).where(GameType.id == round_obj.game_type_id).options(selectinload(GameType.patterns))
            gt_res = await db.execute(stmt_gt)
            game_type = gt_res.scalar_one_or_none()
            patterns_coords = [p.coordinates for p in game_type.patterns] if game_type else []

            # Perform mathematical validation
            is_valid, pattern_name = validate_bingo_claim(
                purchase.card.grid_matrix,
                drawn_numbers,
                patterns_coords
            )

            # Record claim
            claim = BingoClaim(
                round_id=round_id,
                user_id=user_id,
                card_id=card_id,
                is_valid=is_valid
            )
            db.add(claim)

            if is_valid:
                round_obj.status = "FINISHED"
                round_obj.winner_user_id = user_id
                round_obj.finished_at = datetime.now(timezone.utc)

                # Credit prize pool to winner wallet
                stmt_wallet = select(Wallet).where(Wallet.user_id == user_id)
                w_res = await db.execute(stmt_wallet)
                wallet = w_res.scalar_one_or_none()
                prize_amount = float(round_obj.prize_pool)
                if wallet:
                    wallet.balance += round_obj.prize_pool

                await db.commit()

                # Get user details
                winner_user = await db.get(User, user_id)

                # Broadcast BINGO_WINNER event
                winner_payload = {
                    "winner_user_id": user_id,
                    "winner_username": winner_user.username if winner_user else "Winner",
                    "winner_first_name": winner_user.first_name if winner_user else "Winner",
                    "winning_card_number": purchase.card.card_number,
                    "prize_amount": prize_amount,
                    "pattern_completed": pattern_name
                }
                await publish_round_event(round_id, "BINGO_WINNER", winner_payload)

                return {"result": "VALID_BINGO", "prize_won": prize_amount}
            else:
                await db.commit()
                return {"result": "INVALID_BINGO", "message": "Card matrix does not satisfy active winning pattern"}

    except RuntimeError:
        return {"result": "ERROR", "message": "Claim currently processing for this round"}
