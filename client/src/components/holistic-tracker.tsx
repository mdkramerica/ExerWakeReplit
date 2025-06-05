import { useEffect, useRef, useCallback, useState } from "react";
import exerLogoPath from "@assets/exer-logo.png";

interface HolisticTrackerProps {
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

export default function HolisticTracker({ onUpdate, isRecording, assessmentType }: HolisticTrackerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const holisticRef = useRef<any>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [holisticInitialized, setHolisticInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const isWristAssessment = assessmentType.includes('wrist') || assessmentType.includes('flexion') || assessmentType.includes('extension');

  // Initialize MediaPipe Holistic for comprehensive tracking
  const initializeHolistic = useCallback(async () => {
    if (isInitializing || holisticInitialized) return;
    
    setIsInitializing(true);
    
    try {
      const { Holistic, HAND_CONNECTIONS, POSE_CONNECTIONS } = await import('@mediapipe/holistic');
      const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');

      const holisticInstance = new Holistic({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
      });

      holisticInstance.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        refineFaceLandmarks: false,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      holisticInstance.onResults((results: any) => {
        processHolisticResults(results, drawConnectors, drawLandmarks, HAND_CONNECTIONS, POSE_CONNECTIONS);
      });

      holisticRef.current = holisticInstance;
      setHolisticInitialized(true);
      console.log('MediaPipe Holistic initialized for comprehensive tracking');
      
    } catch (error) {
      console.error('Holistic initialization failed:', error);
      setHolisticInitialized(false);
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, holisticInitialized]);

  // Process holistic results with hand, pose, and elbow data
  const processHolisticResults = useCallback((results: any, drawConnectors: any, drawLandmarks: any, HAND_CONNECTIONS: any, POSE_CONNECTIONS: any) => {
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

    let handLandmarks: any[] = [];
    let poseLandmarks: any[] = [];
    let handDetected = false;
    let trackingQuality = "Poor";

    // Process pose landmarks (including elbow data)
    if (results.poseLandmarks) {
      poseLandmarks = results.poseLandmarks;
      
      // Draw pose connections with emphasis on arms
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      drawConnectors(ctx, poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
      ctx.restore();

      // Highlight key arm landmarks
      const armIndices = [11, 12, 13, 14, 15, 16]; // Shoulders, elbows, wrists
      armIndices.forEach(index => {
        const landmark = poseLandmarks[index];
        if (landmark && landmark.visibility > 0.5) {
          const x = landmark.x * canvas.width;
          const y = landmark.y * canvas.height;
          
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, 2 * Math.PI);
          ctx.fillStyle = index === 13 || index === 14 ? '#FF0000' : '#0080FF'; // Elbows in red
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      trackingQuality = "Good";
    }

    // Process hand landmarks
    if (results.leftHandLandmarks || results.rightHandLandmarks) {
      handDetected = true;
      
      // Use the hand with better tracking
      handLandmarks = results.rightHandLandmarks || results.leftHandLandmarks;
      
      if (handLandmarks) {
        // Draw hand connections and landmarks
        ctx.save();
        drawConnectors(ctx, handLandmarks, HAND_CONNECTIONS, { color: '#CC0000', lineWidth: 2 });
        drawLandmarks(ctx, handLandmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });
        ctx.restore();
        
        trackingQuality = poseLandmarks.length > 0 ? "Excellent" : "Good";
      }
    }

    // Add assessment guidance overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 320, 120);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText('MediaPipe Holistic Tracking', 20, 35);
    
    if (isWristAssessment) {
      ctx.fillStyle = '#00ff00';
      ctx.fillText('Comprehensive Hand + Pose Analysis', 20, 55);
      ctx.fillText('Elbow Reference: Active', 20, 75);
      
      if (poseLandmarks.length > 0 && handDetected) {
        ctx.fillStyle = '#ffff00';
        ctx.fillText('✓ Full body tracking enabled', 20, 95);
        ctx.fillText('✓ True forearm-to-hand angles', 20, 115);
      } else if (poseLandmarks.length > 0) {
        ctx.fillStyle = '#ff8800';
        ctx.fillText('✓ Pose detected, awaiting hand', 20, 95);
      } else if (handDetected) {
        ctx.fillStyle = '#ff8800';
        ctx.fillText('✓ Hand detected, awaiting pose', 20, 95);
      }
    }

    // Update parent component with comprehensive tracking data
    onUpdate({
      handDetected,
      landmarksCount: handLandmarks.length,
      trackingQuality,
      handPosition: handDetected ? "Holistic-tracked" : "Detecting",
      landmarks: handLandmarks.map((landmark: any) => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z
      })),
      poseLandmarks: poseLandmarks.map((landmark: any) => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        visibility: landmark.visibility
      }))
    });
  }, [isWristAssessment, onUpdate]);

  // Start camera and holistic processing
  const startCamera = useCallback(async () => {
    if (!holisticRef.current) return;
    
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
        console.log('Holistic camera ready for comprehensive tracking');
      };

      // Process video frames through holistic detection
      const processFrame = async () => {
        if (video.readyState === 4 && holisticRef.current) {
          await holisticRef.current.send({ image: video });
        }
        animationRef.current = requestAnimationFrame(processFrame);
      };

      processFrame();
      
    } catch (error) {
      console.error('Holistic camera initialization failed:', error);
      onUpdate({
        handDetected: false,
        landmarksCount: 0,
        trackingQuality: "Camera Error",
        handPosition: `Camera failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }, [onUpdate]);

  useEffect(() => {
    initializeHolistic();
  }, [initializeHolistic]);

  useEffect(() => {
    if (holisticInitialized && holisticRef.current) {
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
  }, [holisticInitialized, startCamera]);

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
          Holistic: {holisticInitialized ? 'Active' : 'Loading'}
        </div>
        {cameraReady && (
          <div className="text-blue-400">
            {isWristAssessment ? 'Elbow + Hand tracking' : 'Multi-modal ready'}
          </div>
        )}
      </div>
    </div>
  );
}