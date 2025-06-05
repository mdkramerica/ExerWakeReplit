import { useEffect, useRef, useCallback, useState } from "react";
import exerLogoPath from "@assets/exer-logo.png";

interface EnhancedMediaPipeProps {
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

export default function EnhancedMediaPipeHandler({ onUpdate, isRecording, assessmentType }: EnhancedMediaPipeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [mediapipeLoading, setMediapipeLoading] = useState(true);
  const [hands, setHands] = useState<any>(null);
  const [pose, setPose] = useState<any>(null);
  const isWristAssessment = assessmentType.includes('wrist') || assessmentType.includes('flexion') || assessmentType.includes('extension');

  // Initialize MediaPipe components
  const initializeMediaPipe = useCallback(async () => {
    try {
      // Load MediaPipe modules
      const { Hands, HAND_CONNECTIONS } = await import('@mediapipe/hands');
      const { Pose, POSE_CONNECTIONS } = await import('@mediapipe/pose');
      const { Camera } = await import('@mediapipe/camera_utils');
      const { drawConnectors, drawLandmarks } = await import('@mediapipe/drawing_utils');

      // Initialize Hands
      const handsInstance = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      handsInstance.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // Initialize Pose for elbow detection
      const poseInstance = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });

      poseInstance.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // Combined results processing
      let handResults: any = null;
      let poseResults: any = null;

      handsInstance.onResults((results) => {
        handResults = results;
        processResults();
      });

      poseInstance.onResults((results) => {
        poseResults = results;
        processResults();
      });

      const processResults = () => {
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

        let landmarks: any[] = [];
        let poseLandmarks: any[] = [];
        let handDetected = false;
        let trackingQuality = "Poor";

        // Process hand results
        if (handResults && handResults.multiHandLandmarks && handResults.multiHandLandmarks.length > 0) {
          handDetected = true;
          landmarks = handResults.multiHandLandmarks[0];
          trackingQuality = "Good";

          // Draw hand landmarks
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
          drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 2 });
        }

        // Process pose results for elbow detection
        if (poseResults && poseResults.poseLandmarks) {
          poseLandmarks = poseResults.poseLandmarks;
          
          // Draw key pose landmarks (shoulders, elbows, wrists)
          const keyPoseIndices = [11, 12, 13, 14, 15, 16]; // Shoulders, elbows, wrists
          keyPoseIndices.forEach(index => {
            const landmark = poseLandmarks[index];
            if (landmark && landmark.visibility > 0.5) {
              const x = landmark.x * canvas.width;
              const y = landmark.y * canvas.height;
              
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, 2 * Math.PI);
              ctx.fillStyle = '#0080FF';
              ctx.fill();
            }
          });

          if (handDetected && poseLandmarks.length > 16) {
            trackingQuality = "Excellent";
          }
        }

        // Add assessment guidance overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 320, 90);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.fillText('Enhanced Hand & Pose Tracking', 20, 35);
        
        if (isWristAssessment) {
          ctx.fillStyle = '#00ff00';
          ctx.fillText('Wrist Assessment - Full Body Tracking', 20, 55);
          ctx.fillText('Keep arm visible for elbow reference', 20, 75);
          
          if (poseLandmarks.length > 0) {
            ctx.fillStyle = '#0080ff';
            ctx.fillText('✓ Pose landmarks detected', 20, 95);
          }
        }

        // Update parent component
        onUpdate({
          handDetected,
          landmarksCount: landmarks.length,
          trackingQuality,
          handPosition: handDetected ? "Detected" : "Not detected",
          landmarks: landmarks.map((landmark: any) => ({
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
      };

      setHands(handsInstance);
      setPose(poseInstance);
      setMediapipeLoading(false);
      
      console.log('Enhanced MediaPipe with Pose initialized successfully');
      
    } catch (error) {
      console.error('Enhanced MediaPipe initialization failed:', error);
      setMediapipeLoading(false);
    }
  }, [isWristAssessment, onUpdate]);

  // Start camera and MediaPipe processing
  const startCamera = useCallback(async () => {
    if (!hands || !pose) return;
    
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
        console.log('Enhanced camera ready with pose tracking');
      };

      // Process video frames
      const processFrame = async () => {
        if (video.readyState === 4) {
          // Send frame to both hands and pose
          await hands.send({ image: video });
          await pose.send({ image: video });
        }
        animationRef.current = requestAnimationFrame(processFrame);
      };

      processFrame();
      
    } catch (error) {
      console.error('Enhanced camera initialization failed:', error);
      onUpdate({
        handDetected: false,
        landmarksCount: 0,
        trackingQuality: "Camera Error",
        handPosition: `Camera failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }, [hands, pose, onUpdate]);

  useEffect(() => {
    initializeMediaPipe();
  }, [initializeMediaPipe]);

  useEffect(() => {
    if (!mediapipeLoading && hands && pose) {
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
  }, [mediapipeLoading, hands, pose, startCamera]);

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
        {mediapipeLoading && <div className="text-yellow-400">Loading Enhanced MediaPipe...</div>}
        {!mediapipeLoading && (
          <>
            <div>Assessment: {assessmentType}</div>
            {isWristAssessment && (
              <div className="text-green-400">Enhanced: Hand + Pose tracking</div>
            )}
            {cameraReady && (
              <div className="text-blue-400">Ready for enhanced recording</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}