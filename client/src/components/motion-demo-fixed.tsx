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

  // Generate animated hand for demo - palm facing camera with big waving hello
  const generateDemoHand = useCallback((frame: number) => {
    const baseX = 320;
    const baseY = 280;
    
    // Big enthusiastic waving motion
    const wavePhase = frame * 0.05; // Slower for dramatic effect
    const waveOffsetX = Math.sin(wavePhase) * 100; // Much bigger horizontal movement
    const waveRotation = Math.sin(wavePhase) * 0.5; // Hand rotation during wave
    
    // Finger movement for big hello wave
    const fingerWave = Math.sin(frame * 0.12) * 30; // Bigger finger movement
    const palmTilt = Math.cos(wavePhase) * 20; // Palm tilts during wave
    
    return [
      // Wrist (anchor point)
      { x: (baseX + waveOffsetX) / 640, y: (baseY + 80) / 480, z: 0 },
      
      // Thumb (extends outward from palm)
      { x: (baseX + waveOffsetX - 70) / 640, y: (baseY + 50) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 90) / 640, y: (baseY + 25) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 105) / 640, y: (baseY + 5) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 115) / 640, y: (baseY - 15) / 480, z: 0 },
      
      // Index finger (enthusiastic waving)
      { x: (baseX + waveOffsetX - 50) / 640, y: (baseY + 60) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 55 + Math.cos(waveRotation) * 25) / 640, y: (baseY + 20 + fingerWave + palmTilt) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 60 + Math.cos(waveRotation) * 40) / 640, y: (baseY - 20 + fingerWave + palmTilt) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 65 + Math.cos(waveRotation) * 55) / 640, y: (baseY - 65 + fingerWave + palmTilt) / 480, z: 0 },
      
      // Middle finger (tallest, most prominent)
      { x: (baseX + waveOffsetX - 15) / 640, y: (baseY + 60) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 18 + Math.cos(waveRotation) * 20) / 640, y: (baseY + 15 + fingerWave * 0.9 + palmTilt) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 22 + Math.cos(waveRotation) * 35) / 640, y: (baseY - 30 + fingerWave * 0.9 + palmTilt) / 480, z: 0 },
      { x: (baseX + waveOffsetX - 26 + Math.cos(waveRotation) * 50) / 640, y: (baseY - 80 + fingerWave * 0.9 + palmTilt) / 480, z: 0 },
      
      // Ring finger (follows the wave)
      { x: (baseX + waveOffsetX + 25) / 640, y: (baseY + 60) / 480, z: 0 },
      { x: (baseX + waveOffsetX + 30 + Math.cos(waveRotation) * 18) / 640, y: (baseY + 20 + fingerWave * 0.7 + palmTilt) / 480, z: 0 },
      { x: (baseX + waveOffsetX + 35 + Math.cos(waveRotation) * 30) / 640, y: (baseY - 15 + fingerWave * 0.7 + palmTilt) / 480, z: 0 },
      { x: (baseX + waveOffsetX + 40 + Math.cos(waveRotation) * 45) / 640, y: (baseY - 60 + fingerWave * 0.7 + palmTilt) / 480, z: 0 },
      
      // Pinky (energetic little finger)
      { x: (baseX + waveOffsetX + 60) / 640, y: (baseY + 55) / 480, z: 0 },
      { x: (baseX + waveOffsetX + 70 + Math.cos(waveRotation) * 15) / 640, y: (baseY + 25 + fingerWave * 0.5 + palmTilt) / 480, z: 0 },
      { x: (baseX + waveOffsetX + 80 + Math.cos(waveRotation) * 25) / 640, y: (baseY + 0 + fingerWave * 0.5 + palmTilt) / 480, z: 0 },
      { x: (baseX + waveOffsetX + 90 + Math.cos(waveRotation) * 35) / 640, y: (baseY - 35 + fingerWave * 0.5 + palmTilt) / 480, z: 0 }
    ];
  }, []);

  // Demo animation loop
  const runDemo = useCallback(() => {
    // Ensure we're in demo mode
    setIsLiveMode(false);
    
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

      // Set optimized options for smooth performance
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // Lite model for best performance
        minDetectionConfidence: 0.5, // Lower for better responsiveness
        minTrackingConfidence: 0.3,   // Lower for smoother tracking
        staticImageMode: false,       // Enable video mode optimization
        useCpuInference: false        // Use GPU acceleration
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
              
              // Optimized frame processing for smooth tracking
              let lastProcessTime = 0;
              let errorCount = 0;
              
              const processFrame = async () => {
                const now = performance.now();
                
                // Limit to 15 FPS for smooth performance
                if (now - lastProcessTime < 66 || !handsRef.current || !videoRef.current) {
                  requestAnimationFrame(processFrame);
                  return;
                }
                
                try {
                  lastProcessTime = now;
                  await handsRef.current.send({ image: videoRef.current });
                  errorCount = 0; // Reset error count on success
                  requestAnimationFrame(processFrame);
                } catch (error) {
                  errorCount++;
                  console.warn(`Frame processing error ${errorCount}:`, error);
                  
                  // Fall back to demo after 5 consecutive errors
                  if (errorCount >= 5) {
                    console.log('Multiple errors detected, switching to demo mode');
                    setIsLiveMode(false);
                    runDemo();
                    return;
                  }
                  
                  // Continue with longer delay after error
                  setTimeout(() => requestAnimationFrame(processFrame), 150);
                }
              };
              
              // Start processing immediately for responsiveness
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
      // Primary mode: Start with reliable demo
      console.log('Starting hand tracking demo...');
      runDemo();
      
      // Live tracking disabled for stability
      console.log('Demo mode active - 21-joint biomechanical analysis ready');
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