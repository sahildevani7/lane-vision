# Lane Vision

![Work In Progress](https://img.shields.io/badge/Status-Work%20In%20Progress-yellow)

Lane Vision is a real-time lane detection application designed to process video streams and identify road lanes using computer vision techniques. This full-stack web application combines computer vision algorithms with a responsive user interface.

<img width="1458" alt="lanevision" src="https://github.com/user-attachments/assets/0d9419cd-7059-4db9-9c03-b80109e407b2" />


## Features

- Real-time lane detection on video streams
- Web-based visualization of processed images
- WebSocket-based communication for low-latency processing

## Technology Stack

### Frontend
- React.js
- Socket.io client
- Modern responsive UI

### Backend
- Flask web server
- OpenCV for image processing
- NumPy for numerical computations
- Flask-SocketIO for real-time communication

## Getting Started

### Backend Setup
1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Start the server:
   ```
   python app.py
   ```
   The server will run on http://localhost:5001

### Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```
   The application will be available at http://localhost:3000


