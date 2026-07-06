from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException, status
import uuid
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import User
from app.core.jwt import decode_token, TokenError
from app.core.ws_manager import manager

router = APIRouter(tags=["websocket"])

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError("Invalid token type")
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise ValueError("Invalid subject")
            
        async with AsyncSessionLocal() as session:
            user = await session.scalar(select(User).where(User.id == uuid.UUID(user_id_str)))
            if not user or not user.is_active:
                raise ValueError("User not active or found")
                
            org_id = user.org_id
            
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, org_id)
    try:
        while True:
            # We don't expect messages from the client right now, just keeping connection open
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, org_id)
