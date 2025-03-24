import asyncio
from queue import Queue
from typing import ClassVar, Optional, Any, Callable, Awaitable
from fastapi import WebSocket
from starlette.websockets import WebSocketState


class ProgressAccumulator:
    total: int
    current: int
    callback_fn: Callable[[float], Awaitable[None]]

    def __init__(self, total, callback_fn, send_every_n=None):
        self.total = total
        self.current = 0
        self.callback_fn = callback_fn
        self.send_every_n = None if send_every_n is None else round(send_every_n)

    async def update(self):
        self.current += 1
        if self.send_every_n is None or (self.current % self.send_every_n) == 0:
            await self.callback_fn(self.current/self.total)

    async def finish(self):
        self.current = self.total
        await self.callback_fn(1)

class ProgressBroadcaster:

    _instance: ClassVar[Any] = None
    queue:

    @classmethod
    def instance(cls) -> "ProgressBroadcaster":
        return cls._instance

    def __init__(self):
        assert type(self)._instance is None
        type(self)._instance = self
        self.active_connections: list[WebSocket] = []
        self.counter = 0

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"websocket {websocket} connected, now have  {len(self.active_connections)}")
        message = f'hello you are #{self.counter}. you have {len(self.active_connections)-1} buddies here.'
        self.counter += 1
        await self.send_personal_message(message, websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print("websocket disconnected, now have", len(self.active_connections))

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast_text(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

    async def broadcast_json(self, message_json: Any):
        to_remove = []
        for connection in self.active_connections:
            if hasattr(connection, "client_state") and connection.client_state == WebSocketState.CONNECTED:
                print(f'connection {connection} is ok')
            else:
                print(f'connection {connection} is not ok')
            try:
                await asyncio.wait_for(connection.send_json(message_json), timeout=0.5)
                print(f' - sent to {connection}')
            except (asyncio.TimeoutError, RuntimeError, ConnectionResetError) as e:
                print(f' - {connection} broke with {e}, removing')
                to_remove.append(connection)

        for conn in to_remove:
            if conn in self.active_connections:
                self.active_connections.remove(conn)


    async def broadcast_json_(self, message_json: Any):
        for connection in self.active_connections:
            await connection.send_json(message_json)
            print(f' - sent to ', connection)

    async def send_progress(self, label: str, progress: float):
        print(f'sending progress "{label}":{progress}')
        await self.broadcast_json({'type': 'progress', 'data': {'label': label, 'progress': progress}})
        print(f'sent progress "{label}":{progress}')

    def make_helper(self, total: int, label: str, send_every_n=None) -> ProgressAccumulator:
        async def do_send_progress(p):
            await ProgressBroadcaster.instance().send_progress(label, p)

        return ProgressAccumulator(
            total = total,
            callback_fn = do_send_progress,
            send_every_n = send_every_n
        )
