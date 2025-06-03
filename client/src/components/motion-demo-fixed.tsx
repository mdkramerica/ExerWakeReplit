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

  // Initialize MediaPipe with robust error handling
  const initializeMediaPipe = useCallback(async () => {
    try {
      console.log('Loading MediaPipe...');
      
      // Load MediaPipe script with timeout
      if (!(window as any).Hands) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
          
          // Timeout after 10 seconds
          setTimeout(() => reject(new Error('MediaPipe load timeout')), 10000);
        });
      }

      // Wait for MediaPipe to be fully available
      await new Promise((resolve) => {
        const checkReady = () => {
          if ((window as any).Hands) {
            resolve(true);
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });

      // Create Hands instance with error handling
      const hands = new (window as any).Hands({
        locateFile: (file: string) => {
          // Use CDN URLs for all MediaPipe assets
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      // Set conservative options for better compatibility
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // Use lite model for better performance
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      // Handle results with error protection
      hands.onResults((results: any) => {
        try {
          if (!isLiveMode) {
            console.log('Live tracking active');
            setIsLiveMode(true);
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current);
            }
          }
          
          const landmarks = results.multiHandLandmarks?.[0];
          drawFrame(landmarks, true);
        } catch (error) {
          console.warn('Results processing error:', error);
        }
      });

      handsRef.current = hands;
      
      // Start camera with error handling
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        return new Promise((resolve) => {
          videoRef.current!.onloadedmetadata = async () => {
            try {
              await videoRef.current!.play();
              
              // Start continuous frame processing for live tracking
              const processFrame = async () => {
                try {
                  if (handsRef.current && videoRef.current) {
                    await handsRef.current.send({ image: videoRef.current });
                    requestAnimationFrame(processFrame);
                  }
                } catch (error) {
                  console.warn('Frame processing error:', error);
                  // Continue processing despite errors
                  requestAnimationFrame(processFrame);
                }
              };
              
              // Start processing immediately
              processFrame();
              
              console.log('MediaPipe initialized successfully');
              resolve(true);
            } catch (error) {
              console.warn('Video playback failed:', error);
              resolve(false);
            }
          };
        });
      }
      
      return true;
    } catch (error) {
      console.warn('MediaPipe initialization failed:', error);
      return false;
    }
  }, [isLiveMode, drawFrame]);

  // Initialize component
  useEffect(() => {
    const init = async () => {
      // First priority: Try live tracking
      console.log('Attempting live hand tracking...');
      
      try {
        const success = await initializeMediaPipe();
        if (success) {
          console.log('Live tracking initialized successfully');
          return; // Live tracking is active, no need for demo
        }
      } catch (error) {
        console.log('Live tracking failed, falling back to demo mode');
      }
      
      // Fallback: Start animated demo
      console.log('Starting demo mode - 21-joint biomechanical analysis');
      runDemo();
    };

    init();

    return () => {
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