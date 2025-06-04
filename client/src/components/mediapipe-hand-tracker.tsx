import { useCallback, useEffect, useRef, useState } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

interface MediaPipeHandTrackerProps {
  className?: string;
}

export default function MediaPipeHandTracker({ className = "w-full h-48" }: MediaPipeHandTrackerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [handsDetected, setHandsDetected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  // Draw hand landmarks on canvas
  const drawHandLandmarks = useCallback((canvas: HTMLCanvasElement, results: Results) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setHandsDetected(results.multiHandLandmarks.length);

      results.multiHandLandmarks.forEach((landmarks, handIndex) => {
        // Define hand landmark connections (MediaPipe hand model)
        const connections = [
          // Thumb
          [0, 1], [1, 2], [2, 3], [3, 4],
          // Index finger
          [0, 5], [5, 6], [6, 7], [7, 8],
          // Middle finger
          [0, 9], [9, 10], [10, 11], [11, 12],
          // Ring finger
          [0, 13], [13, 14], [14, 15], [15, 16],
          // Little finger
          [0, 17], [17, 18], [18, 19], [19, 20],
          // Palm
          [5, 9], [9, 13], [13, 17]
        ];

        // Draw connections
        ctx.strokeStyle = `hsl(${handIndex * 60}, 70%, 60%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        connections.forEach(([start, end]) => {
          const startPoint = landmarks[start];
          const endPoint = landmarks[end];
          
          ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
          ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        });
        ctx.stroke();

        // Draw landmark points
        landmarks.forEach((landmark, index) => {
          const x = landmark.x * canvas.width;
          const y = landmark.y * canvas.height;
          
          // Different colors for different finger parts
          let color = '#ffffff';
          if (index >= 1 && index <= 4) color = '#ff6666'; // Thumb
          else if (index >= 5 && index <= 8) color = '#66ff66'; // Index
          else if (index >= 9 && index <= 12) color = '#6666ff'; // Middle
          else if (index >= 13 && index <= 16) color = '#ffff66'; // Ring
          else if (index >= 17 && index <= 20) color = '#ff66ff'; // Little
          else if (index === 0) color = '#66ffff'; // Wrist
          
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(x, y, index === 0 ? 8 : 5, 0, 2 * Math.PI);
          ctx.fill();
        });
        ctx.shadowBlur = 0;
      });
    } else {
      setHandsDetected(0);
    }

    // Add overlay information
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, 100);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('MediaPipe Hand Tracking', 10, 25);
    
    ctx.font = '14px Arial';
    ctx.fillStyle = handsDetected > 0 ? '#00ff00' : '#cccccc';
    ctx.fillText(`Hands Detected: ${handsDetected}`, 10, 45);
    
    ctx.font = '12px Arial';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('21-point landmark analysis active', 10, 65);
    
    if (handsDetected > 0) {
      ctx.fillStyle = '#ffff00';
      ctx.fillText('Move your hand to see real-time tracking', 10, 85);
    }
  }, [handsDetected]);

  // Initialize MediaPipe Hands
  const initializeMediaPipe = useCallback(async () => {
    try {
      const hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults((results: Results) => {
        const canvas = canvasRef.current;
        if (canvas) {
          drawHandLandmarks(canvas, results);
        }
      });

      handsRef.current = hands;

      // Initialize camera
      const video = videoRef.current;
      if (video) {
        const camera = new Camera(video, {
          onFrame: async () => {
            if (handsRef.current) {
              await handsRef.current.send({ image: video });
            }
          },
          width: 640,
          height: 480
        });

        cameraRef.current = camera;
        await camera.start();
        
        setIsInitialized(true);
        setError(null);
        console.log('MediaPipe hand tracking initialized successfully');
      }
    } catch (error) {
      console.error('MediaPipe initialization failed:', error);
      setError('Failed to initialize hand tracking');
      setIsInitialized(false);
    }
  }, [drawHandLandmarks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 640;
      canvas.height = 480;
      
      // Show loading state
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Initializing MediaPipe...', 20, 50);
      }
    }

    initializeMediaPipe();

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (handsRef.current) {
        handsRef.current.close();
      }
    };
  }, [initializeMediaPipe]);

  return (
    <div className={className}>
      <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-gray-700">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
          width={640}
          height={480}
        />
        
        <video
          ref={videoRef}
          className="hidden"
          width={640}
          height={480}
          autoPlay
          muted
          playsInline
        />
        
        {/* Status indicators */}
        <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
          {isInitialized ? 'MEDIAPIPE ACTIVE' : 'INITIALIZING...'}
        </div>
        
        {handsDetected > 0 && (
          <div className="absolute top-2 right-2 bg-green-500/80 px-2 py-1 rounded text-xs text-white">
            {handsDetected} Hand{handsDetected > 1 ? 's' : ''} Tracked
          </div>
        )}
        
        {error && (
          <div className="absolute bottom-2 left-2 bg-red-500/80 px-2 py-1 rounded text-xs text-white">
            {error}
          </div>
        )}
        
        {isInitialized && handsDetected === 0 && (
          <div className="absolute bottom-2 center-2 bg-blue-500/80 px-2 py-1 rounded text-xs text-white">
            Show your hand to camera
          </div>
        )}
      </div>
    </div>
  );
}