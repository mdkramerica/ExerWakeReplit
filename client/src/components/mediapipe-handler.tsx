import { useEffect, useRef, useCallback } from "react";
import exerLogoPath from "@assets/exer-logo.png";
import { MediaPipeLoader } from "@/lib/mediapipe-loader";

interface ExerAIHandlerProps {
  onUpdate: (data: {
    handDetected: boolean;
    landmarksCount: number;
    trackingQuality: string;
    handPosition: string;
    landmarks?: any[];
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
  const previousLandmarks = useRef<any[]>([]);
  const frameConfidenceScores = useRef<number[]>([]);

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

  // Initialize MediaPipe tracking systems with enhanced production support
  const initializeExerAI = useCallback(async () => {
    console.log('Starting MediaPipe initialization...');
    
    try {
      if (isArmAssessment) {
        // Initialize pose tracking for full arm assessments
        const { Pose } = await import('@mediapipe/pose');
        
        poseRef.current = new Pose({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
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
      } else {
        // Production-ready MediaPipe initialization
        console.log('Initializing MediaPipe for production deployment...');
        
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
          
          // Strategy 2: Try direct import as fallback
          try {
            const { Hands } = await import('@mediapipe/hands');
            HandsClass = Hands;
            console.log('Direct import successful as fallback');
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
  }, [isArmAssessment, onUpdate]);

  // Process Exer AI hand tracking results
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

      // Update tracking information
      const updateData = {
        handDetected: true,
        landmarksCount: landmarks.length,
        trackingQuality: "Excellent",
        handPosition: `X: ${Math.round(centerX * 100)}%, Y: ${Math.round(centerY * 100)}%`,
        landmarks: landmarks,
        handType: detectedHandType
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

    // Draw status text
    ctx.fillStyle = handDetected ? '#00ff00' : '#ff6666';
    ctx.font = '16px Arial';
    ctx.fillText(handDetected ? `Hand Tracked (${landmarks.length} joints)` : 'Position hand in view', 10, 30);
    
    if (handDetected) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText('Exer AI hand tracking active', 10, 50);
    }
  }, [onUpdate]);

  // Process Exer AI pose tracking results for arm assessments
  const onPoseResults = useCallback((results: any) => {
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

    let poseDetected = false;
    let landmarks: any[] = [];

    if (results.poseLandmarks) {
      poseDetected = true;
      landmarks = results.poseLandmarks;

      // Key arm landmarks (shoulder, elbow, wrist)
      const armLandmarks = [
        11, // Left shoulder
        12, // Right shoulder
        13, // Left elbow
        14, // Right elbow
        15, // Left wrist
        16, // Right wrist
        17, // Left pinky
        18, // Right pinky
        19, // Left index
        20, // Right index
        21, // Left thumb
        22  // Right thumb
      ];

      // Draw arm landmarks
      ctx.fillStyle = '#00ff00';
      armLandmarks.forEach((index) => {
        if (landmarks[index]) {
          const landmark = landmarks[index];
          const x = landmark.x * canvas.width;
          const y = landmark.y * canvas.height;
          
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();

          // Label key joints
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px Arial';
          const labels = ['', '', '', '', '', '', '', '', '', '', '', 'L-Shoulder', 'R-Shoulder', 'L-Elbow', 'R-Elbow', 'L-Wrist', 'R-Wrist'];
          if (labels[index]) {
            ctx.fillText(labels[index], x + 8, y - 8);
          }
          ctx.fillStyle = '#00ff00';
        }
      });

      // Draw arm connections
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      
      // Left arm: shoulder -> elbow -> wrist
      if (landmarks[11] && landmarks[13] && landmarks[15]) {
        ctx.beginPath();
        ctx.moveTo(landmarks[11].x * canvas.width, landmarks[11].y * canvas.height);
        ctx.lineTo(landmarks[13].x * canvas.width, landmarks[13].y * canvas.height);
        ctx.lineTo(landmarks[15].x * canvas.width, landmarks[15].y * canvas.height);
        ctx.stroke();
      }

      // Right arm: shoulder -> elbow -> wrist
      if (landmarks[12] && landmarks[14] && landmarks[16]) {
        ctx.beginPath();
        ctx.moveTo(landmarks[12].x * canvas.width, landmarks[12].y * canvas.height);
        ctx.lineTo(landmarks[14].x * canvas.width, landmarks[14].y * canvas.height);
        ctx.lineTo(landmarks[16].x * canvas.width, landmarks[16].y * canvas.height);
        ctx.stroke();
      }

      // Calculate arm angles for assessment
      const leftElbowAngle = calculateElbowAngle(landmarks[11], landmarks[13], landmarks[15]);
      const rightElbowAngle = calculateElbowAngle(landmarks[12], landmarks[14], landmarks[16]);

      // Update tracking information
      onUpdate({
        handDetected: true,
        landmarksCount: armLandmarks.filter(i => landmarks[i]).length,
        trackingQuality: "Excellent",
        handPosition: `L-Elbow: ${leftElbowAngle}°, R-Elbow: ${rightElbowAngle}°`
      });
    } else {
      // No pose detected
      onUpdate({
        handDetected: false,
        landmarksCount: 0,
        trackingQuality: "Poor",
        handPosition: "Position body in view"
      });
    }

    // Draw status text
    ctx.fillStyle = poseDetected ? '#00ff00' : '#ff6666';
    ctx.font = '16px Arial';
    ctx.fillText(poseDetected ? `Full Arm Tracking Active` : 'Position upper body in view', 10, 30);
    
    if (poseDetected) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText('Exer AI pose tracking - shoulders, elbows, wrists', 10, 50);
    }
  }, [onUpdate]);

  // Calculate elbow angle for range of motion assessment
  const calculateElbowAngle = (shoulder: any, elbow: any, wrist: any) => {
    if (!shoulder || !elbow || !wrist) return 0;
    
    const vector1 = {
      x: shoulder.x - elbow.x,
      y: shoulder.y - elbow.y
    };
    
    const vector2 = {
      x: wrist.x - elbow.x,
      y: wrist.y - elbow.y
    };
    
    const dot = vector1.x * vector2.x + vector1.y * vector2.y;
    const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
    
    const angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
    return Math.round(angle);
  };

  // Process video frames with MediaPipe
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
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
      if (isArmAssessment && poseRef.current) {
        await poseRef.current.send({ image: video });
      } else if (!isArmAssessment && handsRef.current) {
        await handsRef.current.send({ image: video });
      }
    } catch (error) {
      console.warn('Frame processing failed:', error);
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, []);

  useEffect(() => {
    const startSystem = async () => {
      console.log('Starting camera and tracking system...');
      
      try {
        // Enhanced camera initialization with better error handling
        console.log('Requesting camera access...');
        const constraints = {
          video: { 
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            facingMode: 'user',
            frameRate: { ideal: 30, max: 60 }
          }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✓ Camera access granted');
        
        if (videoRef.current) {
          console.log('Setting up video element...');
          videoRef.current.srcObject = stream;
          
          // Enhanced video loading with timeout
          await new Promise<void>((resolve, reject) => {
            const video = videoRef.current!;
            let hasResolved = false;
            
            const onMetadataLoaded = () => {
              if (!hasResolved) {
                hasResolved = true;
                console.log('✓ Video metadata loaded:', {
                  width: video.videoWidth,
                  height: video.videoHeight,
                  readyState: video.readyState
                });
                resolve();
              }
            };
            
            const onLoadedData = () => {
              if (!hasResolved && video.readyState >= 2) {
                hasResolved = true;
                console.log('✓ Video data loaded');
                resolve();
              }
            };
            
            video.onloadedmetadata = onMetadataLoaded;
            video.onloadeddata = onLoadedData;
            
            // Timeout fallback
            setTimeout(() => {
              if (!hasResolved) {
                hasResolved = true;
                console.log('⚠ Video loading timeout, proceeding anyway');
                resolve();
              }
            }, 5000);
          });
          
          console.log('Starting video playback...');
          try {
            await videoRef.current.play();
            console.log('✓ Video playback started successfully');
          } catch (playError) {
            console.warn('Video play failed, but continuing:', playError);
          }
        }

        // Initialize MediaPipe with enhanced retry logic
        console.log('Initializing MediaPipe tracking...');
        let initialized = false;
        let initAttempts = 0;
        const maxAttempts = 3;
        
        while (!initialized && initAttempts < maxAttempts) {
          initAttempts++;
          console.log(`MediaPipe initialization attempt ${initAttempts}/${maxAttempts}`);
          
          try {
            initialized = await initializeExerAI();
            if (initialized) {
              console.log('✓ MediaPipe initialization successful');
            } else {
              console.log(`✗ MediaPipe initialization failed (attempt ${initAttempts})`);
              if (initAttempts < maxAttempts) {
                console.log('Retrying in 1 second...');
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          } catch (error) {
            console.error(`MediaPipe initialization error (attempt ${initAttempts}):`, error);
            if (initAttempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        if (initialized) {
          console.log('🚀 Starting MediaPipe frame processing...');
          processFrame();
        } else {
          console.log('⚠ MediaPipe failed, falling back to camera-only mode');
          startBasicCameraMode();
        }
      } catch (error) {
        console.error("System startup failed:", error);
        let errorMessage = "Camera access error";
        
        if (error instanceof Error) {
          switch (error.name) {
            case 'NotAllowedError':
              errorMessage = "Camera permission denied. Please allow camera access and refresh.";
              break;
            case 'NotFoundError':
              errorMessage = "No camera found. Please connect a camera and refresh.";
              break;
            case 'NotSupportedError':
              errorMessage = "Camera not supported. Please use HTTPS or a compatible browser.";
              break;
            case 'NotReadableError':
              errorMessage = "Camera in use by another application.";
              break;
            case 'OverconstrainedError':
              errorMessage = "Camera constraints not supported. Using fallback settings.";
              break;
            default:
              errorMessage = `Camera error: ${error.message}`;
          }
        }
        
        console.error('Final error state:', errorMessage);
        onUpdate({
          handDetected: false,
          landmarksCount: 0,
          trackingQuality: "Error",
          handPosition: errorMessage
        });
      }
    };

    startSystem();

    return () => {
      console.log('Cleaning up camera and tracking system...');
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped ${track.kind} track`);
        });
      }
      
      console.log('Cleanup complete');
    };
  }, []);

  // Basic camera mode without hand tracking when MediaPipe fails
  const startBasicCameraMode = useCallback(() => {
    console.log('Starting basic camera mode...');
    
    const drawBasicVideo = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (!canvas || !video) {
        requestAnimationFrame(drawBasicVideo);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        requestAnimationFrame(drawBasicVideo);
        return;
      }

      // Set canvas dimensions
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      try {
        if (video.readyState >= 2 && video.videoWidth > 0) {
          // Draw unmirrored video for joint-test page
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Add "Camera Only" indicator
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(10, 10, 120, 30);
          ctx.fillStyle = '#000000';
          ctx.font = '14px Arial';
          ctx.fillText('Camera Only', 15, 30);
          
          // Update with basic status
          onUpdate({
            handDetected: false,
            landmarksCount: 0,
            trackingQuality: "Camera Only",
            handPosition: "Hand tracking unavailable"
          });
        }
      } catch (error) {
        console.warn('Basic video draw error:', error);
      }

      requestAnimationFrame(drawBasicVideo);
    };

    drawBasicVideo();
  }, [onUpdate]);

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
        className="w-full h-full border-2 border-medical-primary rounded-lg"
        width={640}
        height={480}
      />
      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {isRecording ? "Recording..." : "Preview"}
      </div>
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
        <img 
          src={exerLogoPath} 
          alt="Exer AI" 
          className="h-3 w-auto brightness-0 invert"
        />
        <span>Hand Tracking</span>
      </div>
    </div>
  );
}