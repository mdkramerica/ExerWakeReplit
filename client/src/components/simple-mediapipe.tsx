import { useEffect, useRef, useCallback } from "react";
import exerLogoPath from "@assets/exer-logo.png";

interface SimpleMediaPipeProps {
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

export default function SimpleMediaPipe({ onUpdate, isRecording, assessmentType }: SimpleMediaPipeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number | null>(null);
  const handsRef = useRef<any>(null);

  // Initialize MediaPipe with direct CDN loading
  const initializeMediaPipe = useCallback(async () => {
    console.log('Initializing MediaPipe with direct CDN approach...');
    
    return new Promise<boolean>((resolve) => {
      // Load MediaPipe script directly
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        console.log('MediaPipe script loaded');
        
        // Wait for MediaPipe to be available
        const checkMediaPipe = (attempts = 0) => {
          if ((window as any).Hands) {
            console.log('MediaPipe Hands class found');
            
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
              console.log('MediaPipe initialized successfully');
              resolve(true);
            } catch (error) {
              console.error('Failed to initialize MediaPipe:', error);
              resolve(false);
            }
          } else if (attempts < 50) {
            setTimeout(() => checkMediaPipe(attempts + 1), 100);
          } else {
            console.log('MediaPipe not available after waiting');
            resolve(false);
          }
        };
        
        checkMediaPipe();
      };
      
      script.onerror = () => {
        console.error('Failed to load MediaPipe script');
        resolve(false);
      };
      
      document.head.appendChild(script);
    });
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
      if (video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    } catch (error) {
      console.warn('Video drawing error:', error);
    }

    let handDetected = false;
    let landmarks: any[] = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      handDetected = true;
      landmarks = results.multiHandLandmarks[0];

      // Draw hand landmarks
      ctx.fillStyle = '#00ff00';
      landmarks.forEach((landmark: any, index: number) => {
        const x = (1 - landmark.x) * canvas.width;
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
        if (landmarks[start] && landmarks[end]) {
          ctx.beginPath();
          ctx.moveTo((1 - landmarks[start].x) * canvas.width, landmarks[start].y * canvas.height);
          ctx.lineTo((1 - landmarks[end].x) * canvas.width, landmarks[end].y * canvas.height);
          ctx.stroke();
        }
      });

      onUpdate({
        handDetected: true,
        landmarksCount: landmarks.length,
        trackingQuality: "Good",
        handPosition: "Hand tracked",
        landmarks: landmarks
      });
    } else {
      onUpdate({
        handDetected: false,
        landmarksCount: 0,
        trackingQuality: "Poor",
        handPosition: "No hand detected"
      });
    }

    // Draw status
    ctx.fillStyle = handDetected ? '#00ff00' : '#ff6666';
    ctx.font = '16px Arial';
    ctx.fillText(handDetected ? 'Hand Tracked' : 'Position hand in view', 10, 30);
  }, [onUpdate]);

  // Process video frames
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      if (handsRef.current) {
        await handsRef.current.send({ image: video });
      }
    } catch (error) {
      console.warn('Frame processing error:', error);
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, []);

  // Start camera and MediaPipe
  useEffect(() => {
    const startSystem = async () => {
      try {
        // Start camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          console.log('Camera started');
        }

        // Initialize MediaPipe
        const success = await initializeMediaPipe();
        if (success) {
          console.log('Starting frame processing');
          processFrame();
        } else {
          console.log('MediaPipe failed, using camera only');
          // Start basic camera mode
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

            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;

            try {
              if (video.readyState >= 2) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillRect(10, 10, 120, 30);
                ctx.fillStyle = '#000000';
                ctx.font = '14px Arial';
                ctx.fillText('Camera Only', 15, 30);
                
                onUpdate({
                  handDetected: false,
                  landmarksCount: 0,
                  trackingQuality: "Camera Only",
                  handPosition: "Hand tracking unavailable"
                });
              }
            } catch (error) {
              console.warn('Video draw error:', error);
            }

            requestAnimationFrame(drawBasicVideo);
          };

          drawBasicVideo();
        }
      } catch (error) {
        console.error('System startup failed:', error);
        onUpdate({
          handDetected: false,
          landmarksCount: 0,
          trackingQuality: "Error",
          handPosition: "Camera access failed"
        });
      }
    };

    startSystem();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [initializeMediaPipe, processFrame, onUpdate]);

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