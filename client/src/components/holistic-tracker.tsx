import { useEffect, useRef, useCallback, useState } from "react";
import { calculateElbowReferencedWristAngle, calculateElbowReferencedWristAngleWithForce, resetRecordingSession, getRecordingSessionElbowSelection } from "@shared/elbow-wrist-calculator";

// MediaPipe type declarations for window object
declare global {
  interface Window {
    Holistic: any;
    Hands: any;
    drawConnectors: any;
    drawLandmarks: any;
  }
}

interface HolisticTrackerProps {
  onUpdate: (data: any) => void;
  isRecording: boolean;
  assessmentType: string;
  sessionMaxWristAngles?: any;
}

export default function HolisticTracker({ onUpdate, isRecording, assessmentType, sessionMaxWristAngles }: HolisticTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holisticRef = useRef<any>(null);
  const animationRef = useRef<number>();
  
  const [holisticInitialized, setHolisticInitialized] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Add temporal stability for hand type detection
  const lastHandTypeRef = useRef<'LEFT' | 'RIGHT' | 'UNKNOWN'>('UNKNOWN');
  const handTypeConfidenceRef = useRef(0);

  const isWristAssessment = assessmentType?.toLowerCase().includes('wrist');

  // Reset hand type tracking and session state when recording starts
  useEffect(() => {
    if (isRecording) {
      lastHandTypeRef.current = 'UNKNOWN';
      handTypeConfidenceRef.current = 0;
      resetRecordingSession(); // Clear elbow session lock for new recording
      console.log('Reset hand type tracking and session state for new recording');
    }
  }, [isRecording]);

  // CDN fallback loader
  const loadMediaPipeFromCDN = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js';
      script.onload = () => {
        // Wait a bit for the script to initialize
        setTimeout(() => {
          if ((window as any).Holistic) {
            resolve();
          } else {
            reject(new Error('Holistic not available after CDN load'));
          }
        }, 500);
      };
      script.onerror = () => reject(new Error('Failed to load MediaPipe from CDN'));
      document.head.appendChild(script);
    });
  };

  // Initialize MediaPipe Holistic once
  const initializeHolistic = useCallback(async () => {
    if (isInitializing || holisticInitialized) return;
    
    setIsInitializing(true);
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        throw new Error('MediaPipe requires browser environment');
      }

      // Wait for MediaPipe to be available (preloaded scripts or dynamic import)
      let attempts = 0;
      const maxAttempts = 15;
      
      while (attempts < maxAttempts) {
        // Check if already available from preloaded scripts
        if ((window as any).Holistic) {
          console.log('MediaPipe Holistic found from preloaded scripts');
          break;
        }
        
        // Try dynamic import for local development
        if (attempts < 5) {
          try {
            const [holisticModule, drawingModule] = await Promise.all([
              import('@mediapipe/holistic').catch(() => null),
              import('@mediapipe/drawing_utils').catch(() => null)
            ]);
            
            if (holisticModule?.Holistic) {
              (window as any).Holistic = holisticModule.Holistic;
              if (drawingModule?.drawConnectors) {
                (window as any).drawConnectors = drawingModule.drawConnectors;
                (window as any).drawLandmarks = drawingModule.drawLandmarks;
              }
              console.log('MediaPipe Holistic loaded via dynamic import');
              break;
            }
          } catch (importError) {
            console.warn(`Dynamic import attempt ${attempts + 1} failed:`, importError);
          }
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (!(window as any).Holistic) {
        throw new Error('MediaPipe Holistic unavailable. Please refresh the page and ensure stable internet connection.');
      }

      const holisticInstance = new (window as any).Holistic({
        locateFile: (file: string) => {
          // Use multiple CDN fallbacks
          const cdnUrls = [
            `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
            `https://unpkg.com/@mediapipe/holistic/${file}`,
            `/node_modules/@mediapipe/holistic/${file}`
          ];
          return cdnUrls[0]; // Primary CDN
        }
      });

      holisticInstance.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        refineFaceLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      holisticInstance.onResults((results: any) => {
        processHolisticResults(results);
      });

      holisticRef.current = holisticInstance;
      setHolisticInitialized(true);
      console.log('MediaPipe Holistic initialized successfully');
      
    } catch (error) {
      console.error('Holistic initialization failed:', error);
      setHolisticInitialized(false);
      
      // Fallback to hand-only tracking if available
      try {
        if ((window as any).Hands) {
          console.log('Falling back to Hands-only tracking');
          const handsInstance = new (window as any).Hands({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
          });
          
          handsInstance.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
          });
          
          handsInstance.onResults((results: any) => {
            try {
              // Convert hands results to holistic format
              const holisticResults = {
              leftHandLandmarks: results.multiHandedness?.[0]?.label === 'Left' ? results.multiHandLandmarks?.[0] : null,
              rightHandLandmarks: results.multiHandedness?.[0]?.label === 'Right' ? results.multiHandLandmarks?.[0] : null,
              poseLandmarks: null // No pose data available
            };
            processHolisticResults(holisticResults);
            } catch (error) {
              console.warn('Hands fallback processing error:', error);
            }
          });
          
          holisticRef.current = handsInstance;
          setHolisticInitialized(true);
          console.log('Hands fallback initialized');
        } else {
          // Final fallback - show error message to user
          console.error('Neither Holistic nor Hands tracking available');
          onUpdate({
            error: 'Camera tracking unavailable. Please refresh the page and ensure you have a stable internet connection.',
            trackingAvailable: false
          });
        }
      } catch (fallbackError) {
        console.error('Fallback initialization also failed:', fallbackError);
        onUpdate({
          error: 'Camera tracking initialization failed. Please refresh the page.',
          trackingAvailable: false
        });
      }
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, holisticInitialized]);

  // Process holistic results only during recording
  const processHolisticResults = useCallback((results: any) => {
    let handLandmarks: any[] = [];
    let poseLandmarks: any[] = [];
    let handDetected = false;
    let trackingQuality = "Poor";

    // Process pose landmarks (including elbow data)
    if (results.poseLandmarks) {
      poseLandmarks = results.poseLandmarks;
      trackingQuality = "Good";
    }

    // Process hand landmarks
    if (results.leftHandLandmarks || results.rightHandLandmarks) {
      handDetected = true;
      handLandmarks = results.rightHandLandmarks || results.leftHandLandmarks;
      
      if (handLandmarks) {
        trackingQuality = poseLandmarks.length > 0 ? "Excellent" : "Good";
      }
    }

    // Calculate wrist angles using elbow reference only during recording
    let wristAngles = null;
    let currentDetection: any = null;
    
    if (isRecording && isWristAssessment && handLandmarks.length > 0) {
      // First get the initial hand type detection
      currentDetection = calculateElbowReferencedWristAngle(
        handLandmarks.map((landmark: any) => ({
          x: landmark.x,
          y: landmark.y,
          z: landmark.z
        })),
        poseLandmarks.map((landmark: any) => ({
          x: landmark.x,
          y: landmark.y,
          z: landmark.z,
          visibility: landmark.visibility
        }))
      );
      
      // Implement aggressive hand type locking for faster detection
      if (lastHandTypeRef.current === 'UNKNOWN') {
        // Force detection based on any available pose landmarks
        if (poseLandmarks && poseLandmarks.length > 16) {
          const leftElbow = poseLandmarks[13];
          const rightElbow = poseLandmarks[14];
          const leftWrist = poseLandmarks[15];
          const rightWrist = poseLandmarks[16];
          
          if (leftElbow && rightElbow && (leftElbow.visibility || 0) > 0.1 && (rightElbow.visibility || 0) > 0.1) {
            // Force detection based on elbow visibility scores
            const forceHandType = (leftElbow.visibility || 0) > (rightElbow.visibility || 0) ? 'LEFT' : 'RIGHT';
            lastHandTypeRef.current = forceHandType;
            handTypeConfidenceRef.current = 1;
            console.log(`🔒 FORCE LOCKED onto ${forceHandType} hand based on elbow visibility (L:${(leftElbow.visibility || 0).toFixed(2)} vs R:${(rightElbow.visibility || 0).toFixed(2)})`);
          }
        }
      }
      
      // Secondary locking for valid detections
      if (currentDetection && currentDetection.handType !== 'UNKNOWN' && lastHandTypeRef.current === 'UNKNOWN') {
        lastHandTypeRef.current = currentDetection.handType;
        handTypeConfidenceRef.current = 1;
        console.log(`🔒 DETECTION LOCKED onto ${currentDetection.handType} hand`);
      }
      
      // Debug logging to track detection issues
      if ((currentDetection && currentDetection.handType !== 'UNKNOWN') || lastHandTypeRef.current !== 'UNKNOWN') {
        console.log(`🔍 Hand Detection - Current: ${currentDetection?.handType || 'UNKNOWN'}, Locked: ${lastHandTypeRef.current}, Confidence: ${currentDetection?.confidence?.toFixed(3) || '0'}`);
      }
      
      // Force wrist angle calculation for wrist assessments
      if (isWristAssessment && handLandmarks.length >= 21 && poseLandmarks.length > 16) {
        // Use locked hand type if available, otherwise use current detection
        const handTypeForCalculation = lastHandTypeRef.current !== 'UNKNOWN' ? lastHandTypeRef.current : currentDetection.handType;
        
        if (handTypeForCalculation !== 'UNKNOWN') {
          console.log(`🎯 WRIST ASSESSMENT - Calling calculation with hand type: ${handTypeForCalculation}`);
          wristAngles = calculateElbowReferencedWristAngleWithForce(
            handLandmarks.map((landmark: any) => ({
              x: landmark.x,
              y: landmark.y,
              z: landmark.z
            })),
            poseLandmarks.map((landmark: any) => ({
              x: landmark.x,
              y: landmark.y,
              z: landmark.z,
              visibility: landmark.visibility
            })),
            handTypeForCalculation
          );
          
          // Ensure hand type is consistent
          if (wristAngles) {
            wristAngles.handType = handTypeForCalculation;
            console.log(`✅ WRIST CALCULATION SUCCESS: Flexion=${wristAngles.wristFlexionAngle?.toFixed(1)}°, Extension=${wristAngles.wristExtensionAngle?.toFixed(1)}°`);
          } else {
            console.log(`❌ WRIST CALCULATION FAILED - returned null`);
          }
        } else {
          console.log('⚠️ No hand type available for wrist calculation');
        }
    } else if (handLandmarks.length > 0 && poseLandmarks.length > 0) {
      // For non-wrist assessments or when not recording, still do basic detection
      try {
        currentDetection = calculateElbowReferencedWristAngle(
          handLandmarks.map((landmark: any) => ({
            x: landmark.x,
            y: landmark.y,
            z: landmark.z
          })),
          poseLandmarks.map((landmark: any) => ({
            x: landmark.x,
            y: landmark.y,
            z: landmark.z,
            visibility: landmark.visibility
          }))
        );
      } catch (error) {
        console.warn('Basic hand detection failed:', error);
        currentDetection = { handType: 'UNKNOWN', confidence: 0 };
      }
    }
      
      console.log('🔍 Wrist calculation result:', {
        forearmToHandAngle: wristAngles?.forearmToHandAngle,
        wristFlexionAngle: wristAngles?.wristFlexionAngle,
        wristExtensionAngle: wristAngles?.wristExtensionAngle,
        elbowDetected: wristAngles?.elbowDetected,
        handType: wristAngles?.handType,
        confidence: wristAngles?.confidence
      });
    }

    // Get session elbow selection to store with frame data
    const sessionElbowData = getRecordingSessionElbowSelection();
    
    // Update parent component with tracking data including session elbow selection
    console.log('🔄 Sending update to parent with wrist angles:', wristAngles);
    
    try {
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
        })),
        wristAngles,
        handType: currentDetection?.handType || 'UNKNOWN',
        lockedHandType: lastHandTypeRef.current,
        detectedHandSide: results.leftHandLandmarks ? 'LEFT' : (results.rightHandLandmarks ? 'RIGHT' : 'UNKNOWN'),
        sessionElbowIndex: sessionElbowData.elbowIndex,
        sessionWristIndex: sessionElbowData.wristIndex,
        sessionElbowLocked: sessionElbowData.isLocked
      });
    } catch (error) {
      console.warn('Holistic processing error:', error);
      
      // Fallback data to prevent undefined errors
      onUpdate({
        handDetected: false,
        landmarksCount: 0,
        trackingQuality: "Poor",
        handPosition: "Error",
        landmarks: [],
        poseLandmarks: [],
        wristAngles: null,
        handType: 'UNKNOWN',
        lockedHandType: lastHandTypeRef.current,
        detectedHandSide: 'UNKNOWN',
        sessionElbowIndex: undefined,
        sessionWristIndex: undefined,
        sessionElbowLocked: false
      });
    }
  }, [isWristAssessment, onUpdate]);

  // Initialize camera and start processing
  const startCamera = useCallback(async () => {
    if (!holisticInitialized) return;
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        }
      });

      video.srcObject = stream;
      
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            setCameraReady(true);
            console.log('Camera started:', video.videoWidth, 'x', video.videoHeight);
            resolve(true);
          });
        };
      });

      // Start the frame processing loop
      const processFrame = async () => {
        if (video.readyState >= 2 && canvas && video.videoWidth > 0) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Always draw the video feed
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Always process with MediaPipe for hand detection
            if (holisticRef.current) {
              try {
                await holisticRef.current.send({ image: video });
              } catch (error) {
                console.warn('Holistic processing error:', error);
              }
            }
          }
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
        handPosition: "Failed"
      });
    }
  }, [holisticInitialized, isRecording]);

  // Initialize holistic on mount
  useEffect(() => {
    initializeHolistic();
  }, [initializeHolistic]);

  // Start camera when holistic is ready
  useEffect(() => {
    if (holisticInitialized && !cameraReady) {
      startCamera();
    }
  }, [holisticInitialized, startCamera, cameraReady]);

  // Cleanup on unmount
  useEffect(() => {
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
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        playsInline
        style={{ display: 'none' }}
      />
      
      <canvas
        ref={canvasRef}
        className="w-full h-auto"
        style={{ maxHeight: '400px' }}
      />
      
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 rounded px-2 py-1">
        <div className="text-white text-sm font-semibold">Exer AI</div>
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
        {isRecording && (
          <div className="text-yellow-400">
            Recording - Processing landmarks
          </div>
        )}
      </div>
    </div>
  );
}