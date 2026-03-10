from typing import Dict, List
import uuid
import json
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps org_id to a list of active websocket connections
        self.active_connections: Dict[uuid.UUID, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, org_id: uuid.UUID):
        await websocket.accept()
        if org_id not in self.active_connections:
            self.active_connections[org_id] = []
        self.active_connections[org_id].append(websocket)

    def disconnect(self, websocket: WebSocket, org_id: uuid.UUID):
        if org_id in self.active_connections:
            if websocket in self.active_connections[org_id]:
                self.active_connections[org_id].remove(websocket)
            if not self.active_connections[org_id]:
                del self.active_connections[org_id]

    async def broadcast_to_org(self, org_id: uuid.UUID, message: dict):
        if org_id in self.active_connections:
            payload = json.dumps(message)
            # Send to all connected clients for this org
            # Use list copy to avoid concurrent modification issues
            for connection in list(self.active_connections[org_id]):
                try:
                    await connection.send_text(payload)
                except Exception:
                    # Ignore failing connections; they will be removed on next disconnect
                    pass

manager = ConnectionManager()
