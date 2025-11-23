# api/routes.py
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

# Import DB helpers + schemas from models/complaint
from models.complaint import (
    get_db_session,
    create_complaint_db,
    get_complaint_db,
    list_complaints_db,
    ComplaintCreateSchema,
    ComplaintReadSchema,
)

router = APIRouter()


# ----------------------------
# ROOT METADATA ENDPOINT
# ----------------------------
@router.get("/", summary="Service root / metadata")
async def root():
    return {
        "service": "Complaint Portal API",
        "status": "active",
        "version": "1.0.0",
    }

# ----------------------------
# CREATE COMPLAINT
# ----------------------------
@router.post(
    "/complaints",
    response_model=ComplaintReadSchema,
    status_code=201,
    summary="Create a new complaint",
)
async def create_complaint(
    payload: ComplaintCreateSchema,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Create complaint endpoint.
    Accepts: title, description, priority (critical/moderate/basic), file_uploads
    """
    # Validate priority
    valid_priorities = ["critical", "moderate", "basic"]
    priority = (payload.priority or "basic").lower()
    if priority not in valid_priorities:
        raise HTTPException(
            status_code=400, 
            detail=f"Priority must be one of: {', '.join(valid_priorities)}"
        )

    # Build payload for DB helper
    data = {
        "user_id": payload.user_id,
        "title": payload.title,
        "description": payload.description,
        "priority": priority,
        "channel": payload.channel or "web",
        "file_uploads": payload.file_uploads or [],
        "status": "new",
    }

    new_complaint = await create_complaint_db(db, data)
    return new_complaint

# ----------------------------
# GET SINGLE COMPLAINT
# ----------------------------
@router.get(
    "/complaints/{complaint_id}",
    response_model=ComplaintReadSchema,
    summary="Get complaint by ID",
)
async def get_complaint(
    complaint_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    result = await get_complaint_db(db, complaint_id)
    if not result:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return result


# ----------------------------
# LIST COMPLAINTS
# ----------------------------
@router.get(
    "/complaints",
    response_model=List[ComplaintReadSchema],
    summary="List complaints",
)
async def list_complaints(
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db_session),
):
    results = await list_complaints_db(db, user_id=user_id, status=status)
    return results
