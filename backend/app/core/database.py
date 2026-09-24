import os
from pathlib import Path
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

def get_resolved_db_url(url: str) -> str:
    if not url or not url.startswith("sqlite"):
        return url

    prefix = "sqlite+aiosqlite:///"
    if url.startswith(prefix):
        raw_path = url[len(prefix):]
        # Clean relative dots
        if raw_path.startswith("./"):
            raw_path = raw_path[2:]
            
        # Check if absolute path doesn't exist on host (e.g. docker container)
        if raw_path.startswith("/") and not os.path.exists(os.path.dirname(raw_path)):
            backend_dir = Path(__file__).resolve().parent.parent.parent
            target_path = (backend_dir / "bingo.db").absolute()
            return f"sqlite+aiosqlite:///{target_path}"
        elif not raw_path.startswith("/"):
            backend_dir = Path(__file__).resolve().parent.parent.parent
            # Also check if root parent contains bingo.db (e.g. repo root)
            root_dir = backend_dir.parent
            if (root_dir / raw_path).exists():
                target_path = (root_dir / raw_path).absolute()
            else:
                target_path = (backend_dir / raw_path).absolute()
            return f"sqlite+aiosqlite:///{target_path}"
    return url

db_url = get_resolved_db_url(settings.DATABASE_URL)

# Engine configuration
engine_kwargs = {"echo": settings.DEBUG}
if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
elif db_url.startswith("postgresql"):
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 20
    engine_kwargs["max_overflow"] = 10

async_engine = create_async_engine(db_url, **engine_kwargs)


AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

def create_sqlite_fallback_engine():
    backend_dir = Path(__file__).resolve().parent.parent.parent
    target_path = (backend_dir / "bingo.db").absolute()
    fallback_url = f"sqlite+aiosqlite:///{target_path}"
    return create_async_engine(fallback_url, connect_args={"check_same_thread": False})

def set_fallback_engine(fallback_engine):
    global async_engine, AsyncSessionLocal
    async_engine = fallback_engine
    AsyncSessionLocal.configure(bind=fallback_engine)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
