import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import './App.css';

const SOCKET_URL = 'http://localhost:5001'; 

function App() {
    const [socket, setSocket] = useState(null);
    const [processedImage, setProcessedImage] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [isVideoUploaded, setIsVideoUploaded] = useState(false);
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [processingProgress, setProcessingProgress] = useState(false);
    const [videoEnded, setVideoEnded] = useState(false);

    const videoRef = useRef(null);      // For displaying uploaded video feed
    const canvasRef = useRef(null);     // For grabbing frames to send
    const requestRef = useRef(null);    // For requestAnimationFrame

    // ---- WebSocket Connection ----
    useEffect(() => {
        // Connect to WebSocket server
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to WebSocket server');
            setErrorMessage('');
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            setErrorMessage('Disconnected from server. Trying to reconnect...');
            // Stop streaming if server disconnects
            if (isStreaming) {
                stopStreaming();
            }
        });

        newSocket.on('connect_error', (err) => {
            console.error('Connection Error:', err);
            setErrorMessage(`Cannot connect to server: ${err.message}. Ensure backend is running at ${SOCKET_URL}`);
            setIsStreaming(false);
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        });

        // Listen for processed frames from the backend
        newSocket.on('response_back', (image_data) => {
            setProcessedImage(image_data);
            if (isStreaming && !videoEnded) {
               requestRef.current = requestAnimationFrame(captureAndSendFrame);
            }
        });

        // Listen for potential errors from backend processing
        newSocket.on('processing_error', (error) => {
            console.error('Backend Processing Error:', error);
            setErrorMessage(`Backend Error: ${error.error}`);
        });

        // Cleanup on component unmount
        return () => {
            console.log("Cleaning up WebSocket connection");
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            newSocket.disconnect();
        };
    }, [SOCKET_URL, isStreaming, videoEnded]); 

    // ---- Frame Capturing and Sending ----
    const captureAndSendFrame = useCallback(() => {
        if (!socket || !videoRef.current || !canvasRef.current) {
            requestRef.current = requestAnimationFrame(captureAndSendFrame);
            return;
        }
        
        const video = videoRef.current;
        
        // Check if video is actually ready to provide frames
        if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
            requestRef.current = requestAnimationFrame(captureAndSendFrame);
            return;
        }

        // Check if video has ended
        if (video.ended || video.paused) {
            setVideoEnded(true);
            setIsStreaming(false);
            setProcessingProgress(false);
            console.log("Video playback has ended");
            return;
        }

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current video frame onto the canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get the image data from the canvas as a Base64 encoded JPEG
        const frameData = canvas.toDataURL('image/jpeg', 0.8);

        // Send the frame data to the backend via WebSocket
        socket.emit('image', frameData);
    }, [socket]);

    // ---- Stop Streaming ----
    const stopStreaming = () => {
        console.log("Stopping processing...");
        setIsStreaming(false);
        setProcessingProgress(false);
        
        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.pause();
  
        }
    };

    // ---- Video Upload Handling ----
    const handleVideoUpload = (event) => {
        stopStreaming(); // Stop any current streaming first
        setVideoEnded(false); // Reset video ended state
        setProcessedImage(''); // Clear any processed image
        
        const file = event.target.files[0];
        
        if (file && videoRef.current) {
            const videoURL = URL.createObjectURL(file);
            videoRef.current.src = videoURL;
            videoRef.current.muted = true;
            videoRef.current.loop = false;
            
            setUploadedFileName(file.name);
            setIsVideoUploaded(true);
            setErrorMessage('');
            
            videoRef.current.onloadedmetadata = () => {
                console.log("Video file loaded, ready to process.");
            };
            
            videoRef.current.onended = () => {
                console.log("Video file finished.");
                setVideoEnded(true);
                setIsStreaming(false);
                setProcessingProgress(false);
            };
            
            videoRef.current.onerror = (e) => {
                console.error("Video playback error:", e);
                setErrorMessage("Error playing the selected video file.");
                stopStreaming();
            };
        }
    };

    // Process the uploaded video
    const processVideo = () => {
        if (!isVideoUploaded || !videoRef.current) {
            setErrorMessage("Please upload a video first.");
            return;
        }
        
        try {
            // Reset the video position to start
            videoRef.current.currentTime = 0;
            setVideoEnded(false);
            
            videoRef.current.play().catch(err => console.error("Play error:", err));
            setIsStreaming(true);
            setProcessingProgress(true);
            setProcessedImage('');
            setErrorMessage('');
            
            // Start sending frames
            requestRef.current = requestAnimationFrame(captureAndSendFrame);
            console.log("Started processing the video.");
        } catch (err) {
            console.error("Error processing video:", err);
            setErrorMessage(`Error processing video: ${err.message}`);
        }
    };

    // Restart the video processing
    const restartVideo = () => {
        if (videoRef.current) {
            processVideo();
        }
    };

    return (
        <div className="App">
            <header className="app-header">
                <h1>LaneVision</h1>
                <p className="app-subtitle">Advanced lane detection for roadway safety</p>
            </header>
            
            {errorMessage && <div className="error-message">{errorMessage}</div>}

            <div className="main-container">
                <div className="upload-section">
                    <h2>Video Upload</h2>
                    <p className="upload-description">Upload a video to detect lane lines.</p>
                    
                    <div className="upload-controls">
                        <div className="file-input-container">
                            <input 
                                type="file" 
                                id="videoUpload" 
                                className="file-input"
                                accept="video/*" 
                                onChange={handleVideoUpload} 
                                disabled={isStreaming}
                            />
                            <label htmlFor="videoUpload" className="file-input-label">
                                Choose File {uploadedFileName && <span className="file-name">{uploadedFileName}</span>}
                            </label>
                        </div>
                        
                        <button 
                            className="process-btn" 
                            onClick={processVideo} 
                            disabled={!isVideoUploaded || isStreaming}
                        >
                            Process Video
                        </button>
                        
                        {isStreaming && (
                            <button 
                                className="stop-btn" 
                                onClick={stopStreaming}
                            >
                                Stop Processing
                            </button>
                        )}
                        
                        {videoEnded && processedImage && (
                            <button 
                                className="restart-btn" 
                                onClick={restartVideo}
                            >
                                Restart Video
                            </button>
                        )}
                    </div>
                    
                    {processingProgress && !videoEnded && <p className="status-message">Processing video...</p>}
                    {videoEnded && processedImage && <p className="status-message success">Video processing complete!</p>}
                </div>

                <div className="video-display">
                    {!processedImage ? (
                        <div className="video-player">
                            <video ref={videoRef} playsInline className="video-element"></video>
                            {!isVideoUploaded && (
                                <div className="placeholder-overlay">
                                    <span>Upload a video to begin</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="processed-result">
                            <img src={processedImage} alt="Processed Frame" className="result-image"/>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden canvas used for grabbing frames */}
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        </div>
    );
}

export default App;