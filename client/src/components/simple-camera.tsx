import { useRef, useEffect, useCallback } from 'react';
import exerLogoPath from "@assets/exer-logo.png";

interface SimpleCameraProps {
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

export default function SimpleCamera({ onUpdate, isRecording, assessmentType }: SimpleCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawVideoFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) {
      requestAnimationFrame(drawVideoFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      requestAnimationFrame(drawVideoFrame);
      return;
    }

    // Set canvas dimensions to match video
    if (video.videoWidth && video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    try {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw mirrored video feed
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        // Add camera status indicator
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillRect(10, 10, 140, 30);
        ctx.fillStyle = '#000000';
        ctx.font = '14px Arial';
        ctx.fillText('Camera Active', 15, 30);

        // Update status
        onUpdate({
          handDetected: true, // Simulated for basic functionality
          landmarksCount: 0,
          trackingQuality: "Camera Only",
          handPosition: "Basic camera mode"
        });
      }
    } catch (error) {
      console.warn('Video drawing error:', error);
    }

    requestAnimationFrame(drawVideoFrame);
  }, [onUpdate]);

  useEffect(() => {
    const initializeCamera = async () => {
      try {
        console.log('Initializing simple camera...');
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640, min: 320 }, 
            height: { ideal: 480, min: 240 }, 
            facingMode: 'user'
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            console.log('Simple camera video loaded:', {
              width: videoRef.current?.videoWidth,
              height: videoRef.current?.videoHeight
            });
            // Start drawing video frames
            drawVideoFrame();
          };
          await videoRef.current.play();
          console.log('Simple camera started successfully');
        }
      } catch (error) {
        console.error('Simple camera initialization failed:', error);
        onUpdate({
          handDetected: false,
          landmarksCount: 0,
          trackingQuality: "Error",
          handPosition: "Camera unavailable"
        });
      }
    };

    initializeCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [drawVideoFrame, onUpdate]);

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
        <span>Simple Camera</span>
      </div>
    </div>
  );
}