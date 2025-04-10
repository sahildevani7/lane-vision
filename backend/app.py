import eventlet 
eventlet.monkey_patch() 


import base64
import cv2
import numpy as np
from flask import Flask, render_template, Response, request
from flask_socketio import SocketIO, emit

from lane_detector import detect_lanes 


app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret_key!'
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000", async_mode='eventlet')

print("Flask-SocketIO server starting...")

@app.route('/')
def index():
    return "Lane Detection Backend Running. Connect via WebSocket."

@socketio.on('connect')
def handle_connect():
    print('Client connected:', request.sid) 

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected:', request.sid)

@socketio.on('image')
def handle_image(data):
    try:
        header, encoded = data.split(',', 1)
        img_bytes = base64.b64decode(encoded)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            print("Failed to decode frame")
            emit('processing_error', {'error': 'Failed to decode frame'})
            return

        processed_frame = detect_lanes(frame)

        is_success, buffer = cv2.imencode(".jpg", processed_frame)
        if not is_success:
            print("Failed to encode frame")
            emit('processing_error', {'error': 'Failed to encode processed frame'})
            return

        encoded_image = base64.b64encode(buffer).decode('utf-8')

        emit('response_back', 'data:image/jpeg;base64,' + encoded_image)

    except Exception as e:
        print(f"Error handling image: {e}")
        emit('processing_error', {'error': str(e)})


if __name__ == '__main__':
    new_port = 5001 
    print(f"Starting server on http://localhost:{new_port}")
    socketio.run(app, host='0.0.0.0', port=new_port, debug=True, use_reloader=True)