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

// Exer AI hand landmark connections for drawing hand skeleton
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
  const lastFrameTime = useRef<number>(0);
  const prevIsRecording = useRef(isRecording);
  const isArmAssessment = assessmentType.includes('shoulder') || assessmentType.includes('elbow') || assessmentType.includes('arm');
  const isWristAssessment = assessmentType.includes('wrist') || assessmentType.includes('flexion') || assessmentType.includes('extension');
  const previousLandmarks = useRef<any[]>([]);
  const frameConfidenceScores = useRef<number[]>([]);
  const currentPoseLandmarks = useRef<any[]>([]);

  // Calculate tracking confidence for finger stability
  const calculateFingerConfidence = (landmarks: any[], fingerIndices: number[]) => {
    if (!previousLandmarks.current.length || !landmarks.length) {
      return { confidence: 1.0, reason: 'initial_frame' };
    }

    let totalMovement = 0;
    let validPoints = 0;

    // Check movement for each finger joint
    for (const index of fingerIndices) {
      if (landmarks[index] && previousLandmarks.current[index]) {
        const current = landmarks[index];
        const previous = previousLandmarks.current[index];
        
        // Calculate Euclidean distance between frames
        const distance = Math.sqrt(
          Math.pow(current.x - previous.x, 2) + 
          Math.pow(current.y - previous.y, 2) + 
          Math.pow(current.z - previous.z, 2)
        );
        
        totalMovement += distance;
        validPoints++;
      }
    }

    if (validPoints === 0) {
      return { confidence: 0.0, reason: 'no_valid_points' };
    }

    const averageMovement = totalMovement / validPoints;
    
    // Define thresholds for finger movement
    const LOW_MOVEMENT_THRESHOLD = 0.02; // Very stable
    const HIGH_MOVEMENT_THRESHOLD = 0.15; // Too much movement - likely tracking error
    
    let confidence;
    let reason;
    
    if (averageMovement < LOW_MOVEMENT_THRESHOLD) {
      confidence = 1.0;
      reason = 'stable_tracking';
    } else if (averageMovement < HIGH_MOVEMENT_THRESHOLD) {
      // Linear interpolation between thresholds
      confidence = 1.0 - ((averageMovement - LOW_MOVEMENT_THRESHOLD) / (HIGH_MOVEMENT_THRESHOLD - LOW_MOVEMENT_THRESHOLD));
      reason = 'moderate_movement';
    } else {
      confidence = 0.0;
      reason = 'excessive_movement';
    }

    return { 
      confidence: Math.max(0, Math.min(1, confidence)), 
      reason,
      movement: averageMovement 
    };
  };

  // Log recording state changes
  if (prevIsRecording.current !== isRecording) {
    console.log(`Exer AI recording state changed: ${prevIsRecording.current} -> ${isRecording}`);
    prevIsRecording.current = isRecording;
  }

  // Process pose tracking results for enhanced wrist assessment
  const onPoseResults = useCallback((results: any) => {
    if (results.poseLandmarks && results.poseLandmarks.length > 0) {
      currentPoseLandmarks.current = results.poseLandmarks;
      console.log(`Pose detected with ${results.poseLandmarks.length} landmarks`);
    } else {
      currentPoseLandmarks.current = [];
    }
  }, []);

  // Initialize MediaPipe tracking systems with enhanced production support
  const initializeExerAI = useCallback(async () => {
    console.log('Starting MediaPipe initialization...');
    
    try {
      // Initialize dual tracking for wrist assessments or full arm assessments
      if (isArmAssessment || isWristAssessment) {
        console.log('Initializing pose tracking for enhanced wrist/arm assessment...');
        
        // Load MediaPipe Pose script if not already loaded
        if (!document.querySelector('script[src*="pose"]')) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675471629/pose.js';
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
              console.log('MediaPipe Pose script loaded');
              setTimeout(resolve, 200);
            };
            
            script.onerror = () => {
              console.log('Pose script failed to load');
              reject(new Error('Pose load failed'));
            };
            
            document.head.appendChild(script);
          });
        }

        // Wait for Pose to be available
        let attempts = 0;
        while (attempts < 20 && !(window as any).Pose) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if ((window as any).Pose) {
          const PoseClass = (window as any).Pose;
          poseRef.current = new PoseClass({
            locateFile: (file: string) => {
              return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675471629/${file}`;
            }
          });

          poseRef.current.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });

          poseRef.current.onResults(onPoseResults);
          console.log('Pose tracking initialized successfully');
        }
      }
      
      // Always initialize hand tracking
      console.log('Initializing MediaPipe hands for production deployment...');
      
      let HandsClass;
      
      // Strategy 1: Try to load MediaPipe via CDN first (more reliable for production)
      try {
        console.log('Loading MediaPipe via CDN for production...');
        
        // Load MediaPipe script if not already loaded
        if (!document.querySelector('script[src*="mediapipe"]')) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
              console.log('MediaPipe CDN script loaded');
              setTimeout(resolve, 200); // Give it time to initialize
            };
            
            script.onerror = () => {
              console.log('CDN script failed to load');
              reject(new Error('CDN load failed'));
            };
            
            document.head.appendChild(script);
          });
        }
        
        // Wait for MediaPipe to be available
        let attempts = 0;
        while (attempts < 20 && !(window as any).Hands) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if ((window as any).Hands) {
          HandsClass = (window as any).Hands;
          console.log('MediaPipe loaded from CDN successfully');
        } else {
          throw new Error('MediaPipe not available after CDN load');
        }
      } catch (cdnError) {
        console.log('CDN loading failed, trying direct import...');
        
        // Strategy 2: Create fallback if CDN fails
        try {
          throw new Error('Skipping direct import to avoid dependency issues');
        } catch (importError) {
          console.log('All MediaPipe loading failed, using camera-only mode...');
          
          // Create a working fallback for camera-only mode
          HandsClass = function(config: any) {
            return {
              setOptions: (opts: any) => {
                console.log('Camera-only mode: options set');
              },
              onResults: (callback: any) => {
                console.log('Camera-only mode: results callback set');
              },
              send: async (inputs: any) => {
                // Do nothing - camera-only mode
              }
            };
          };
          
          console.log('Using camera-only fallback mode');
        }
      }

      console.log('Creating MediaPipe Hands instance...');
      
      // Create hands instance with enhanced error handling
      try {
        handsRef.current = new HandsClass({
          locateFile: (file: string) => {
            console.log(`Loading MediaPipe file: ${file}`);
            // Primary CDN with fallback
            if (file.endsWith('.wasm') || file.endsWith('.data')) {
              return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
            }
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
          }
        });
        
        console.log('MediaPipe Hands instance created successfully');
      } catch (instanceError) {
        console.error('Failed to create Hands instance:', instanceError);
        const errorMsg = instanceError instanceof Error ? instanceError.message : 'Unknown instance error';
        throw new Error(`Instance creation failed: ${errorMsg}`);
      }

      // Configure with production-optimized settings
      console.log('Configuring MediaPipe options...');
      try {
        handsRef.current.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.4,  // Slightly lower for production
          minTrackingConfidence: 0.3,   // Lower for continuous tracking
          staticImageMode: false,
          selfieMode: true
        });
        
        handsRef.current.onResults(onHandResults);
        console.log('MediaPipe configuration complete');
      } catch (configError) {
        console.error('Failed to configure MediaPipe:', configError);
        const errorMsg = configError instanceof Error ? configError.message : 'Unknown config error';
        throw new Error(`Configuration failed: ${errorMsg}`);
      }

      console.log('MediaPipe initialization completed successfully');
      return true;
    } catch (error) {
      console.error('MediaPipe initialization failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown initialization error';
      // Provide detailed error information
      onUpdate({
        handDetected: false,
        landmarksCount: 0,
        trackingQuality: "Initialization Failed",
        handPosition: `Error: ${errorMsg}`
      });
      return false;
    }
  }, [isArmAssessment, isWristAssessment, onUpdate]);

  // Process Exer AI hand tracking results with enhanced wrist calculation
  const onHandResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Clear canvas with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the video frame normally (un-mirrored)
    try {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // Draw video frame without mirroring
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        // Show status message
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Camera status: ${video.readyState}`, canvas.width / 2, canvas.height / 2);
      }
    } catch (error) {
      console.warn('Video drawing error:', error);
      // Draw a simple placeholder
      ctx.fillStyle = '#333333';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Camera initializing...', canvas.width / 2, canvas.height / 2);
    }

    let handDetected = false;
    let landmarks: any[] = [];
    let detectedHandType = "";
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      handDetected = true;
      landmarks = results.multiHandLandmarks[0];
      
      // Calculate finger tracking confidence for each digit
      const fingerIndices = {
        INDEX: [5, 6, 7, 8],
        MIDDLE: [9, 10, 11, 12], 
        RING: [13, 14, 15, 16],
        PINKY: [17, 18, 19, 20]
      };
      
      const fingerConfidences = {
        INDEX: calculateFingerConfidence(landmarks, fingerIndices.INDEX),
        MIDDLE: calculateFingerConfidence(landmarks, fingerIndices.MIDDLE),
        RING: calculateFingerConfidence(landmarks, fingerIndices.RING),
        PINKY: calculateFingerConfidence(landmarks, fingerIndices.PINKY)
      };
      
      // Store previous landmarks for next frame comparison
      previousLandmarks.current = [...landmarks];
      
      // Add confidence scores to landmarks data
      (landmarks as any).fingerConfidences = fingerConfidences;
      
      // Determine hand type from MediaPipe results 
      if (results.multiHandedness && results.multiHandedness.length > 0) {
        const handedness = results.multiHandedness[0];
        if (handedness.label) {
          // Use MediaPipe's detection directly - it should match the unmirrored video view
          detectedHandType = handedness.label; // "Left" or "Right"
        }
      }
      
      console.log(`${detectedHandType} hand detected with ${landmarks.length} landmarks`);

      // Draw hand landmarks (unmirror to match video)
      ctx.fillStyle = '#00ff00';
      landmarks.forEach((landmark: any, index: number) => {
        // Unmirror the x-coordinate to align with unmirrored video
        const x = (1 - landmark.x) * canvas.width;
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

      // Draw hand connections (unmirror to match video)
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      HAND_CONNECTIONS.forEach(([start, end]) => {
        if (landmarks[start] && landmarks[end]) {
          ctx.beginPath();
          // Unmirror the x-coordinates for connections
          ctx.moveTo((1 - landmarks[start].x) * canvas.width, landmarks[start].y * canvas.height);
          ctx.lineTo((1 - landmarks[end].x) * canvas.width, landmarks[end].y * canvas.height);
          ctx.stroke();
        }
      });

      // Calculate hand center for position tracking
      const centerX = landmarks.reduce((sum: number, landmark: any) => sum + landmark.x, 0) / landmarks.length;
      const centerY = landmarks.reduce((sum: number, landmark: any) => sum + landmark.y, 0) / landmarks.length;

      // Enhanced wrist angle calculation for wrist assessments
      let wristAngles = null;
      if (isWristAssessment && landmarks.length >= 21) {
        try {
          const { calculateWristAngles } = await import('@/../../shared/wrist-calculator');
          wristAngles = calculateWristAngles(landmarks, currentPoseLandmarks.current);
          console.log('Wrist angles calculated:', wristAngles);
        } catch (error) {
          console.warn('Wrist calculation failed:', error);
        }
      }

      // Update tracking information
      const updateData = {
        handDetected: true,
        landmarksCount: landmarks.length,
        trackingQuality: "Excellent",
        handPosition: `X: ${Math.round(centerX * 100)}%, Y: ${Math.round(centerY * 100)}%`,
        landmarks: landmarks,
        handType: detectedHandType,
        poseLandmarks: currentPoseLandmarks.current,
        wristAngles: wristAngles
      };
      
      if (isRecording) {
        console.log(`Exer AI sending ${landmarks.length} landmarks to recording system`, landmarks.slice(0, 2));
      }
      
      onUpdate(updateData);
    } else {
      // No hand detected
      onUpdate({
        handDetected: false,
        landmarksCount: 0,
        trackingQuality: "Poor",
        handPosition: "No hand detected"
      });
    }
  }, [calculateFingerConfidence, isWristAssessment, isRecording, onUpdate]);

  // Animation loop for continuous tracking
  const animate = useCallback(() => {
    const video = videoRef.current;
    
    if (!video || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const currentTime = Date.now();
    
    // Throttle processing to ~15fps for better performance
    if (currentTime - lastFrameTime.current >= 66) {
      lastFrameTime.current = currentTime;
      
      // Send frame to both hand and pose detection if needed
      if ((isArmAssessment || isWristAssessment) && poseRef.current) {
        poseRef.current.send({ image: video });
      }
      if (handsRef.current) {
        handsRef.current.send({ image: video });
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [isArmAssessment, isWristAssessment]);

  // Start camera and initialize MediaPipe
  const startCamera = useCallback(async () => {
    try {
      const video = videoRef.current;
      if (!video) return;

      // Request camera permission and stream
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

      // Initialize MediaPipe once video is ready
      const success = await initializeExerAI();
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
  }, [initializeExerAI, animate, onUpdate]);

  // Effect to start camera and tracking
  useEffect(() => {
    startCamera();

    return () => {
      // Cleanup function
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
      {/* Hidden video element for MediaPipe processing */}
      <video
        ref={videoRef}
        className="hidden"
        autoPlay
        muted
        playsInline
      />
      
      {/* Canvas for visualization */}
      <canvas
        ref={canvasRef}
        className="w-full h-auto"
        style={{ maxHeight: '400px' }}
      />
      
      {/* Exer AI branding overlay */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 rounded px-2 py-1">
        <img 
          src={exerLogoPath} 
          alt="Exer AI" 
          className="h-6 w-auto opacity-80"
        />
      </div>
      
      {/* Status overlay */}
      <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 rounded px-2 py-1 text-white text-xs">
        Assessment: {assessmentType}
        {isWristAssessment && (
          <div className="text-green-400">Enhanced wrist tracking active</div>
        )}
      </div>
    </div>
  );
}