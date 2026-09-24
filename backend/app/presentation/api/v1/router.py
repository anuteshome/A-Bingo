from fastapi import APIRouter
from app.presentation.api.v1.auth import router as auth_router
from app.presentation.api.v1.users import router as users_router
from app.presentation.api.v1.wallet import router as wallet_router
from app.presentation.api.v1.rounds import router as rounds_router
from app.presentation.api.v1.cards import router as cards_router
from app.presentation.api.v1.claims import router as claims_router
from app.presentation.api.v1.deposits import router as deposits_router
from app.presentation.api.v1.withdrawals import router as withdrawals_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(wallet_router)
api_v1_router.include_router(rounds_router)
api_v1_router.include_router(cards_router)
api_v1_router.include_router(claims_router)
api_v1_router.include_router(deposits_router)
api_v1_router.include_router(withdrawals_router)

