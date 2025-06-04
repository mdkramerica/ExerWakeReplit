import { useCallback, useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

interface TensorFlowHandTrackerProps {
  className?: string;
}

interface HandPrediction {
  landmarks: number[][];
  handInViewConfidence: number;
}

export default function TensorFlowHandTracker({ className = "w-full h-48" }: TensorFlowHandTrackerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modelRef = useRef<handpose.HandPose | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [handsDetected, setHandsDetected] = useState(0);
  const [isTracking, setIsTracking] = useState(false);

  // Draw hand landmarks on canvas
  const drawHandLandmarks = useCallback((canvas: HTMLCanvasElement, predictions: HandPrediction[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setHandsDetected(predictions.length);

    if (predictions.length > 0) {
      predictions.forEach((prediction, handIndex) => {
        const landmarks = prediction.landmarks;

        // Define hand connections (21-point hand model)
        const fingerJoints = {
          thumb: [0, 1, 2, 3, 4],
          indexFinger: [0, 5, 6, 7, 8],
          middleFinger: [0, 9, 10, 11, 12],
          ringFinger: [0, 13, 14, 15, 16],
          pinky: [0, 17, 18, 19, 20]
        };

        // Draw finger connections
        ctx.strokeStyle = `hsl(${handIndex * 60 + 120}, 80%, 60%)`;
        ctx.lineWidth = 2;

        Object.values(fingerJoints).forEach(finger => {
          ctx.beginPath();
          finger.forEach((pointIndex, i) => {
            const point = landmarks[pointIndex];
            if (i === 0) {
              ctx.moveTo(point[0], point[1]);
            } else {
              ctx.lineTo(point[0], point[1]);
            }
          });
          ctx.stroke();
        });

        // Draw palm connections
        ctx.beginPath();
        [0, 5, 9, 13, 17, 0].forEach((pointIndex, i) => {
          const point = landmarks[pointIndex];
          if (i === 0) {
            ctx.moveTo(point[0], point[1]);
          } else {
            ctx.lineTo(point[0], point[1]);
          }
        });
        ctx.stroke();

        // Draw individual landmarks with different colors
        landmarks.forEach((landmark, index) => {
          const [x, y] = landmark;
          
          let color = '#ffffff';
          if (index >= 1 && index <= 4) color = '#ff6b6b'; // Thumb
          else if (index >= 5 && index <= 8) color = '#4ecdc4'; // Index
          else if (index >= 9 && index <= 12) color = '#45b7d1'; // Middle
          else if (index >= 13 && index <= 16) color = '#96ceb4'; // Ring
          else if (index >= 17 && index <= 20) color = '#feca57'; // Pinky
          else if (index === 0) color = '#ff9ff3'; // Wrist
          
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(x, y, index === 0 ? 8 : 5, 0, 2 * Math.PI);
          ctx.fill();
        });
        ctx.shadowBlur = 0;
      });
    }

    // Add overlay information
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, 100);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('TensorFlow.js Hand Tracking', 10, 25);
    
    ctx.font = '14px Arial';
    ctx.fillStyle = handsDetected > 0 ? '#4ecdc4' : '#cccccc';
    ctx.fillText(`Hands Detected: ${handsDetected}`, 10, 45);
    
    ctx.font = '12px Arial';
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText('21-point landmark analysis', 10, 65);
    
    if (handsDetected > 0) {
      ctx.fillStyle = '#feca57';
      ctx.fillText('Real-time hand pose estimation', 10, 85);
    }
  }, [handsDetected]);

  // Start hand detection loop
  const detectHands = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const model = modelRef.current;

    if (!video || !canvas || !model || !isModelLoaded) {
      animationRef.current = requestAnimationFrame(detectHands);
      return;
    }

    if (video.readyState === 4) {
      try {
        const predictions = await model.estimateHands(video);
        drawHandLandmarks(canvas, predictions as HandPrediction[]);
      } catch (error) {
        console.warn('Hand detection error:', error);
      }
    }

    animationRef.current = requestAnimationFrame(detectHands);
  }, [isModelLoaded, drawHandLandmarks]);

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsTracking(true);
          console.log('Camera initialized for hand tracking');
        };
      }
      
      return true;
    } catch (error) {
      console.error('Camera initialization failed:', error);
      return false;
    }
  }, []);

  // Initialize TensorFlow.js and HandPose model
  const initializeModel = useCallback(async () => {
    try {
      console.log('Loading TensorFlow.js HandPose model...');
      
      // Set TensorFlow.js backend
      await tf.ready();
      console.log('TensorFlow.js backend:', tf.getBackend());
      
      // Load HandPose model
      const model = await handpose.load();
      modelRef.current = model;
      setIsModelLoaded(true);
      
      console.log('HandPose model loaded successfully');
      
      // Initialize camera
      const cameraSuccess = await initializeCamera();
      
      if (cameraSuccess) {
        // Start detection loop
        detectHands();
      }
      
    } catch (error) {
      console.error('Model initialization failed:', error);
      setIsModelLoaded(false);
    }
  }, [initializeCamera, detectHands]);

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
        ctx.fillText('Loading Hand Tracking Model...', 20, 50);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#cccccc';
        ctx.fillText('Initializing TensorFlow.js...', 20, 75);
      }
    }

    initializeModel();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      // Model cleanup handled by TensorFlow.js
    };
  }, [initializeModel]);

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
        <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
          {isModelLoaded && isTracking ? 'TENSORFLOW ACTIVE' : 'LOADING MODEL...'}
        </div>
        
        {handsDetected > 0 && (
          <div className="absolute top-2 right-2 bg-green-500/90 px-2 py-1 rounded text-xs text-white">
            {handsDetected} Hand{handsDetected > 1 ? 's' : ''} Tracked
          </div>
        )}
        
        {isModelLoaded && isTracking && handsDetected === 0 && (
          <div className="absolute bottom-2 left-2 bg-blue-500/80 px-2 py-1 rounded text-xs text-white">
            Show hand to camera
          </div>
        )}
      </div>
    </div>
  );
}