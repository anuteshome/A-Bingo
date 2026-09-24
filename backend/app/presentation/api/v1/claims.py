from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.presentation.api.deps import get_current_user
from app.infrastructure.db.models import User
from app.application.game_loop_usecase import validate_and_process_claim

router = APIRouter(prefix="/rounds/{round_id}", tags=["Bingo Claims"])

class BingoClaimRequest(BaseModel):
    card_id: str

@router.post("/claim-bingo")
async def claim_bingo(
    round_id: str,
    req: BingoClaimRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await validate_and_process_claim(db, user_id=user.id, round_id=round_id, card_id=req.card_id)
    if res.get("result") == "VALID_BINGO":
        return res
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res
        )
