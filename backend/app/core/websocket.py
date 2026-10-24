import json
import asyncio
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[int, Set[str]] = {}
        self.analysis_subscribers: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str, user_id: Optional[int] = None):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(client_id)

    def disconnect(self, client_id: str, user_id: Optional[int] = None):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(client_id)

    async def send_personal_message(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(message)

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.user_connections:
            for client_id in self.user_connections[user_id]:
                await self.send_personal_message(message, client_id)

    async def broadcast(self, message: dict):
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_json(message)
            except Exception:
                pass

    async def notify_analysis_progress(self, client_id: str, stage: str, progress: int, message: str):
        await self.send_personal_message({
            "type": "analysis_progress",
            "stage": stage,
            "progress": progress,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }, client_id)

    async def notify_analysis_complete(self, client_id: str, result: dict):
        await self.send_personal_message({
            "type": "analysis_complete",
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }, client_id)

    async def notify_analysis_error(self, client_id: str, error: str):
        await self.send_personal_message({
            "type": "analysis_error",
            "error": error,
            "timestamp": datetime.utcnow().isoformat()
        }, client_id)

    def get_connection_count(self) -> int:
        return len(self.active_connections)

    def get_user_connection_count(self, user_id: int) -> int:
        return len(self.user_connections.get(user_id, set()))

manager = ConnectionManager()
