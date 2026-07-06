"""Authentication endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.rate_limit import login_rate_limiter
from app.db.session import get_db
from app.schemas.auth import LoginRequest, RefreshRequest, TokenPair, UserOut
from app.services import auth_service
from app.services.auth_service import AuthError

router = APIRouter(prefix="/auth", tags=["auth"])

DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.post("/login", response_model=TokenPair, dependencies=[Depends(login_rate_limiter)])
async def login(payload: LoginRequest, session: DbSession) -> TokenPair:
    try:
        user = await auth_service.authenticate(session, payload.email, payload.password)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    return await auth_service.issue_tokens(user)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, session: DbSession) -> TokenPair:
    try:
        return await auth_service.rotate_refresh_token(session, payload.refresh_token)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: RefreshRequest) -> Response:  
    await auth_service.revoke_refresh_token(payload.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT) 


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)
