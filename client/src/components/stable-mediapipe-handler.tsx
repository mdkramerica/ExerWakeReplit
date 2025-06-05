import { useEffect, useRef, useCallback } from "react";
import exerLogoPath from "@assets/exer-logo.png";

interface StableMediaPipeProps {
  onUpdate: (data: {
    handDetected: boolean;
    landmarksCount: number;
    trackingQuality: string;
    handPosition: string;
    landmarks?: any[];
    wristAngles?: any;
  }) => void;
  isRecording: boolean;
  assessmentType: string;
}

// Hand landmark connections for drawing
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index finger
  [5, 9], [9, 10], [10, 11], [11, 12], // middle finger
  [9, 13], [13, 14], [14, 15], [15, 16], // ring finger
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17] // palm connection
];

export default function StableMediaPipeHandler({ onUpdate, isRecording, assessmentType }: StableMediaPipeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const handsRef = useRef<any>(null);
  const isWristAssessment = assessmentType.includes('wrist') || assessmentType.includes('flexion') || assessmentType.includes('extension');
  const isInitialized = useRef(false);

  // Calculate wrist angles using hand landmarks only
  const calculateWristAngles = useCallback((landmarks: any[]) => {
    try {
      if (!landmarks || landmarks.length < 21) return null;

      const wrist = landmarks[0]; // Wrist base
      const middleMcp = landmarks[9]; // Middle finger MCP joint
      const middleTip = landmarks[12]; // Middle finger tip
      
      if (!wrist || !middleMcp || !middleTip) return null;

      // Calculate angle between wrist-MCP and MCP-tip vectors
      const v1 = { x: wrist.x - middleMcp.x, y: wrist.y - middleMcp.y };
      const v2 = { x: middleTip.x - middleMcp.x, y: middleTip.y - middleMcp.y };
      
      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      
      if (mag1 === 0 || mag2 === 0) return null;

      const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
      const angle = Math.acos(cosAngle) * (180 / Math.PI);
      
      // Convert to flexion/extension based on angle
      const neutralAngle = 180;
      const flexionAngle = angle < neutralAngle ? Math.max(0, neutralAngle - angle) : 0;
      const extensionAngle = angle > neutralAngle ? Math.max(0, angle - neutralAngle) : 0;
      
      return {
        flexionAngle: Math.round(flexionAngle * 10) / 10,
        extensionAngle: Math.round(extensionAngle * 10) / 10,
        totalWristRom: Math.round((flexionAngle + extensionAngle) * 10) / 10
      };
    } catch (error) {
      console.warn('Wrist angle calculation error:', error);
      return null;
    }
  }, []);

  // Process hand tracking results
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
      if (video.readyState >= 2 && video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    } catch (error) {
      // Silently handle video drawing errors
    }

    let handDetected = false;
    let landmarks: any[] = [];
    let wristAngles = null;
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      handDetected = true;
      landmarks = results.multiHandLandmarks[0];

      // Draw hand landmarks
      ctx.fillStyle = '#00ff00';
      landmarks.forEach((landmark: any, index: number) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
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

      // Calculate wrist angles for wrist assessments
      if (isWristAssessment) {
        wristAngles = calculateWristAngles(landmarks);
      }

      // Update tracking information
      onUpdate({
        handDetected: true,
        landmarksCount: landmarks.length,
        trackingQuality: "Excellent",
        handPosition: `X: ${Math.round(centerX * 100)}%, Y: ${Math.round(centerY * 100)}%`,
        landmarks: landmarks,
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
  }, [isWristAssessment, calculateWristAngles, onUpdate]);

  // Initialize MediaPipe with error handling
  const initializeMediaPipe = useCallback(async () => {
    if (isInitialized.current) return true;

    try {
      console.log('Initializing stable MediaPipe...');
      
      return new Promise<boolean>((resolve) => {
        // Check if MediaPipe is already loaded
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
            isInitialized.current = true;
            console.log('MediaPipe initialized successfully');
            resolve(true);
            return;
          } catch (error) {
            console.warn('MediaPipe initialization failed:', error);
            resolve(false);
            return;
          }
        }

        // Load MediaPipe script
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
        script.crossOrigin = 'anonymous';
        
        const timeoutId = setTimeout(() => {
          console.warn('MediaPipe loading timeout');
          resolve(false);
        }, 15000);
        
        script.onload = () => {
          clearTimeout(timeoutId);
          
          const checkMediaPipe = (attempts = 0) => {
            if ((window as any).Hands && attempts < 30) {
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
                isInitialized.current = true;
                console.log('MediaPipe initialized successfully');
                resolve(true);
              } catch (error) {
                console.warn('MediaPipe setup failed:', error);
                resolve(false);
              }
            } else if (attempts < 30) {
              setTimeout(() => checkMediaPipe(attempts + 1), 200);
            } else {
              console.warn('MediaPipe not available after waiting');
              resolve(false);
            }
          };
          
          checkMediaPipe();
        };
        
        script.onerror = () => {
          clearTimeout(timeoutId);
          console.warn('Failed to load MediaPipe script');
          resolve(false);
        };
        
        if (!document.querySelector('script[src*="mediapipe/hands"]')) {
          document.head.appendChild(script);
        } else {
          // Script already exists, just check for availability
          const checkExisting = () => {
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
                isInitialized.current = true;
                resolve(true);
              } catch (error) {
                resolve(false);
              }
            } else {
              resolve(false);
            }
          };
          setTimeout(checkExisting, 100);
        }
      });
    } catch (error) {
      console.warn('MediaPipe initialization error:', error);
      return false;
    }
  }, [onHandResults]);

  // Animation loop
  const animate = useCallback(() => {
    const video = videoRef.current;
    
    if (!video || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    if (handsRef.current && isInitialized.current) {
      try {
        handsRef.current.send({ image: video });
      } catch (error) {
        // Silently handle send errors
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // Start camera
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
      await video.play();

      const success = await initializeMediaPipe();
      if (success) {
        animate();
      } else {
        console.warn('MediaPipe initialization failed, using camera only');
        animate(); // Still show camera feed
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
          <div className="text-green-400">Wrist tracking active</div>
        )}
      </div>
    </div>
  );
}