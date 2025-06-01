import { useEffect, useRef, useCallback } from "react";

interface MediaPipeHandlerProps {
  onUpdate: (data: {
    handDetected: boolean;
    landmarksCount: number;
    trackingQuality: string;
    handPosition: string;
  }) => void;
  isRecording: boolean;
  assessmentType: string;
}

// MediaPipe hand landmark connections for drawing hand skeleton
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index finger
  [5, 9], [9, 10], [10, 11], [11, 12], // middle finger
  [9, 13], [13, 14], [14, 15], [15, 16], // ring finger
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17] // palm connection
];

export default function MediaPipeHandler({ onUpdate, isRecording, assessmentType }: MediaPipeHandlerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const handsRef = useRef<any>(null);
  const lastFrameTime = useRef<number>(0);

  // Initialize MediaPipe Hands
  const initializeMediaPipe = useCallback(async () => {
    try {
      // Import MediaPipe hands dynamically
      const { Hands } = await import('@mediapipe/hands');
      const { Camera } = await import('@mediapipe/camera_utils');

      handsRef.current = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      handsRef.current.onResults(onHandResults);

      return true;
    } catch (error) {
      console.error('MediaPipe initialization failed:', error);
      return false;
    }
  }, []);

  // Process MediaPipe hand tracking results
  const onHandResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let handDetected = false;
    let landmarks: any[] = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      handDetected = true;
      landmarks = results.multiHandLandmarks[0];

      // Draw hand landmarks
      ctx.fillStyle = '#00ff00';
      landmarks.forEach((landmark: any, index: number) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        // Draw landmark point
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Draw landmark number for debugging
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText(index.toString(), x + 5, y - 5);
        ctx.fillStyle = '#00ff00';
      });

      // Draw hand connections
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      HAND_CONNECTIONS.forEach(([start, end]) => {
        if (landmarks[start] && landmarks[end]) {
          ctx.beginPath();
          ctx.moveTo(landmarks[start].x * canvas.width, landmarks[start].y * canvas.height);
          ctx.lineTo(landmarks[end].x * canvas.width, landmarks[end].y * canvas.height);
          ctx.stroke();
        }
      });

      // Calculate hand center for position tracking
      const centerX = landmarks.reduce((sum: number, landmark: any) => sum + landmark.x, 0) / landmarks.length;
      const centerY = landmarks.reduce((sum: number, landmark: any) => sum + landmark.y, 0) / landmarks.length;

      // Update tracking information
      onUpdate({
        handDetected: true,
        landmarksCount: landmarks.length,
        trackingQuality: "Excellent",
        handPosition: `X: ${Math.round(centerX * 100)}%, Y: ${Math.round(centerY * 100)}%`
      });
    } else {
      // No hand detected
      onUpdate({
        handDetected: false,
        landmarksCount: 0,
        trackingQuality: "Poor",
        handPosition: "No hand detected"
      });
    }

    // Draw status text
    ctx.fillStyle = handDetected ? '#00ff00' : '#ff6666';
    ctx.font = '16px Arial';
    ctx.fillText(handDetected ? `Hand Tracked (${landmarks.length} joints)` : 'Position hand in view', 10, 30);
    
    if (handDetected) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText('MediaPipe hand tracking active', 10, 50);
    }
  }, [onUpdate]);

  // Process video frames with MediaPipe
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    
    if (!video || !handsRef.current || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const now = performance.now();
    
    // Throttle to 30 FPS
    if (now - lastFrameTime.current < 33) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }
    
    lastFrameTime.current = now;

    try {
      await handsRef.current.send({ image: video });
    } catch (error) {
      console.warn('Frame processing failed:', error);
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, []);

  useEffect(() => {
    const startSystem = async () => {
      try {
        // Start camera first
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Initialize MediaPipe
        const initialized = await initializeMediaPipe();
        
        if (initialized) {
          // Start processing frames
          processFrame();
        } else {
          // Fallback to basic hand detection if MediaPipe fails
          onUpdate({
            handDetected: false,
            landmarksCount: 0,
            trackingQuality: "Error",
            handPosition: "MediaPipe initialization failed"
          });
        }
      } catch (error) {
        console.error("Error starting hand tracking:", error);
        onUpdate({
          handDetected: false,
          landmarksCount: 0,
          trackingQuality: "Error",
          handPosition: "Camera access denied"
        });
      }
    };

    startSystem();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="w-full max-w-md mx-auto border-2 border-medical-primary rounded-lg"
        style={{ aspectRatio: '4/3' }}
      />
      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {isRecording ? "Recording..." : "Preview"}
      </div>
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
        MediaPipe Hand Tracking
      </div>
    </div>
  );
}