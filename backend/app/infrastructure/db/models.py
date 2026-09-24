import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, BigInteger, Numeric, Boolean, Integer, 
    DateTime, ForeignKey, UniqueConstraint, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    telegram_id = Column(BigInteger, unique=True, nullable=False, index=True)
    username = Column(String(64), nullable=True)
    first_name = Column(String(64), nullable=True)
    phone_number = Column(String(32), unique=True, nullable=True)
    is_bot = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    purchases = relationship("CardPurchase", back_populates="user")
    claims = relationship("BingoClaim", back_populates="user")
    deposits = relationship("DepositTransaction", back_populates="user")
    withdrawals = relationship("WithdrawalTransaction", back_populates="user")


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    balance = Column(Numeric(12, 2), default=0.00, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="wallet")


class Card(Base):
    __tablename__ = "cards"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    card_number = Column(Integer, unique=True, nullable=False, index=True)
    grid_matrix = Column(JSON, nullable=False) # 5x5 list of lists
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    purchases = relationship("CardPurchase", back_populates="card")


class GameType(Base):
    __tablename__ = "game_types"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(64), nullable=False)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    patterns = relationship("GamePattern", back_populates="game_type", cascade="all, delete-orphan")
    rounds = relationship("Round", back_populates="game_type")


class GamePattern(Base):
    __tablename__ = "game_patterns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    game_type_id = Column(String(36), ForeignKey("game_types.id", ondelete="CASCADE"), nullable=False)
    pattern_name = Column(String(64), nullable=False)
    coordinates = Column(JSON, nullable=False) # List of [row, col] e.g. [[0,0], [0,1], [0,2], [0,3], [0,4]]
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    game_type = relationship("GameType", back_populates="patterns")


class Round(Base):
    __tablename__ = "rounds"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    game_type_id = Column(String(36), ForeignKey("game_types.id"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    card_price = Column(Numeric(10, 2), nullable=False)
    prize_pool = Column(Numeric(12, 2), default=0.00, nullable=False)
    status = Column(String(20), default="WAITING", nullable=False, index=True) # WAITING, COUNTDOWN, PLAYING, FINISHED, CANCELLED
    winner_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    game_type = relationship("GameType", back_populates="rounds")
    winner = relationship("User", foreign_keys=[winner_user_id])
    purchases = relationship("CardPurchase", back_populates="round", cascade="all, delete-orphan")
    drawn_numbers = relationship("DrawnNumber", back_populates="round", cascade="all, delete-orphan")
    claims = relationship("BingoClaim", back_populates="round", cascade="all, delete-orphan")


class CardPurchase(Base):
    __tablename__ = "card_purchases"
    __table_args__ = (
        UniqueConstraint("round_id", "card_id", name="uq_round_card"),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    round_id = Column(String(36), ForeignKey("rounds.id", ondelete="CASCADE"), nullable=False, index=True)
    card_id = Column(String(36), ForeignKey("cards.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    price_paid = Column(Numeric(10, 2), nullable=False)
    purchased_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    round = relationship("Round", back_populates="purchases")
    card = relationship("Card", back_populates="purchases")
    user = relationship("User", back_populates="purchases")


class DrawnNumber(Base):
    __tablename__ = "drawn_numbers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    round_id = Column(String(36), ForeignKey("rounds.id", ondelete="CASCADE"), nullable=False, index=True)
    number_drawn = Column(Integer, nullable=False)
    sequence_order = Column(Integer, nullable=False)
    drawn_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    round = relationship("Round", back_populates="drawn_numbers")


class BingoClaim(Base):
    __tablename__ = "bingo_claims"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    round_id = Column(String(36), ForeignKey("rounds.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    card_id = Column(String(36), ForeignKey("cards.id"), nullable=False)
    is_valid = Column(Boolean, nullable=False)
    claimed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    round = relationship("Round", back_populates="claims")
    user = relationship("User", back_populates="claims")


class DepositTransaction(Base):
    __tablename__ = "deposit_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(32), nullable=False, default="TELEBIRR") # TELEBIRR, CBE_BIRR, BANK_TRANSFER
    reference_code = Column(String(64), unique=True, nullable=False, index=True)
    status = Column(String(20), default="PENDING", nullable=False, index=True) # PENDING, COMPLETED, REJECTED
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="deposits")


class WithdrawalTransaction(Base):
    __tablename__ = "withdrawal_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(32), nullable=False, default="TELEBIRR") # TELEBIRR, CBE_BIRR, BANK_TRANSFER
    account_number = Column(String(64), nullable=False)
    account_name = Column(String(64), nullable=False)
    status = Column(String(20), default="PENDING", nullable=False, index=True) # PENDING, COMPLETED, REJECTED
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="withdrawals")


