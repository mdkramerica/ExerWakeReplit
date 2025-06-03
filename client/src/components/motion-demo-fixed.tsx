import { useCallback, useEffect, useRef, useState } from 'react';

interface MotionDemoProps {
  className?: string;
}

export default function MotionDemo({ className = "w-full h-48" }: MotionDemoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handsRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  
  // Draw frame with landmarks
  const drawFrame = useCallback((landmarks?: any[], isLive = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 640;
    canvas.height = 480;

    // Clear with dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let hasHand = false;

    // Draw hand landmarks if available
    if (landmarks && landmarks.length > 0) {
      hasHand = true;

      // Draw landmarks
      ctx.fillStyle = '#00ff00';
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 8;
      landmarks.forEach((landmark: any) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Draw connections
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // index
        [5, 9], [9, 10], [10, 11], [11, 12], // middle
        [9, 13], [13, 14], [14, 15], [15, 16], // ring
        [13, 17], [17, 18], [18, 19], [19, 20], // pinky
        [0, 17] // palm
      ];

      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 5;
      connections.forEach(([start, end]) => {
        const startLandmark = landmarks[start];
        const endLandmark = landmarks[end];
        
        ctx.beginPath();
        ctx.moveTo(startLandmark.x * canvas.width, startLandmark.y * canvas.height);
        ctx.lineTo(endLandmark.x * canvas.width, endLandmark.y * canvas.height);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
    }

    setHandDetected(hasHand);

    // Draw header
    ctx.fillStyle = hasHand ? '#00ff00' : '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Exer AI Hand Tracking Demo', 10, 30);
    
    // Draw status
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    const statusText = isLive 
      ? (hasHand ? 'LIVE: Hand Detected - 21 Joint Tracking' : 'LIVE: Position hand to see tracking')
      : '👋 Waving Hello - 21-Joint Analysis';
    ctx.fillText(statusText, 10, 55);
    
    // Draw status indicator
    ctx.fillStyle = hasHand ? '#00ff00' : (isLive ? '#ff6666' : '#ffa500');
    ctx.beginPath();
    ctx.arc(canvas.width - 25, 25, 10, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw mode text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(isLive ? 'LIVE' : 'DEMO', canvas.width - (isLive ? 55 : 60), 30);
  }, []);

  // Generate animated hand for demo
  const generateDemoHand = useCallback((frame: number) => {
    const baseX = 320;
    const baseY = 240;
    const wavePhase = frame * 0.08;
    const waveOffsetX = Math.sin(wavePhase) * 40;
    const fingerWiggle = Math.sin(frame * 0.12) * 10;
    
    return [
      // Wrist
      { x: (baseX + waveOffsetX) / 640, y: (baseY + 60) / 480, z: 0 },
      // Thumb
      { x: (baseX + waveOffsetX - 40) / 640, y: (baseY + 40) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 55) / 640, y: (baseY + 25) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 65) / 640, y: (baseY + 10) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 70) / 640, y: (baseY) / 480, z: 0 },
      // Index
      { x: (baseX + waveOffsetX - 30) / 640, y: (baseY + 50) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 35) / 640, y: (baseY + 15 + fingerWiggle) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 40) / 640, y: (baseY - 15 + fingerWiggle) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 45) / 640, y: (baseY - 35 + fingerWiggle) / 480, z: 0 },
      // Middle
      { x: (baseX + waveOffsetX - 10) / 640, y: (baseY + 50) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 10) / 640, y: (baseY + 10 + fingerWiggle * 0.8) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 10) / 640, y: (baseY - 20 + fingerWiggle * 0.8) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 10) / 640, y: (baseY - 45 + fingerWiggle * 0.8) / 480, z: 0 },
      // Ring
      { x: (baseX + waveOffsetX + 10) / 640, y: (baseY + 50) / 480, z: 0 },
      { x: (baseX + waveOffsetX + 15) / 640, y: (baseY + 15 + fingerWiggle * 0.6) / 480, z: 0 },
      { x: (baseX + waveOffsetX + 20) / 640, y: (baseY - 10 + fingerWiggle * 0.6) / 480, z: 0 },
      { x: (baseX + waveOffsetX + 25) / 640, y: (baseY - 30 + fingerWiggle * 0.6) / 480, z: 0 },
      // Pinky
      { x: (baseX + waveOffsetX + 30) / 640, y: (baseY + 45) / 480, z: 0 },
      { x: (baseX + waveOffsetX + 40) / 640, y: (baseY + 20 + fingerWiggle * 0.4) / 480, z: 0 },
      { x: (baseX + waveOffsetX + 50) / 640, y: (baseY + 5 + fingerWiggle * 0.4) / 480, z: 0 },
      { x: (baseX + waveOffsetX + 60) / 640, y: (baseY - 10 + fingerWiggle * 0.4) / 480, z: 0 }
    ];
  }, []);

  // Demo animation loop
  const runDemo = useCallback(() => {
    let frame = 0;
    
    const animate = () => {
      if (isLiveMode) return; // Stop demo if live mode activated
      
      const demoLandmarks = generateDemoHand(frame);
      drawFrame(demoLandmarks, false);
      
      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [isLiveMode, generateDemoHand, drawFrame]);

  // Initialize MediaPipe
  const initializeMediaPipe = useCallback(async () => {
    try {
      console.log('Loading MediaPipe...');
      
      // Load MediaPipe script
      if (!(window as any).Hands) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      // Create Hands instance
      const hands = new (window as any).Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults((results: any) => {
        if (!isLiveMode) {
          console.log('Switching to live mode');
          setIsLiveMode(true);
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
        }
        
        const landmarks = results.multiHandLandmarks?.[0];
        drawFrame(landmarks, true);
        
        // Continue processing
        if (videoRef.current && handsRef.current) {
          requestAnimationFrame(async () => {
            try {
              await handsRef.current.send({ image: videoRef.current });
            } catch (error) {
              console.warn('Frame processing error:', error);
            }
          });
        }
      });

      handsRef.current = hands;
      
      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          
          // Start processing frames
          const processFrame = async () => {
            if (handsRef.current && videoRef.current) {
              try {
                await handsRef.current.send({ image: videoRef.current });
              } catch (error) {
                console.warn('Processing error:', error);
              }
            }
            if (!isLiveMode) {
              requestAnimationFrame(processFrame);
            }
          };
          processFrame();
        };
      }
      
      console.log('MediaPipe initialized successfully');
      return true;
    } catch (error) {
      console.warn('MediaPipe initialization failed:', error);
      return false;
    }
  }, [isLiveMode, drawFrame]);

  // Initialize component
  useEffect(() => {
    // Always start with demo
    runDemo();
    
    // Try to initialize MediaPipe in background
    const timer = setTimeout(() => {
      initializeMediaPipe().catch(() => {
        console.log('Live tracking unavailable, continuing with demo');
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [runDemo, initializeMediaPipe]);

  return (
    <div className={className}>
      <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-gray-700">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
          width={640}
          height={480}
        />
        <video
          ref={videoRef}
          className="hidden"
          width={640}
          height={480}
          autoPlay
          muted
          playsInline
        />
        
        {/* Status overlay */}
        <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
          {isLiveMode ? 'LIVE TRACKING' : 'DEMO MODE'}
        </div>
        
        {handDetected && (
          <div className="absolute top-2 right-2 bg-green-500/80 px-2 py-1 rounded text-xs text-white">
            Hand Detected
          </div>
        )}
      </div>
    </div>
  );
}