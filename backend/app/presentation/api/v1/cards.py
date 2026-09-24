from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.presentation.api.deps import get_current_user
from app.infrastructure.db.models import User
from app.application.card_usecase import get_round_cards, purchase_card

router = APIRouter(prefix="/rounds/{round_id}", tags=["Cards"])

class BuyCardRequest(BaseModel):
    card_number: int

@router.get("/cards")
async def list_cards(
    round_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: int = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await get_round_cards(db, round_id, page=page, limit=limit, search_number=search)

@router.post("/buy-card")
async def buy_card(
    round_id: str,
    req: BuyCardRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await purchase_card(db, user_id=user.id, round_id=round_id, card_number=req.card_number)
