from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(120)
    )

    email: Mapped[str] = mapped_column(
        String(254),
        unique=True,
        index=True
    )

    contact: Mapped[str | None] = mapped_column(
        String(60),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(120)
    )

    email: Mapped[str] = mapped_column(
        String(254),
        unique=True,
        index=True
    )

    password_hash: Mapped[str] = mapped_column(
        String(255)
    )

    username: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
        unique=True,
        index=True
    )

    profile_data: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )


# =========================================
# PUBLICAÇÕES DO FEED
# =========================================

class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    content: Mapped[str] = mapped_column(
        String(280),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )


# =========================================
# COMENTÁRIOS
# =========================================

class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True)

    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    content: Mapped[str] = mapped_column(
        String(180),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )


# =========================================
# CURTIDAS
# =========================================

class PostLike(Base):
    __tablename__ = "post_likes"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )

    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        primary_key=True,
        index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )


# =========================================
# REPOSTAGENS
# =========================================

class PostRepost(Base):
    __tablename__ = "post_reposts"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )

    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        primary_key=True,
        index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

# =========================================
# COLEÇÃO DE JOGOS DOS USUÁRIOS
# =========================================

class UserGame(Base):
    __tablename__ = "user_games"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "category",
            "name",
            name="uq_user_games_user_category_name",
        ),
        Index("ix_user_games_user_category", "user_id", "category"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(160),
        nullable=False,
    )

    genre: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        default="Gênero não informado",
    )

    # favorite, liked ou completed
    category: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    rating: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=5.0,
    )

    favorite_position: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    completed_year: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


# =========================================
# SOLICITAÇÕES DE AMIZADE
# =========================================

class FriendRequest(Base):
    __tablename__ = "friend_requests"
    __table_args__ = (
        Index("ix_friend_requests_receiver_status", "receiver_id", "status"),
        Index("ix_friend_requests_sender_status", "sender_id", "status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    receiver_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # pending, accepted ou declined
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    responded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


# =========================================
# AMIZADES ACEITAS
# =========================================

class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (
        UniqueConstraint(
            "user_low_id",
            "user_high_id",
            name="uq_friendships_user_pair",
        ),
        CheckConstraint(
            "user_low_id < user_high_id",
            name="ck_friendships_canonical_pair",
        ),
        Index("ix_friendships_low_user", "user_low_id"),
        Index("ix_friendships_high_user", "user_high_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    # Os IDs são sempre gravados em ordem crescente para impedir que
    # (A, B) e (B, A) representem duas amizades diferentes.
    user_low_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_high_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
