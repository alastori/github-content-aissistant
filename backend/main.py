from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
import uuid # Keep uuid import as it's used in routes.py now

# Import config first to ensure it loads/validates early
try:
    from config import CONFIG
except ImportError:
     # Handle case where config fails critically during import
     print("CRITICAL ERROR: Could not import configuration. Exiting.")
     import sys
     sys.exit(1)
except SystemExit as e:
     # Config validation failed, exit
     print(f"Exiting due to configuration error: {e}")
     import sys
     sys.exit(1)


# --- Flask App Setup ---
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app) # Allow all origins for all routes

# Import and register routes AFTER app and socketio are created
# to avoid circular dependencies if routes import socketio from main
try:
    from routes import api_bp
    app.register_blueprint(api_bp)
    print("API routes registered.")
except ImportError as e:
     print(f"CRITICAL ERROR: Could not import or register API blueprint: {e}")
     import sys
     sys.exit(1)


# Import and register SocketIO handlers AFTER app and socketio are created
try:
    from socket_handlers import register_socketio_handlers
    register_socketio_handlers(socketio)
except ImportError as e:
     print(f"CRITICAL ERROR: Could not import or register SocketIO handlers: {e}")
     import sys
     sys.exit(1)


# --- Main Execution ---
if __name__ == '__main__':
    # Use socketio.run() instead of app.run()
    print("Starting Flask-SocketIO server...")
    # Note: allow_unsafe_werkzeug=True might be needed for debug mode with older SocketIO/Werkzeug versions
    # but try without it first for better security practice if possible with current versions.
    # socketio.run(app, debug=True, port=5001, allow_unsafe_werkzeug=True)
    socketio.run(app, debug=True, port=5001)
