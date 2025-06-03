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

  // Initialize canvas immediately when component mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 640;
        canvas.height = 480;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw loading message
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('Exer AI Hand Tracking Demo', 15, 30);
        ctx.font = '14px Arial';
        ctx.fillText('Initializing motion analysis...', 15, 55);
      }
    }
  }, []);

  // Initialize MediaPipe hands for the demo
  const initializeHands = useCallback(async () => {
    try {
      // Production-optimized MediaPipe loading
      let HandsClass;
      
      // Always prioritize CDN loading for deployment compatibility
      console.log('Loading MediaPipe from CDN for deployment compatibility...');
      
      // Load MediaPipe script from CDN
      await new Promise<void>((resolve, reject) => {
        // Check if script already exists
        const existingScript = document.querySelector('script[src*="mediapipe/hands"]');
        if (existingScript) {
          console.log('MediaPipe script already loaded');
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
        script.crossOrigin = 'anonymous';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          console.log('MediaPipe CDN script loaded successfully');
          resolve();
        };
        script.onerror = () => {
          console.error('Primary CDN failed, trying backup...');
          // Try backup CDN with different approach
          const backupScript = document.createElement('script');
          backupScript.src = 'https://unpkg.com/@mediapipe/hands@0.4.1675469240/hands.js';
          backupScript.crossOrigin = 'anonymous';
          backupScript.async = true;
          backupScript.defer = true;
          backupScript.onload = () => {
            console.log('Backup CDN loaded successfully');
            resolve();
          };
          backupScript.onerror = () => {
            console.error('Backup CDN also failed, trying JSPM...');
            // Try third CDN option
            const jspmScript = document.createElement('script');
            jspmScript.src = 'https://jspm.dev/@mediapipe/hands@0.4.1675469240';
            jspmScript.crossOrigin = 'anonymous';
            jspmScript.type = 'module';
            jspmScript.onload = () => {
              console.log('JSPM CDN loaded successfully');
              resolve();
            };
            jspmScript.onerror = () => reject(new Error('All CDN sources failed'));
            document.head.appendChild(jspmScript);
          };
          document.head.appendChild(backupScript);
        };
        document.head.appendChild(script);
      });
      
      // Wait for MediaPipe to be available globally
      let attempts = 0;
      while (attempts < 10) {
        HandsClass = (window as any).Hands;
        if (HandsClass) break;
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }

      if (!HandsClass) {
        // Fallback to ES module import if available
        try {
          const { Hands } = await import('@mediapipe/hands');
          HandsClass = Hands;
          console.log('Fallback: MediaPipe loaded via ES import');
        } catch (importError) {
          throw new Error('MediaPipe not available after all loading attempts');
        }
      }

      console.log('Creating MediaPipe Hands instance...');
      handsRef.current = new HandsClass({
        locateFile: (file: string) => {
          // Try multiple CDN sources for better reliability
          const cdnSources = [
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
            `https://unpkg.com/@mediapipe/hands@0.4.1675469240/${file}`,
            `https://cdn.skypack.dev/@mediapipe/hands@0.4.1675469240/${file}`
          ];
          return cdnSources[0]; // Use primary CDN
        }
      });

      // Set up the results callback before setting options
      handsRef.current.onResults(onResults);

      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
        staticImageMode: false,
        selfieMode: true
      });

      // Initialize MediaPipe with error handling
      if (typeof handsRef.current.initialize === 'function') {
        try {
          await handsRef.current.initialize();
          console.log('MediaPipe initialization completed successfully');
        } catch (initError) {
          console.warn('MediaPipe initialization failed:', initError);
          throw initError;
        }
      }
      console.log('MediaPipe demo initialized successfully');
      setIsInitialized(true);
      return true;
    } catch (error) {
      console.warn('MediaPipe demo initialization failed:', error);
      // Show fallback animation instead of failing completely
      showFallbackDemo();
      return false;
    }
  }, []);

  // Track if we're using live tracking
  const [isUsingLiveTracking, setIsUsingLiveTracking] = useState(false);
  const liveTrackingRef = useRef(false);

  // Unified canvas drawing function for both live and demo
  const drawFrame = useCallback((landmarks?: any[], isLive = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 640;
    canvas.height = 480;

    // Draw clean dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let detectedHand = false;

    if (landmarks && landmarks.length > 0) {
      detectedHand = true;

      // Draw hand landmarks in bright green
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

    setHandDetected(detectedHand);

    // Draw demo overlay
    ctx.fillStyle = detectedHand ? '#00ff00' : '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Exer AI Hand Tracking Demo', 10, 30);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    const statusText = isLive 
      ? (detectedHand ? 'LIVE: Hand Detected - 21 Joint Tracking' : 'LIVE: Position hand to see tracking')
      : '👋 Waving Hello - 21-Joint Analysis';
    ctx.fillText(statusText, 10, 55);
    
    // Draw status indicator
    ctx.fillStyle = detectedHand ? '#00ff00' : (isLive ? '#ff6666' : '#ffa500');
    ctx.beginPath();
    ctx.arc(canvas.width - 25, 25, 10, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add status text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(isLive ? 'LIVE' : 'DEMO', canvas.width - (isLive ? 55 : 60), 30);
  }, []);

  // Process MediaPipe results
  const onResults = useCallback((results: any) => {
    // Force immediate switch to live tracking
    liveTrackingRef.current = true;
    setIsUsingLiveTracking(true);
    
    // Cancel any existing fallback animation immediately
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    // Draw live tracking frame
    const landmarks = results.multiHandLandmarks?.[0];
    drawFrame(landmarks, true);
    
    // Continue processing frames
    if (handsRef.current && videoRef.current) {
      requestAnimationFrame(async () => {
        try {
          await handsRef.current?.send({ image: videoRef.current });
        } catch (error) {
          console.warn('Frame processing error:', error);
        }
      });
    }
  }, [drawFrame]);

  // Start camera for demo
  const startCamera = useCallback(async () => {
    try {
      const video = videoRef.current;
      if (!video) return;

      // Check if we're in a secure context (required for camera access)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('MediaDevices API not available (likely not HTTPS)');
        showFallbackDemo();
        return;
      }

      // Check camera permissions first
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log('Camera permission status:', permissions.state);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      console.log('Camera stream obtained successfully');
      video.srcObject = stream;
      
      video.onloadedmetadata = () => {
        console.log('Video metadata loaded, starting playback');
        video.play().then(() => {
          console.log('Video playing, starting frame processing');
          processFrame();
        }).catch(err => {
          console.error('Video play failed:', err);
          showFallbackDemo();
        });
      };
      
      video.onerror = (err) => {
        console.error('Video error:', err);
        showFallbackDemo();
      };
    } catch (error: any) {
      console.warn('Camera access failed for demo:', error);
      console.warn('Error details:', {
        name: error?.name || 'Unknown',
        message: error?.message || 'Camera access denied',
        constraint: error?.constraint || 'None'
      });
      // Show fallback demo animation
      showFallbackDemo();
    }
  }, []);

  // Process video frames
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA || !handsRef.current || !isInitialized) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      if (handsRef.current && typeof handsRef.current.send === 'function') {
        await handsRef.current.send({ image: video });
      }
    } catch (error) {
      console.warn('Frame processing error:', error);
      // Continue processing despite errors
    }

    animationRef.current = requestAnimationFrame(processFrame);
  }, [isInitialized]);

  // Fallback animated demo without camera
  const showFallbackDemo = useCallback(() => {
    let frame = 0;
    const animate = () => {
      // Stop animation if live tracking has taken over
      if (liveTrackingRef.current) {
        return;
      }

      // Create realistic hand waving hello animation
      const baseX = 320; // center of 640px canvas
      const baseY = 240; // center of 480px canvas
      
      // Waving motion - hand moves side to side and rotates
      const wavePhase = frame * 0.08;
      const waveOffsetX = Math.sin(wavePhase) * 40;
      const waveRotation = Math.sin(wavePhase) * 0.3;
      
      // Finger wiggling motion for more natural wave
      const fingerWiggle = Math.sin(frame * 0.12) * 10;
      
      // Convert to MediaPipe format (normalized coordinates)
      const animatedLandmarks = [
        // Wrist
        { x: (baseX + waveOffsetX) / 640, y: (baseY + 60) / 480, z: 0 },
        
        // Thumb
        { x: (baseX + waveOffsetX - 40) / 640, y: (baseY + 40) / 480, z: 0 },
        { x: (baseX + waveOffsetX - 55) / 640, y: (baseY + 25) / 480, z: 0 },
        { x: (baseX + waveOffsetX - 65) / 640, y: (baseY + 10) / 480, z: 0 },
        { x: (baseX + waveOffsetX - 70) / 640, y: (baseY) / 480, z: 0 },
        
        // Index finger
        { x: (baseX + waveOffsetX - 30) / 640, y: (baseY + 50) / 480, z: 0 },
        { x: (baseX + waveOffsetX - 35 + Math.cos(waveRotation) * 10) / 640, y: (baseY + 15 + fingerWiggle) / 480, z: 0 },
        { x: (baseX + waveOffsetX - 40 + Math.cos(waveRotation) * 15) / 640, y: (baseY - 15 + fingerWiggle) / 480, z: 0 },
        { x: (baseX + waveOffsetX - 45 + Math.cos(waveRotation) * 20) / 640, y: (baseY - 35 + fingerWiggle) / 480, z: 0 },
        
        // Middle finger
        { x: (baseX + waveOffsetX - 10) / 640, y: (baseY + 50) / 480, z: 0 },
        { x: (baseX + waveOffsetX - 10 + Math.cos(waveRotation) * 5) / 640, y: (baseY + 10 + fingerWiggle * 0.8) / 480, z: 0 },
        { x: (baseX + waveOffsetX - 10 + Math.cos(waveRotation) * 10) / 640, y: (baseY - 20 + fingerWiggle * 0.8) / 480, z: 0 },
        { x: (baseX + waveOffsetX - 10 + Math.cos(waveRotation) * 15) / 640, y: (baseY - 45 + fingerWiggle * 0.8) / 480, z: 0 },
        
        // Ring finger
        { x: (baseX + waveOffsetX + 10) / 640, y: (baseY + 50) / 480, z: 0 },
        { x: (baseX + waveOffsetX + 15 + Math.cos(waveRotation) * 5) / 640, y: (baseY + 15 + fingerWiggle * 0.6) / 480, z: 0 },
        { x: (baseX + waveOffsetX + 20 + Math.cos(waveRotation) * 10) / 640, y: (baseY - 10 + fingerWiggle * 0.6) / 480, z: 0 },
        { x: (baseX + waveOffsetX + 25 + Math.cos(waveRotation) * 15) / 640, y: (baseY - 30 + fingerWiggle * 0.6) / 480, z: 0 },
        
        // Pinky
        { x: (baseX + waveOffsetX + 30) / 640, y: (baseY + 45) / 480, z: 0 },
        { x: (baseX + waveOffsetX + 40 + Math.cos(waveRotation) * 8) / 640, y: (baseY + 20 + fingerWiggle * 0.4) / 480, z: 0 },
        { x: (baseX + waveOffsetX + 50 + Math.cos(waveRotation) * 12) / 640, y: (baseY + 5 + fingerWiggle * 0.4) / 480, z: 0 },
        { x: (baseX + waveOffsetX + 60 + Math.cos(waveRotation) * 16) / 640, y: (baseY - 10 + fingerWiggle * 0.4) / 480, z: 0 }
      ];
      
      // Use unified drawing function for demo
      drawFrame(animatedLandmarks, false);

      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [drawFrame]);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      console.log('Initializing motion demo...');
      
      // Show immediate canvas content
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = 640;
          canvas.height = 480;
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 18px Arial';
          ctx.fillText('Exer AI Hand Tracking Demo', 15, 30);
          ctx.font = '14px Arial';
          ctx.fillText('Starting live tracking...', 15, 55);
        }
      }
      
      // Always start with fallback demo, then upgrade to live tracking
      showFallbackDemo();
      
      // Try MediaPipe initialization
      const success = await initializeHands();
      if (success) {
        console.log('MediaPipe initialized, starting camera...');
        
        try {
          await startCamera();
          console.log('Live tracking ready - MediaPipe will override demo when hand detected');
        } catch (error) {
          console.log('Camera failed, keeping fallback demo');
        }
      } else {
        console.log('MediaPipe failed, keeping fallback demo');
      }
    };
    
    // Add delay to ensure page is fully loaded
    const timer = setTimeout(init, 100);

    return () => {
      clearTimeout(timer);
      
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
    <div className={`relative ${className} rounded-lg overflow-hidden bg-gray-900 min-h-48`}>
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover block"
        style={{ minHeight: '192px', backgroundColor: '#1a1a1a' }}
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