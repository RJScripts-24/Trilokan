# models/complaint.py
"""
Postgres-ready Complaint Model.
Contains:
- SQLAlchemy ORM model (ComplaintORM)
- Async DB engine + sessionmaker
- Pydantic schemas for request/response
- DB helper functions for CRUD
- get_db_session() dependency for FastAPI

All in one file: NO extra folders created.
"""

import os
import uuid
from typing import Dict, Any, Optional, List, AsyncGenerator

from pydantic import BaseModel, Field
from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

# -------------------------------------------------------------------
# DATABASE CONFIG
# -------------------------------------------------------------------

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/complaints_db"
)

# Async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
)

# Sessionmaker (async)
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autoflush=False,
    expire_on_commit=False,
    future=True,
)

# Base class for SQLAlchemy ORM models
Base = declarative_base()

# -------------------------------------------------------------------
# ORM MODEL
# -------------------------------------------------------------------

class ComplaintORM(Base):
    __tablename__ = "complaints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(128), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(String(50), nullable=False, default="basic")  # critical/moderate/basic
    channel = Column(String(50), nullable=False, default="web")
    file_uploads = Column(JSONB, nullable=False, default=list)  # images/screenshots
    status = Column(String(50), nullable=False, default="new")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "channel": self.channel,
            "file_uploads": self.file_uploads,
            "status": self.status,
        }

# -------------------------------------------------------------------
# Pydantic Schemas (kept inside same file per your instruction)
# -------------------------------------------------------------------

class ComplaintCreateSchema(BaseModel):
    user_id: Optional[str] = Field(None)
    title: str
    description: str
    priority: Optional[str] = "basic"  # critical, moderate, basic
    channel: Optional[str] = "web"
    file_uploads: Optional[List[str]] = Field(default_factory=list)  # URLs or paths to uploaded files


class ComplaintReadSchema(BaseModel):
    id: str
    user_id: Optional[str]
    title: str
    description: str
    priority: str
    channel: str
    file_uploads: List[str]
    status: str

    class Config:
        from_attributes = True

# -------------------------------------------------------------------
# Dependency for FastAPI: get async DB session
# -------------------------------------------------------------------

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

# -------------------------------------------------------------------
# DB Helper Functions
# -------------------------------------------------------------------

from sqlalchemy import select

async def create_complaint_db(db: AsyncSession, data: Dict[str, Any]) -> ComplaintReadSchema:
    """
    Insert a complaint into the DB and return a Pydantic-compatible object.
    """
    new_obj = ComplaintORM(
        user_id=data.get("user_id"),
        title=data["title"],
        description=data["description"],
        priority=data.get("priority", "basic"),
        channel=data.get("channel", "web"),
        file_uploads=data.get("file_uploads", []),
        status=data.get("status", "new"),
    )

    db.add(new_obj)
    await db.commit()
    await db.refresh(new_obj)

    return ComplaintReadSchema.from_orm(new_obj)

async def get_complaint_db(db: AsyncSession, complaint_id: str) -> Optional[ComplaintReadSchema]:
    query = select(ComplaintORM).where(ComplaintORM.id == complaint_id)
    result = await db.execute(query)
    row = result.scalars().first()
    if not row:
        return None
    return ComplaintReadSchema.from_orm(row)

async def list_complaints_db(
    db: AsyncSession,
    user_id: Optional[str] = None,
    status: Optional[str] = None
) -> List[ComplaintReadSchema]:

    query = select(ComplaintORM)

    if user_id:
        query = query.where(ComplaintORM.user_id == user_id)

    if status:
        query = query.where(ComplaintORM.status == status)

    result = await db.execute(query)
    rows = result.scalars().all()

    return [ComplaintReadSchema.from_orm(r) for r in rows]
