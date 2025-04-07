from flask import request
from flask_socketio import emit, join_room, leave_room

# Import the shared cancelled_tasks dictionary and socketio instance
# This assumes main.py initializes socketio before this module is imported
try:
    # Use absolute imports relative to backend root
    from background_tasks import cancelled_tasks
    # emit is globally available within socketio context, no need to import socketio instance here
except ImportError as e:
    print(f"CRITICAL Error importing modules in socket_handlers.py: {e}")
    cancelled_tasks = {} # Fallback


def register_socketio_handlers(socketio):
    """Registers SocketIO event handlers."""

    @socketio.on('connect')
    def handle_connect():
        """Handle new WebSocket connections."""
        print(f'Client connected: {request.sid}')

    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle WebSocket disconnections."""
        print(f'Client disconnected: {request.sid}')
        # Potential cleanup logic here if needed

    @socketio.on('join')
    def on_join(data):
        """Client joins a room associated with a task ID."""
        task_id = data.get('task_id')
        if task_id:
            join_room(task_id)
            print(f'Client {request.sid} joined room {task_id}')
        else:
            print(f'Client {request.sid} tried to join without task_id')

    @socketio.on('leave')
    def on_leave(data):
        """Client leaves a room."""
        task_id = data.get('task_id')
        if task_id:
            leave_room(task_id)
            print(f'Client {request.sid} left room {task_id}')
        else:
            print(f'Client {request.sid} tried to leave without task_id')

    @socketio.on('cancel_task')
    def handle_cancel_task(data):
        """Handle request from client to cancel a task."""
        task_id = data.get('task_id')
        if task_id:
            print(f'Received cancel request for task_id: {task_id} from {request.sid}')
            # Use the imported dictionary
            cancelled_tasks[task_id] = True
            emit('task_cancelled_ack', {'task_id': task_id}, room=request.sid)  # Acknowledge cancellation request
        else:
            print(f'Received cancel request without task_id from {request.sid}')

    print("SocketIO handlers registered.")
