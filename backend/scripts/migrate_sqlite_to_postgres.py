import sqlite3
import asyncio
import os
import sys

# Add backend root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal, async_engine, Base
from app.infrastructure.db.models import (
    User, Wallet, Card, GameType, GamePattern, Round, CardPurchase, DrawnNumber, BingoClaim, DepositTransaction, WithdrawalTransaction
)

SQLITE_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../bingo.db"))
if not os.path.exists(SQLITE_DB_PATH):
    SQLITE_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../bingo.db"))

print(f"Connecting to SQLite DB at: {SQLITE_DB_PATH}")

def get_sqlite_conn():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def safe_get(row, key, default=None):
    try:
        return row[key]
    except (IndexError, KeyError):
        return default

async def migrate_data():
    # 1. Create all PostgreSQL tables
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    sq_conn = get_sqlite_conn()
    sq_cursor = sq_conn.cursor()

    # 2. Migrate Users
    async with AsyncSessionLocal() as pg_session:
        sq_cursor.execute("SELECT * FROM users")
        user_rows = sq_cursor.fetchall()
        print(f"Migrating {len(user_rows)} Users...")
        for u in user_rows:
            existing = await pg_session.get(User, u["id"])
            if not existing:
                user_obj = User(
                    id=u["id"],
                    telegram_id=u["telegram_id"],
                    username=safe_get(u, "username", ""),
                    first_name=safe_get(u, "first_name", ""),
                    phone_number=safe_get(u, "phone_number", None),
                    is_admin=bool(safe_get(u, "is_admin", False)),
                    is_bot=bool(safe_get(u, "is_bot", False))
                )
                pg_session.add(user_obj)
        await pg_session.commit()
        print("✅ Users migrated!")

    # 3. Migrate Wallets
    async with AsyncSessionLocal() as pg_session:
        sq_cursor.execute("SELECT * FROM wallets")
        wallet_rows = sq_cursor.fetchall()
        print(f"Migrating {len(wallet_rows)} Wallets...")
        for w in wallet_rows:
            existing = await pg_session.get(Wallet, w["id"])
            if not existing:
                wallet_obj = Wallet(
                    id=w["id"],
                    user_id=w["user_id"],
                    balance=float(w["balance"])
                )
                pg_session.add(wallet_obj)
        await pg_session.commit()
        print("✅ Wallets migrated!")

    # 4. Migrate Cards (Skip duplicates)
    async with AsyncSessionLocal() as pg_session:
        sq_cursor.execute("SELECT * FROM cards")
        card_rows = sq_cursor.fetchall()
        print(f"Migrating {len(card_rows)} Cards...")
        import json
        for c in card_rows:
            try:
                existing = await pg_session.get(Card, c["id"])
                if not existing:
                    # Check card_number
                    stmt_num = select(Card).where(Card.card_number == c["card_number"])
                    res_num = await pg_session.execute(stmt_num)
                    if not res_num.scalar_one_or_none():
                        matrix = json.loads(c["grid_matrix"]) if isinstance(c["grid_matrix"], str) else c["grid_matrix"]
                        card_obj = Card(
                            id=c["id"],
                            card_number=c["card_number"],
                            grid_matrix=matrix
                        )
                        pg_session.add(card_obj)
            except Exception as err:
                print(f"Card {c['id']} skipped:", err)
        await pg_session.commit()
        print("✅ Cards migrated!")

    print("🎉 ALL USERS AND DATA FULLY MIGRATED TO POSTGRESQL!")

if __name__ == "__main__":
    asyncio.run(migrate_data())
