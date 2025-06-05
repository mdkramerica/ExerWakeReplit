import { useEffect, useRef, useCallback } from "react";
import exerLogoPath from "@assets/exer-logo.png";

interface ExerAIHandlerProps {
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

// Hand landmark connections for drawing hand skeleton
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index finger
  [5, 9], [9, 10], [10, 11], [11, 12], // middle finger
  [9, 13], [13, 14], [14, 15], [15, 16], // ring finger
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17] // palm connection
];

export default function ExerAIHandler({ onUpdate, isRecording, assessmentType }: ExerAIHandlerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const handsRef = useRef<any>(null);
  const poseRef = useRef<any>(null);
  const isWristAssessment = assessmentType.includes('wrist') || assessmentType.includes('flexion') || assessmentType.includes('extension');
  const currentPoseLandmarks = useRef<any[]>([]);

  // Initialize MediaPipe with enhanced wrist tracking
  const initializeMediaPipe = useCallback(async () => {
    console.log('Initializing MediaPipe with enhanced wrist tracking...');
    
    // Load MediaPipe Hands
    const handsLoaded = await new Promise<boolean>((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        console.log('MediaPipe Hands script loaded');
        
        const checkHands = (attempts = 0) => {
          if ((window as any).Hands) {
            try {
              const Hands = (window as any).Hands;
              handsRef.current = new Hands({
                locateFile: (file: string) => {
                  return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
                }
              });

              handsRef.current.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
                staticImageMode: false,
                selfieMode: true
              });

              handsRef.current.onResults(onHandResults);
              console.log('MediaPipe Hands initialized successfully');
              resolve(true);
            } catch (error) {
              console.error('Failed to initialize MediaPipe Hands:', error);
              resolve(false);
            }
          } else if (attempts < 50) {
            setTimeout(() => checkHands(attempts + 1), 100);
          } else {
            console.log('MediaPipe Hands not available after waiting');
            resolve(false);
          }
        };
        
        checkHands();
      };
      
      script.onerror = () => {
        console.error('Failed to load MediaPipe Hands script');
        resolve(false);
      };
      
      document.head.appendChild(script);
    });

    // Skip pose loading for now to prevent memory access errors
    // Wrist assessment will use hand landmarks only
    if (isWristAssessment) {
      console.log('Wrist assessment mode: using hand landmarks only for stability');
    }

    return handsLoaded;
  }, [isWristAssessment]);

  // Process pose tracking results
  const onPoseResults = useCallback((results: any) => {
    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
      currentPoseLandmarks.current = results.poseLandmarks;
      console.log(`Pose detected with ${results.poseLandmarks.length} landmarks`);
    } else {
      currentPoseLandmarks.current = [];
    }
  }, []);

  // Process hand tracking results with enhanced wrist calculation
  const onHandResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw video frame
    try {
      if (video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    } catch (error) {
      console.warn('Video drawing error:', error);
    }

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

      // Calculate hand center
      const centerX = landmarks.reduce((sum: number, landmark: any) => sum + landmark.x, 0) / landmarks.length;
      const centerY = landmarks.reduce((sum: number, landmark: any) => sum + landmark.y, 0) / landmarks.length;

      // Enhanced wrist angle calculation for wrist assessments
      let wristAngles = null;
      if (isWristAssessment && landmarks.length >= 21) {
        try {
          // Basic wrist angle calculation using hand landmarks only for now
          // This avoids the memory access error while still providing wrist data
          const wrist = landmarks[0]; // Wrist base
          const middleMcp = landmarks[9]; // Middle finger MCP joint
          const middleTip = landmarks[12]; // Middle finger tip
          
          if (wrist && middleMcp && middleTip) {
            // Simple angle calculation between wrist, MCP, and finger tip
            const v1 = { x: wrist.x - middleMcp.x, y: wrist.y - middleMcp.y };
            const v2 = { x: middleTip.x - middleMcp.x, y: middleTip.y - middleMcp.y };
            
            const dot = v1.x * v2.x + v1.y * v2.y;
            const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
            
            if (mag1 > 0 && mag2 > 0) {
              const angle = Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))) * (180 / Math.PI);
              const flexionAngle = Math.max(0, 180 - angle);
              const extensionAngle = Math.max(0, angle - 180);
              
              wristAngles = {
                flexionAngle,
                extensionAngle,
                totalWristRom: flexionAngle + extensionAngle
              };
            }
          }
        } catch (error) {
          console.warn('Wrist calculation failed:', error);
        }
      }

      // Update tracking information
      onUpdate({
        handDetected: true,
        landmarksCount: landmarks.length,
        trackingQuality: "Excellent",
        handPosition: `X: ${Math.round(centerX * 100)}%, Y: ${Math.round(centerY * 100)}%`,
        landmarks: landmarks,
        poseLandmarks: currentPoseLandmarks.current,
        wristAngles: wristAngles
      });
    } else {
      onUpdate({
        handDetected: false,
        landmarksCount: 0,
        trackingQuality: "Poor",
        handPosition: "No hand detected"
      });
    }
  }, [isWristAssessment, onUpdate]);

  // Animation loop for continuous tracking
  const animate = useCallback(() => {
    const video = videoRef.current;
    
    if (!video || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    // Send frame to hand detection only for stability
    if (handsRef.current) {
      try {
        handsRef.current.send({ image: video });
      } catch (error) {
        console.warn('MediaPipe send error:', error);
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [isWristAssessment]);

  // Start camera and initialize MediaPipe
  const startCamera = useCallback(async () => {
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
      video.play();

      video.onloadedmetadata = () => {
        console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
      };

      const success = await initializeMediaPipe();
      if (success) {
        animate();
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      onUpdate({
        handDetected: false,
        landmarksCount: 0,
        trackingQuality: "Camera Error",
        handPosition: `Camera failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }, [initializeMediaPipe, animate, onUpdate]);

  useEffect(() => {
    startCamera();

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
  }, [startCamera]);

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
        Assessment: {assessmentType}
        {isWristAssessment && (
          <div className="text-green-400">Enhanced wrist tracking active</div>
        )}
      </div>
    </div>
  );
}