import { useRef, useEffect, useCallback, useState } from "react";

interface MotionDemoProps {
  className?: string;
}

export default function MotionDemo({ className = "w-full h-48" }: MotionDemoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const handsRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [handDetected, setHandDetected] = useState(false);

  // Initialize MediaPipe hands for the demo
  const initializeHands = useCallback(async () => {
    try {
      const { Hands } = await import('@mediapipe/hands');

      handsRef.current = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      handsRef.current.onResults(onResults);
      setIsInitialized(true);
      return true;
    } catch (error) {
      console.warn('MediaPipe demo initialization failed:', error);
      return false;
    }
  }, []);

  // Process MediaPipe results
  const onResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw video frame with slight blur for privacy
    ctx.filter = 'blur(2px) brightness(0.7)';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    // Draw dark overlay for better contrast
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let detectedHand = false;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      detectedHand = true;
      const landmarks = results.multiHandLandmarks[0];

      // Draw hand landmarks in bright green
      ctx.fillStyle = '#00ff00';
      landmarks.forEach((landmark: any) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Draw hand connections
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // index
        [5, 9], [9, 10], [10, 11], [11, 12], // middle
        [9, 13], [13, 14], [14, 15], [15, 16], // ring
        [13, 17], [17, 18], [18, 19], [19, 20], // pinky
        [0, 17] // palm
      ];

      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      connections.forEach(([start, end]) => {
        const startLandmark = landmarks[start];
        const endLandmark = landmarks[end];
        
        ctx.beginPath();
        ctx.moveTo(startLandmark.x * canvas.width, startLandmark.y * canvas.height);
        ctx.lineTo(endLandmark.x * canvas.width, endLandmark.y * canvas.height);
        ctx.stroke();
      });
    }

    setHandDetected(detectedHand);

    // Draw demo overlay
    ctx.fillStyle = detectedHand ? '#00ff00' : '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Exer AI Hand Tracking Demo', 10, 25);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(detectedHand ? 'Hand Detected - 21 Joint Tracking' : 'Position hand to see tracking', 10, 45);
    
    // Draw status indicator
    ctx.fillStyle = detectedHand ? '#00ff00' : '#ff6666';
    ctx.beginPath();
    ctx.arc(canvas.width - 20, 20, 8, 0, 2 * Math.PI);
    ctx.fill();
  }, []);

  // Start camera for demo
  const startCamera = useCallback(async () => {
    try {
      const video = videoRef.current;
      if (!video) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        processFrame();
      };
    } catch (error) {
      console.warn('Camera access failed for demo:', error);
      // Show fallback demo animation
      showFallbackDemo();
    }
  }, []);

  // Process video frames
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA || !handsRef.current) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      await handsRef.current.send({ image: video });
    } catch (error) {
      console.warn('Frame processing failed:', error);
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, []);

  // Fallback animated demo without camera
  const showFallbackDemo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 640;
    canvas.height = 480;

    let frame = 0;
    const animate = () => {
      // Clear canvas with dark background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Simulate hand movement
      const centerX = canvas.width / 2 + Math.sin(frame * 0.05) * 100;
      const centerY = canvas.height / 2 + Math.cos(frame * 0.03) * 50;

      // Draw simulated hand landmarks
      ctx.fillStyle = '#00ff00';
      for (let i = 0; i < 21; i++) {
        const angle = (i / 21) * Math.PI * 2 + frame * 0.02;
        const radius = 30 + (i % 3) * 15;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Draw demo text
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Exer AI Hand Tracking Demo', 10, 25);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText('Simulated 21-Joint Hand Tracking', 10, 45);
      ctx.fillText('Advanced motion analysis for medical research', 10, canvas.height - 20);

      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  }, []);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      const success = await initializeHands();
      if (success) {
        await startCamera();
      }
    };
    
    init();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      // Stop camera stream
      const video = videoRef.current;
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [initializeHands, startCamera]);

  return (
    <div className={`relative ${className} rounded-lg overflow-hidden bg-gray-900`}>
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
      />
      
      {/* Demo info overlay */}
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 rounded px-2 py-1">
        <span className="text-white text-xs">
          {handDetected ? 'Live Tracking' : 'Demo Mode'}
        </span>
      </div>
    </div>
  );
}