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

  // Process MediaPipe results
  const onResults = useCallback((results: any) => {
    // Cancel any existing fallback animation when we get live results
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const canvasWidth = video?.videoWidth || 640;
    const canvasHeight = video?.videoHeight || 480;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Draw clean dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    let detectedHand = false;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      detectedHand = true;
      const landmarks = results.multiHandLandmarks[0];

      // Draw hand landmarks in bright green
      ctx.fillStyle = '#00ff00';
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 8;
      landmarks.forEach((landmark: any) => {
        const x = landmark.x * canvasWidth;
        const y = landmark.y * canvasHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
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
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 4;
      connections.forEach(([start, end]) => {
        const startLandmark = landmarks[start];
        const endLandmark = landmarks[end];
        
        ctx.beginPath();
        ctx.moveTo(startLandmark.x * canvasWidth, startLandmark.y * canvasHeight);
        ctx.lineTo(endLandmark.x * canvasWidth, endLandmark.y * canvasHeight);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
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
    ctx.arc(canvasWidth - 20, 20, 8, 0, 2 * Math.PI);
    ctx.fill();
  }, []);

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

      // Create realistic hand waving hello animation
      const baseX = canvas.width / 2;
      const baseY = canvas.height / 2;
      
      // Waving motion - hand moves side to side and rotates
      const wavePhase = frame * 0.08;
      const waveOffsetX = Math.sin(wavePhase) * 40;
      const waveRotation = Math.sin(wavePhase) * 0.3;
      
      // Finger wiggling motion for more natural wave
      const fingerWiggle = Math.sin(frame * 0.12) * 10;
      
      // Define hand landmark positions for waving hello
      const handLandmarks = [
        // Wrist (moves with wave)
        { x: baseX + waveOffsetX, y: baseY + 60 },
        
        // Thumb (slightly bent, natural position)
        { x: baseX + waveOffsetX - 40, y: baseY + 40 },
        { x: baseX + waveOffsetX - 55, y: baseY + 25 },
        { x: baseX + waveOffsetX - 65, y: baseY + 10 },
        { x: baseX + waveOffsetX - 70, y: baseY },
        
        // Index finger (extended and wiggling)
        { x: baseX + waveOffsetX - 30, y: baseY + 50 },
        { x: baseX + waveOffsetX - 35 + Math.cos(waveRotation) * 10, y: baseY + 15 + fingerWiggle },
        { x: baseX + waveOffsetX - 40 + Math.cos(waveRotation) * 15, y: baseY - 15 + fingerWiggle },
        { x: baseX + waveOffsetX - 45 + Math.cos(waveRotation) * 20, y: baseY - 35 + fingerWiggle },
        
        // Middle finger (extended and wiggling)
        { x: baseX + waveOffsetX - 10, y: baseY + 50 },
        { x: baseX + waveOffsetX - 10 + Math.cos(waveRotation) * 5, y: baseY + 10 + fingerWiggle * 0.8 },
        { x: baseX + waveOffsetX - 10 + Math.cos(waveRotation) * 10, y: baseY - 20 + fingerWiggle * 0.8 },
        { x: baseX + waveOffsetX - 10 + Math.cos(waveRotation) * 15, y: baseY - 45 + fingerWiggle * 0.8 },
        
        // Ring finger (extended and wiggling)
        { x: baseX + waveOffsetX + 10, y: baseY + 50 },
        { x: baseX + waveOffsetX + 15 + Math.cos(waveRotation) * 5, y: baseY + 15 + fingerWiggle * 0.6 },
        { x: baseX + waveOffsetX + 20 + Math.cos(waveRotation) * 10, y: baseY - 10 + fingerWiggle * 0.6 },
        { x: baseX + waveOffsetX + 25 + Math.cos(waveRotation) * 15, y: baseY - 30 + fingerWiggle * 0.6 },
        
        // Pinky (extended and wiggling)
        { x: baseX + waveOffsetX + 30, y: baseY + 45 },
        { x: baseX + waveOffsetX + 40 + Math.cos(waveRotation) * 8, y: baseY + 20 + fingerWiggle * 0.4 },
        { x: baseX + waveOffsetX + 50 + Math.cos(waveRotation) * 12, y: baseY + 5 + fingerWiggle * 0.4 },
        { x: baseX + waveOffsetX + 60 + Math.cos(waveRotation) * 16, y: baseY - 10 + fingerWiggle * 0.4 }
      ];

      // Draw hand connections
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // index
        [5, 9], [9, 10], [10, 11], [11, 12], // middle
        [9, 13], [13, 14], [14, 15], [15, 16], // ring
        [13, 17], [17, 18], [18, 19], [19, 20], // pinky
        [0, 17] // palm
      ];

      // Draw connections with glow
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 8;
      connections.forEach(([start, end]) => {
        const startPoint = handLandmarks[start];
        const endPoint = handLandmarks[end];
        
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      // Draw landmarks with glow effect
      ctx.fillStyle = '#00ff00';
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 10;
      handLandmarks.forEach((landmark, i) => {
        ctx.beginPath();
        ctx.arc(landmark.x, landmark.y, i === 0 ? 6 : 4, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Draw demo text with better styling
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('Exer AI Hand Tracking Demo', 15, 30);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Arial';
      ctx.fillText('👋 Waving Hello - 21-Joint Analysis', 15, 55);
      
      ctx.font = '12px Arial';
      ctx.fillStyle = '#cccccc';
      ctx.fillText('Advanced biomechanical assessment platform', 15, canvas.height - 25);
      ctx.fillText('Clinical-grade precision for medical research', 15, canvas.height - 10);

      // Draw status indicator
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(canvas.width - 25, 25, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText('DEMO', canvas.width - 50, 30);

      frame++;
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
  }, []);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      console.log('Initializing motion demo...');
      
      // Start with fallback demo immediately
      showFallbackDemo();
      
      // Then try MediaPipe initialization
      const success = await initializeHands();
      if (success) {
        console.log('MediaPipe initialized, attempting camera access...');
        
        try {
          await startCamera();
          console.log('Camera started successfully, live tracking enabled');
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