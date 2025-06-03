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
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
        }
      });

      handsRef.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        staticImageMode: false,
        selfieMode: true
      });

      handsRef.current.onResults(onResults);
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
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw clean dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let detectedHand = false;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      detectedHand = true;
      const landmarks = results.multiHandLandmarks[0];

      // Draw hand landmarks in bright green with larger, more visible points
      ctx.fillStyle = '#00ff00';
      landmarks.forEach((landmark: any) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add glow effect
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw hand connections with glow effect
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
    
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA || !handsRef.current || !isInitialized) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      if (handsRef.current && typeof handsRef.current.send === 'function') {
        await handsRef.current.send({ image: video });
      }
    } catch (error) {
      // Silently handle frame processing errors to avoid console spam
      if (error && typeof error === 'object' && Object.keys(error).length > 0) {
        console.warn('Frame processing failed:', error);
      }
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
      console.log('Initializing motion demo...');
      const success = await initializeHands();
      if (success) {
        console.log('MediaPipe initialized, starting camera...');
        await startCamera();
      } else {
        console.log('MediaPipe failed, showing fallback demo');
        // Fallback demo is already triggered in initializeHands
      }
    };
    
    // Add delay to ensure page is fully loaded
    const timer = setTimeout(init, 500);

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