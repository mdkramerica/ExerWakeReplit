import { useEffect, useRef } from "react";
import { useMediaPipe } from "@/hooks/use-mediapipe";

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
  
  const {
    isInitialized,
    handDetected,
    landmarks,
    initializeMediaPipe,
    processFrame,
    cleanup
  } = useMediaPipe();

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        await initializeMediaPipe();
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };

    startCamera();

    return () => {
      cleanup();
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [initializeMediaPipe, cleanup]);

  useEffect(() => {
    if (!isInitialized || !videoRef.current || !canvasRef.current) return;

    const processVideo = () => {
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const video = videoRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (ctx) {
          // Draw video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Process with MediaPipe
          processFrame(canvas);

          // Calculate tracking metrics
          const landmarksCount = landmarks.length;
          const quality = landmarksCount === 21 ? "Excellent" : 
                         landmarksCount >= 15 ? "Good" : 
                         landmarksCount >= 10 ? "Fair" : "Poor";
          
          const position = handDetected ? "Centered" : "Not Detected";

          // Update parent component
          onUpdate({
            handDetected,
            landmarksCount,
            trackingQuality: quality,
            handPosition: position
          });

          // Draw landmarks if detected
          if (landmarks.length > 0) {
            ctx.fillStyle = '#00FF00';
            landmarks.forEach(landmark => {
              ctx.beginPath();
              ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 3, 0, 2 * Math.PI);
              ctx.fill();
            });

            // Draw hand connections
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            drawHandConnections(ctx, landmarks, canvas.width, canvas.height);
          }
        }
      }

      requestAnimationFrame(processVideo);
    };

    processVideo();
  }, [isInitialized, handDetected, landmarks, processFrame, onUpdate]);

  const drawHandConnections = (ctx: CanvasRenderingContext2D, landmarks: any[], width: number, height: number) => {
    // Hand landmark connections based on MediaPipe hand model
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17] // Palm connections
    ];

    connections.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end]) {
        ctx.beginPath();
        ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
        ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
        ctx.stroke();
      }
    });
  };

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full mediapipe-canvas"
      />
    </div>
  );
}
