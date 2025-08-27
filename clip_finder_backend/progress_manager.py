"""
Progress Manager for WebSocket-based status and progress reporting.
Runs in a separate thread to deliver real-time updates to connected clients.
"""
import asyncio
import json
import threading
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ProgressStatus(Enum):
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ERROR = "error"
    CANCELLED = "cancelled"


@dataclass
class ProgressMessage:
    """Represents a progress update message"""
    task_id: str
    status: ProgressStatus
    progress: float = 0.0  # 0-100
    message: Optional[str] = None
    current_step: Optional[str] = None
    total_steps: Optional[int] = None
    current_step_number: Optional[int] = None
    data: Optional[Dict[str, Any]] = None
    timestamp: float = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()


class ProgressManager:
    """
    Manages WebSocket connections and broadcasts progress messages.
    Designed to run in a separate thread from the main application.
    """

    def __init__(self):
        self.connections: List = []  # List of WebSocket connections
        self.active_tasks: Dict[str, ProgressMessage] = {}
        self._lock = threading.Lock()
        self._running = False
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._thread: Optional[threading.Thread] = None

    def start(self):
        """Start the progress manager in a separate thread"""
        if self._running:
            return

        self._running = True
        self._thread = threading.Thread(target=self._run_event_loop, daemon=True)
        self._thread.start()
        logger.info("Progress manager started in separate thread")

    def stop(self):
        """Stop the progress manager"""
        self._running = False
        if self._loop:
            asyncio.run_coroutine_threadsafe(self._stop_loop(), self._loop)
        if self._thread:
            self._thread.join(timeout=5)

    def _run_event_loop(self):
        """Run the asyncio event loop in the thread"""
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)

        try:
            self._loop.run_forever()
        finally:
            self._loop.close()

    async def _stop_loop(self):
        """Stop the event loop"""
        self._loop.stop()

    async def add_connection(self, websocket):
        """Add a new WebSocket connection"""
        with self._lock:
            self.connections.append(websocket)
            logger.info(f"Added WebSocket connection. Total connections: {len(self.connections)}")

        # Send current active tasks to the new connection
        for task_id, progress_msg in self.active_tasks.items():
            await self._send_to_connection(websocket, progress_msg)

    async def remove_connection(self, websocket):
        """Remove a WebSocket connection"""
        with self._lock:
            if websocket in self.connections:
                self.connections.remove(websocket)
                logger.info(f"Removed WebSocket connection. Total connections: {len(self.connections)}")

    async def _send_to_connection(self, websocket, message: ProgressMessage):
        """Send a message to a specific WebSocket connection"""
        try:
            message_dict = asdict(message)
            message_dict['status'] = message.status.value
            await websocket.send_text(json.dumps(message_dict))
        except Exception as e:
            logger.error(f"Error sending message to WebSocket: {e}")
            # Remove the connection if it's broken
            await self.remove_connection(websocket)

    async def _broadcast_message(self, message: ProgressMessage):
        """Broadcast a message to all connected WebSocket clients"""
        if not self.connections:
            return

        # Create a copy of connections to avoid modification during iteration
        connections_copy = list(self.connections)

        for websocket in connections_copy:
            await self._send_to_connection(websocket, message)

    def send_progress_update(self, message: ProgressMessage):
        """
        Send a progress update from any thread.
        This method is thread-safe and can be called from the main application thread.
        """
        if not self._running or not self._loop:
            logger.warning("Progress manager not running, cannot send update")
            return

        # Store the task state
        with self._lock:
            self.active_tasks[message.task_id] = message

        # Schedule the broadcast in the event loop
        asyncio.run_coroutine_threadsafe(
            self._broadcast_message(message),
            self._loop
        )

    def start_task(self, task_id: str, message: str = "", total_steps: Optional[int] = None):
        """Convenience method to start tracking a task"""
        progress_msg = ProgressMessage(
            task_id=task_id,
            status=ProgressStatus.STARTED,
            message=message,
            total_steps=total_steps
        )
        self.send_progress_update(progress_msg)

    def update_task_progress(self, task_id: str, progress: float, message: Optional[str] = None,
                           current_step: Optional[str] = None, current_step_number: Optional[int] = None,
                           data: Optional[List[Any]|Dict[str, Any]] = None):
        """Convenience method to update task progress"""
        # Get existing task info
        existing_task = self.active_tasks.get(task_id)
        total_steps = existing_task.total_steps if existing_task else None

        progress_msg = ProgressMessage(
            task_id=task_id,
            status=ProgressStatus.IN_PROGRESS,
            progress=progress,
            message=message,
            current_step=current_step,
            total_steps=total_steps,
            current_step_number=current_step_number,
            data=data
        )
        self.send_progress_update(progress_msg)

    def complete_task(self, task_id: str, message: str = "", data: Optional[List[Any]|Dict[str, Any]] = None, status: ProgressStatus = ProgressStatus.COMPLETED):
        """Convenience method to mark a task as completed"""
        progress_msg = ProgressMessage(
            task_id=task_id,
            status=status,
            progress=100.0,
            message=message,
            data=data
        )
        self.send_progress_update(progress_msg)

        # Remove from active tasks after a delay
        def cleanup():
            time.sleep(2)  # Keep completed status visible for 2 seconds
            with self._lock:
                self.active_tasks.pop(task_id, None)

        threading.Thread(target=cleanup, daemon=True).start()

    def fail_task(self, task_id: str, message: str = "", error_details: Optional[str] = None):
        """Convenience method to mark a task as errored"""
        self.complete_task(
            task_id,
            status=ProgressStatus.ERROR,
            message=f'{message}\nError details: {error_details or ''}')

    def update_task_progress_unified(self, unique_label: str, progress_01: float):
        """
        Unified progress update method for simple tasks.
        Auto-creates the task on progress_01=0 and finishes it on progress_01=1.
        label must be unique per task.
        """
        task_id = unique_label.replace(" ", "_").lower()
        if progress_01 <= 0:
            self.start_task(task_id, message=unique_label)
        elif progress_01 >= 1.0:
            self.complete_task(task_id, message=unique_label)
        else:
            self.update_task_progress(
                task_id,
                progress=progress_01 * 100,
                message=unique_label
            )

