import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.infrastructure.db.models import User, GameType, Round
from app.application.round_usecase import get_upcoming_rounds, create_round
from app.application.game_loop_usecase import run_round_game_loop, ACTIVE_ROUND_TASKS

router = APIRouter(prefix="/rounds", tags=["Rounds"])

class CreateRoundRequest(BaseModel):
    game_type_id: str = None
    card_price: float = 10.00
    start_delay_seconds: int = 60

@router.get("/upcoming")
async def upcoming_rounds(db: AsyncSession = Depends(get_db)):
    rounds = await get_upcoming_rounds(db)
    # Check if there is at least one WAITING round for card purchases
    has_waiting = any(r["status"] == "WAITING" for r in rounds)
    
    if not has_waiting:
        gt_stmt = select(GameType).limit(1)
        gt_res = await db.execute(gt_stmt)
        gt = gt_res.scalar_one_or_none()
        if gt:
            new_r = await create_round(db, game_type_id=gt.id, card_price=10.00, start_delay_seconds=60)
            rounds.insert(0, new_r)

    return rounds

@router.post("/create")
async def handle_create_round(
    req: CreateRoundRequest = CreateRoundRequest(),
    db: AsyncSession = Depends(get_db)
):
    game_type_id = req.game_type_id
    if not game_type_id:
        gt_stmt = select(GameType).limit(1)
        gt_res = await db.execute(gt_stmt)
        gt = gt_res.scalar_one_or_none()
        if not gt:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No GameType found")
        game_type_id = gt.id

    res = await create_round(db, game_type_id=game_type_id, card_price=req.card_price, start_delay_seconds=req.start_delay_seconds)
    return res

@router.post("/{round_id}/start")
async def start_game_loop(
    round_id: str,
    db: AsyncSession = Depends(get_db)
):
    round_obj = await db.get(Round, round_id)
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    if round_id not in ACTIVE_ROUND_TASKS or ACTIVE_ROUND_TASKS[round_id].done():
        task = asyncio.create_task(run_round_game_loop(round_id))
        ACTIVE_ROUND_TASKS[round_id] = task

    return {"status": "STARTED", "round_id": round_id}

@router.post("/{round_id}/reset")
async def reset_round(
    round_id: str,
    db: AsyncSession = Depends(get_db)
):
    round_obj = await db.get(Round, round_id)
    if not round_obj:
        raise HTTPException(status_code=404, detail="Round not found")

    # Cancel any running background task
    if round_id in ACTIVE_ROUND_TASKS and not ACTIVE_ROUND_TASKS[round_id].done():
        ACTIVE_ROUND_TASKS[round_id].cancel()

    round_obj.status = "WAITING"
    round_obj.finished_at = None
    round_obj.winner_user_id = None
    await db.commit()

    return {"status": "WAITING", "round_id": round_id, "message": "Round reset to WAITING state. Card buying is now open."}

