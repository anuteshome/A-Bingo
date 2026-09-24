import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import async_engine, Base
from app.core.redis import redis_manager
from app.presentation.api.v1.router import api_v1_router
from app.presentation.websockets.game_ws import router as ws_router

import logging
from app.infrastructure.telegram.bot import setup_telegram_bot_app

logger = logging.getLogger(__name__)

telegram_bot_app = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global telegram_bot_app
    # Startup: Connect Redis (gracefully log warning if Redis server is down)
    try:
        await redis_manager.connect()
    except Exception as re:
        logger.warning(f"Redis connection notice: {re}")

    # Startup: Ensure DB tables (fallback to SQLite if primary PostgreSQL is unreachable)
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Primary database connection established successfully.")
    except Exception as dbe:
        logger.warning(f"Primary database connection failed ({dbe}). Falling back to SQLite database.")
        try:
            from app.core.database import create_sqlite_fallback_engine, set_fallback_engine
            fallback_engine = create_sqlite_fallback_engine()
            set_fallback_engine(fallback_engine)
            async with fallback_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("SQLite fallback database initialized successfully.")
        except Exception as fe:
            logger.error(f"Fallback database initialization error: {fe}")

    # Startup: Start Telegram Bot polling automatically
    try:
        telegram_bot_app = setup_telegram_bot_app()
        if telegram_bot_app:
            await telegram_bot_app.initialize()
            await telegram_bot_app.start()
            await telegram_bot_app.updater.start_polling()
            logger.info("Telegram Bot polling started successfully!")
    except Exception as e:
        logger.error(f"Failed to start Telegram Bot polling: {e}")

    yield

    # Shutdown: Disconnect Telegram Bot & Redis
    if telegram_bot_app:
        try:
            await telegram_bot_app.updater.stop()
            await telegram_bot_app.stop()
            await telegram_bot_app.shutdown()
        except Exception as e:
            logger.warning(f"Error shutting down Telegram Bot: {e}")
    await redis_manager.disconnect()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(api_v1_router)
app.include_router(ws_router)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
