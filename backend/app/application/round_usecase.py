from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.infrastructure.db.models import Round, GameType, CardPurchase, User
from app.core.redis import get_redis

async def get_upcoming_rounds(db: AsyncSession) -> List[dict]:
    stmt = select(Round).where(
        Round.status.in_(["WAITING", "COUNTDOWN", "PLAYING"])
    ).options(selectinload(Round.game_type)).order_by(Round.start_time.asc())

    res = await db.execute(stmt)
    rounds = res.scalars().all()
    
    out = []
    for r in rounds:
        # Get count of purchased cards
        p_stmt = select(CardPurchase).where(CardPurchase.round_id == r.id)
        p_res = await db.execute(p_stmt)
        cards_sold = len(p_res.scalars().all())

        out.append({
            "id": r.id,
            "game_type_id": r.game_type_id,
            "game_type_name": r.game_type.name if r.game_type else "Standard Bingo",
            "start_time": r.start_time.isoformat(),
            "card_price": float(r.card_price),
            "prize_pool": float(r.prize_pool),
            "status": r.status,
            "cards_sold": cards_sold
        })
    return out


async def create_round(
    db: AsyncSession,
    game_type_id: str,
    card_price: float,
    start_delay_seconds: int = 60
) -> dict:
    start_time = datetime.now(timezone.utc) + timedelta(seconds=start_delay_seconds)
    round_obj = Round(
        game_type_id=game_type_id,
        start_time=start_time,
        card_price=card_price,
        prize_pool=0.00,
        status="WAITING"
    )
    db.add(round_obj)
    await db.commit()
    await db.refresh(round_obj)

    return {
        "id": round_obj.id,
        "game_type_id": round_obj.game_type_id,
        "start_time": round_obj.start_time.isoformat(),
        "card_price": float(round_obj.card_price),
        "prize_pool": float(round_obj.prize_pool),
        "status": round_obj.status
    }
