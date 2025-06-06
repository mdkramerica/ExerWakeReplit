import { useEffect, useRef, useCallback, useState } from "react";
import { calculateElbowReferencedWristAngle, calculateElbowReferencedWristAngleWithForce } from "@shared/elbow-wrist-calculator";
// import exerLogoPath from "@assets/exer-ai-logo-white.png";

interface HolisticTrackerProps {
  onUpdate: (data: any) => void;
  isRecording: boolean;
  assessmentType: string;
}

export default function HolisticTracker({ onUpdate, isRecording, assessmentType }: HolisticTrackerProps) {
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

  // Reset hand type tracking when recording starts
  useEffect(() => {
    if (isRecording) {
      lastHandTypeRef.current = 'UNKNOWN';
      handTypeConfidenceRef.current = 0;
      console.log('Reset hand type tracking for new recording session');
    }
  }, [isRecording]);

  // Initialize MediaPipe Holistic once
  const initializeHolistic = useCallback(async () => {
    if (isInitializing || holisticInitialized) return;
    
    setIsInitializing(true);
    try {
      // Robust module loading with fallback
      let HolisticClass, drawConnectors, drawLandmarks;
      
      try {
        const holisticModule = await import('@mediapipe/holistic');
        HolisticClass = holisticModule.Holistic || holisticModule.default?.Holistic;
        
        const drawingModule = await import('@mediapipe/drawing_utils');
        drawConnectors = drawingModule.drawConnectors;
        drawLandmarks = drawingModule.drawLandmarks;
      } catch (importError) {
        console.error('Failed to import MediaPipe modules:', importError);
        throw new Error('MediaPipe modules not available');
      }

      if (!HolisticClass) {
        throw new Error('Holistic constructor not found');
      }

      const holisticInstance = new HolisticClass({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
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
      console.log('MediaPipe Holistic initialized for comprehensive tracking');
      
    } catch (error) {
      console.error('Holistic initialization failed:', error);
      setHolisticInitialized(false);
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, holisticInitialized, isRecording]);

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
    if (isRecording && isWristAssessment && handLandmarks.length > 0) {
      // First get the initial hand type detection
      const currentDetection = calculateElbowReferencedWristAngle(
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
      if (currentDetection.handType !== 'UNKNOWN' && lastHandTypeRef.current === 'UNKNOWN') {
        lastHandTypeRef.current = currentDetection.handType;
        handTypeConfidenceRef.current = 1;
        console.log(`🔒 DETECTION LOCKED onto ${currentDetection.handType} hand`);
      }
      
      // Debug logging to track detection issues
      if (currentDetection.handType !== 'UNKNOWN' || lastHandTypeRef.current !== 'UNKNOWN') {
        console.log(`🔍 Hand Detection - Current: ${currentDetection.handType}, Locked: ${lastHandTypeRef.current}, Confidence: ${currentDetection.confidence.toFixed(3)}`);
      }
      
      // Force the locked hand type for consistent calculation
      if (lastHandTypeRef.current !== 'UNKNOWN') {
        console.log(`🎯 Calling wrist calculation with locked hand type: ${lastHandTypeRef.current}`);
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
          lastHandTypeRef.current
        );
        console.log(`🎯 Wrist calculation completed for ${lastHandTypeRef.current} hand`);
      } else {
        console.log('⚠️ Using fallback detection - hand type not locked yet');
        wristAngles = currentDetection;
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

    // Update parent component with tracking data
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
      lockedHandType: lastHandTypeRef.current
    });
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