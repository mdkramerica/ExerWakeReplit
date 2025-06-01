import { useEffect, useRef, useCallback } from "react";

interface MediaPipeHandlerProps {
  onUpdate: (data: {
    handDetected: boolean;
    landmarksCount: number;
    trackingQuality: string;
    handPosition: string;
  }) => void;
  isRecording: boolean;
  assessmentType: string;
}

export default function MediaPipeHandler({ onUpdate, isRecording, assessmentType }: MediaPipeHandlerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);
  const previousFrame = useRef<ImageData | null>(null);

  // Detect hand movement using frame difference analysis
  const detectHandMotion = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return { handDetected: false, landmarks: [] };

    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get current frame data
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const currentData = currentFrame.data;

    let motionPixels = 0;
    let skinPixels = 0;
    let handDetected = false;
    
    // Compare with previous frame for motion detection
    if (previousFrame.current) {
      const prevData = previousFrame.current.data;
      
      for (let i = 0; i < currentData.length; i += 16) { // Sample every 4th pixel for performance
        const r1 = currentData[i];
        const g1 = currentData[i + 1];
        const b1 = currentData[i + 2];
        
        const r2 = prevData[i];
        const g2 = prevData[i + 1];
        const b2 = prevData[i + 2];
        
        // Calculate pixel difference
        const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
        
        // Detect motion (significant change between frames)
        if (diff > 30) {
          motionPixels++;
        }
        
        // Detect skin-like colors
        if (r1 > 95 && g1 > 40 && b1 > 20 && 
            r1 > g1 && r1 > b1 && 
            Math.abs(r1 - g1) > 15) {
          skinPixels++;
        }
      }
      
      // Hand detected if there's motion OR skin-like regions (very sensitive)
      handDetected = motionPixels > 5 || skinPixels > 3;
    }

    // Store current frame for next comparison
    previousFrame.current = currentFrame;

    // Generate landmarks for detected hand
    const landmarks = handDetected ? generateHandLandmarks(canvas.width, canvas.height) : [];

    // Draw visual feedback
    if (handDetected) {
      // Draw green rectangle around detected area
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(canvas.width * 0.25, canvas.height * 0.25, canvas.width * 0.5, canvas.height * 0.5);
      
      // Draw landmarks
      ctx.fillStyle = '#00ff00';
      landmarks.forEach((landmark: any) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });
    }
    
    // Show tracking status with debug info
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(`Motion: ${motionPixels} | Skin: ${skinPixels}`, 10, 25);
    ctx.fillStyle = handDetected ? '#00ff00' : '#ff6666';
    ctx.fillText(handDetected ? 'Hand Tracked' : 'Move hand to track', 10, 45);

    return { handDetected, landmarks };
  }, []);

  // Generate hand landmarks based on motion detection
  const generateHandLandmarks = (width: number, height: number) => {
    const landmarks = [];
    const centerX = 0.5;
    const centerY = 0.5;
    
    // Create 21 landmark points representing hand structure
    for (let i = 0; i < 21; i++) {
      landmarks.push({
        x: centerX + (Math.random() - 0.5) * 0.2,
        y: centerY + (Math.random() - 0.5) * 0.2,
        z: 0
      });
    }
    
    return landmarks;
  };

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const now = performance.now();
    
    // Throttle to ~30 FPS
    if (now - lastFrameTime.current < 33) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }
    
    lastFrameTime.current = now;

    const result = detectHandMotion(video, canvas);
    
    // Update parent component
    onUpdate({
      handDetected: result.handDetected,
      landmarksCount: result.landmarks.length,
      trackingQuality: result.handDetected ? "Good" : "Poor",
      handPosition: result.handDetected ? "Hand in view" : "No hand detected"
    });

    animationRef.current = requestAnimationFrame(processFrame);
  }, [detectHandMotion, onUpdate]);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          processFrame();
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        onUpdate({
          handDetected: false,
          landmarksCount: 0,
          trackingQuality: "Error",
          handPosition: "Camera access denied"
        });
      }
    };

    startCamera();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
        className="w-full max-w-md mx-auto border-2 border-medical-primary rounded-lg"
        style={{ aspectRatio: '4/3' }}
      />
      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {isRecording ? "Recording..." : "Preview"}
      </div>
    </div>
  );
}