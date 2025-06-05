import { useEffect, useRef, useCallback, useState } from "react";
import exerLogoPath from "@assets/exer-logo.png";

interface RealHandTrackerProps {
  onUpdate: (data: {
    handDetected: boolean;
    landmarksCount: number;
    trackingQuality: string;
    handPosition: string;
    landmarks?: any[];
    poseLandmarks?: any[];
    wristAngles?: any;
  }) => void;
  isRecording: boolean;
  assessmentType: string;
}

export default function RealHandTracker({ onUpdate, isRecording, assessmentType }: RealHandTrackerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const handsRef = useRef<any>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [handsInitialized, setHandsInitialized] = useState(false);
  const isWristAssessment = assessmentType.includes('wrist') || assessmentType.includes('flexion') || assessmentType.includes('extension');

  // Initialize MediaPipe Hands
  const initializeHands = useCallback(async () => {
    try {
      const { Hands, HAND_CONNECTIONS } = await import('@mediapipe/hands');
      const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');

      const hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      hands.onResults((results: any) => {
        processHandResults(results, drawConnectors, drawLandmarks, HAND_CONNECTIONS);
      });

      handsRef.current = hands;
      setHandsInitialized(true);
      console.log('MediaPipe Hands initialized');
      
    } catch (error) {
      console.error('Hands initialization failed:', error);
    }
  }, []);

  // Process hand detection results
  const processHandResults = useCallback((results: any, drawConnectors: any, drawLandmarks: any, HAND_CONNECTIONS: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Clear and draw video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let handDetected = false;
    let landmarks: any[] = [];
    let trackingQuality = "No Hand Detected";

    // Process actual hand detection results
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      handDetected = true;
      landmarks = results.multiHandLandmarks[0];
      trackingQuality = "Good";

      // Draw hand landmarks and connections
      drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#CC0000', lineWidth: 2 });
      drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });

      // Convert landmarks to normalized format
      landmarks = landmarks.map((landmark: any) => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z
      }));
    }

    // Add assessment guidance overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 300, 120);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText('MediaPipe Hand Tracking', 20, 35);
    
    if (handDetected) {
      ctx.fillStyle = '#00ff00';
      ctx.fillText('✓ Hand Detected', 20, 55);
      
      if (isWristAssessment) {
        ctx.fillText('Move wrist through full range', 20, 75);
        ctx.fillText('Flexion → Extension', 20, 95);
      }
    } else {
      ctx.fillStyle = '#ff8800';
      ctx.fillText('Show your hand to camera', 20, 55);
      ctx.fillText('Position hand clearly in view', 20, 75);
    }

    // Update parent component
    onUpdate({
      handDetected,
      landmarksCount: landmarks.length,
      trackingQuality,
      handPosition: handDetected ? "Tracked" : "Not Detected",
      landmarks: landmarks.length > 0 ? landmarks : undefined
    });
  }, [isWristAssessment, onUpdate]);

  // Start camera
  const startCamera = useCallback(async () => {
    if (!handsRef.current) return;
    
    try {
      const video = videoRef.current;
      if (!video) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      video.srcObject = stream;
      await video.play();
      
      video.onloadedmetadata = () => {
        setCameraReady(true);
        console.log('Camera ready for hand tracking');
      };

      // Process video frames through hand detection
      const processFrame = async () => {
        if (video.readyState === 4 && handsRef.current) {
          await handsRef.current.send({ image: video });
        }
        animationRef.current = requestAnimationFrame(processFrame);
      };

      processFrame();
      
    } catch (error) {
      console.error('Camera initialization failed:', error);
      onUpdate({
        handDetected: false,
        landmarksCount: 0,
        trackingQuality: "Camera Error",
        handPosition: `Camera failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }, [onUpdate]);

  useEffect(() => {
    initializeHands();
  }, [initializeHands]);

  useEffect(() => {
    if (handsInitialized && handsRef.current) {
      startCamera();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      const video = videoRef.current;
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [handsInitialized, startCamera]);

  return (
    <div className="relative w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="hidden"
        autoPlay
        muted
        playsInline
      />
      
      <canvas
        ref={canvasRef}
        className="w-full h-auto"
        style={{ maxHeight: '400px' }}
      />
      
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 rounded px-2 py-1">
        <img 
          src={exerLogoPath} 
          alt="Exer AI" 
          className="h-6 w-auto opacity-80"
        />
      </div>
      
      <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 rounded px-2 py-1 text-white text-xs">
        <div>Assessment: {assessmentType}</div>
        <div className="text-green-400">
          Hands: {handsInitialized ? 'Active' : 'Loading'}
        </div>
        {cameraReady && (
          <div className="text-blue-400">
            Real-time hand detection
          </div>
        )}
      </div>
    </div>
  );
}