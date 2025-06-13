# Wrist Flexion/Extension Motion Replay Canvas - Technical Documentation

## Overview
The wrist motion replay canvas system provides frame-by-frame visualization of recorded wrist flexion/extension assessments with real-time angle calculations and anatomical landmark rendering.

## Architecture Components

### Core Canvas Implementation
```typescript
// Canvas reference and context management
const canvasRef = useRef<HTMLCanvasElement>(null);
const [currentFrame, setCurrentFrame] = useState(0);
const [isPlaying, setIsPlaying] = useState(false);
const [playbackSpeed, setPlaybackSpeed] = useState(1);
const animationRef = useRef<number | null>(null);

// Wrist-specific state
const [currentWristAngles, setCurrentWristAngles] = useState<ElbowWristAngles | null>(null);
const [maxWristAngles, setMaxWristAngles] = useState<ElbowWristAngles | null>(null);
```

### Data Structure for Replay
```typescript
interface ReplayData {
  timestamp: number;
  landmarks: Array<{x: number, y: number, z: number}>; // Hand landmarks (21 points)
  poseLandmarks?: Array<{x: number, y: number, z: number, visibility?: number}>; // Body pose landmarks
  handedness: string;
  sessionHandType?: 'LEFT' | 'RIGHT' | 'UNKNOWN';
  sessionElbowIndex?: number;
  sessionWristIndex?: number;
  sessionElbowLocked?: boolean;
  quality: number;
}
```

## Canvas Initialization and Setup

### HTML Canvas Element
```typescript
<canvas
  ref={canvasRef}
  className="w-full h-full bg-gray-900 rounded-lg"
  width={640}
  height={480}
  style={{ aspectRatio: '4/3' }}
/>
```

### Canvas Context Configuration
```typescript
const canvas = canvasRef.current;
const ctx = canvas.getContext('2d');

// Canvas dimensions
const canvasWidth = canvas.width; // 640px
const canvasHeight = canvas.height; // 480px

// Clear and prepare canvas
ctx.fillStyle = '#1f2937'; // Dark gray background
ctx.fillRect(0, 0, canvasWidth, canvasHeight);
```

## Frame Rendering Pipeline

### 1. Data Loading and Processing
```typescript
// Load motion data from API or props
const { data: motionData } = useQuery({
  queryKey: [`/api/user-assessments/${userAssessmentId}/motion-data`],
  enabled: !!userAssessmentId,
});

const replayData: ReplayData[] = motionData?.motionData || [];

// Calculate maximum wrist angles across all frames
useEffect(() => {
  if (replayData.length > 0 && isWristAssessment) {
    const wristAnglesAllFrames = replayData.map(frame => {
      if (frame.landmarks && frame.poseLandmarks) {
        return calculateElbowReferencedWristAngle(frame.landmarks, frame.poseLandmarks);
      }
      return null;
    }).filter(Boolean);
    
    if (wristAnglesAllFrames.length > 0) {
      const maxFlexion = Math.max(...wristAnglesAllFrames.map(w => w!.wristFlexionAngle));
      const maxExtension = Math.max(...wristAnglesAllFrames.map(w => w!.wristExtensionAngle));
      const maxForearmAngle = Math.max(...wristAnglesAllFrames.map(w => w!.forearmToHandAngle));
      
      setMaxWristAngles({
        forearmToHandAngle: maxForearmAngle,
        wristFlexionAngle: maxFlexion,
        wristExtensionAngle: maxExtension,
        elbowDetected: true,
        handType: wristAnglesAllFrames[0]!.handType,
        confidence: Math.max(...wristAnglesAllFrames.map(w => w!.confidence))
      });
    }
  }
}, [replayData, isWristAssessment]);
```

### 2. Frame-by-Frame Angle Calculation
```typescript
// Update current wrist angles when frame changes
useEffect(() => {
  if (replayData.length > 0 && currentFrame < replayData.length) {
    const frame = replayData[currentFrame];
    if (frame.landmarks && frame.poseLandmarks && isWristAssessment) {
      const currentWrist = calculateElbowReferencedWristAngle(
        frame.landmarks, 
        frame.poseLandmarks
      );
      setCurrentWristAngles(currentWrist);
    }
  }
}, [currentFrame, replayData, isWristAssessment]);
```

### 3. Canvas Drawing Functions

#### Background and Grid Setup
```typescript
const drawFrame = (frameIndex: number) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const frame = replayData[frameIndex];
  if (!frame) return;

  // Clear canvas with dark background
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw reference grid
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1;
  const gridSize = 40;
  
  // Vertical grid lines
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  // Horizontal grid lines
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
};
```

#### Wrist-Specific Landmark Rendering
```typescript
const drawWristLandmarks = (ctx: CanvasRenderingContext2D, landmarks: Array<{x: number, y: number, z: number}>, canvasWidth: number, canvasHeight: number) => {
  if (!landmarks || landmarks.length === 0) return;

  // For wrist assessments, focus on key landmarks
  const wristLandmarks = [0]; // Wrist center (landmark 0)
  const middleMcpLandmarks = [9]; // Middle MCP (landmark 9)
  
  // Draw wrist center
  ctx.fillStyle = '#ff6b35'; // Orange for wrist
  wristLandmarks.forEach((index) => {
    if (landmarks[index]) {
      const x = landmarks[index].x * canvasWidth;
      const y = landmarks[index].y * canvasHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI); // Larger circle for visibility
      ctx.fill();
      
      // Add wrist label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('Wrist', x + 12, y + 5);
      ctx.fillStyle = '#ff6b35';
    }
  });
  
  // Draw middle MCP (hand vector endpoint)
  ctx.fillStyle = '#00ff00'; // Green for MCP
  middleMcpLandmarks.forEach((index) => {
    if (landmarks[index]) {
      const x = landmarks[index].x * canvasWidth;
      const y = landmarks[index].y * canvasHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add MCP label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText('MCP', x + 8, y + 4);
      ctx.fillStyle = '#00ff00';
    }
  });
  
  // Draw hand vector line (wrist to middle MCP)
  if (landmarks[0] && landmarks[9]) {
    const wristX = landmarks[0].x * canvasWidth;
    const wristY = landmarks[0].y * canvasHeight;
    const mcpX = landmarks[9].x * canvasWidth;
    const mcpY = landmarks[9].y * canvasHeight;
    
    ctx.strokeStyle = '#ffff00'; // Yellow for hand vector
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]); // Dashed line
    
    ctx.beginPath();
    ctx.moveTo(wristX, wristY);
    ctx.lineTo(mcpX, mcpY);
    ctx.stroke();
    
    ctx.setLineDash([]); // Reset line dash
  }
};
```

#### Pose Landmarks Integration
```typescript
const drawPoseLandmarks = (ctx: CanvasRenderingContext2D, poseLandmarks: Array<{x: number, y: number, z: number, visibility?: number}>, canvasWidth: number, canvasHeight: number) => {
  if (!poseLandmarks || poseLandmarks.length === 0) return;

  // MediaPipe pose landmark indices
  const POSE_LANDMARKS = {
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16
  };

  // Draw elbow landmarks
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.RIGHT_ELBOW].forEach((elbowIndex) => {
    const elbow = poseLandmarks[elbowIndex];
    if (elbow && (elbow.visibility || 1) > 0.5) {
      const x = elbow.x * canvasWidth;
      const y = elbow.y * canvasHeight;
      
      ctx.fillStyle = '#ff0000'; // Red for elbows
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add elbow labels
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      const label = elbowIndex === POSE_LANDMARKS.LEFT_ELBOW ? 'L Elbow' : 'R Elbow';
      ctx.fillText(label, x + 8, y + 4);
    }
  });

  // Draw pose wrist landmarks
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.RIGHT_WRIST].forEach((wristIndex) => {
    const wrist = poseLandmarks[wristIndex];
    if (wrist && (wrist.visibility || 1) > 0.5) {
      const x = wrist.x * canvasWidth;
      const y = wrist.y * canvasHeight;
      
      ctx.fillStyle = '#0000ff'; // Blue for pose wrists
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
};
```

#### Forearm Vector Visualization
```typescript
const drawForearmVector = (ctx: CanvasRenderingContext2D, frame: ReplayData, canvasWidth: number, canvasHeight: number) => {
  if (!frame.landmarks || !frame.poseLandmarks) return;

  // Get session elbow selection (consistent throughout assessment)
  const sessionElbowIndex = frame.sessionElbowIndex || 14; // Default to right elbow
  const elbow = frame.poseLandmarks[sessionElbowIndex];
  const handWrist = frame.landmarks[0]; // Hand wrist landmark

  if (elbow && handWrist && (elbow.visibility || 1) > 0.5) {
    const elbowX = elbow.x * canvasWidth;
    const elbowY = elbow.y * canvasHeight;
    const wristX = handWrist.x * canvasWidth;
    const wristY = handWrist.y * canvasHeight;

    // Draw forearm vector (elbow to hand wrist)
    ctx.strokeStyle = '#00ffff'; // Cyan for forearm vector
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 5]); // Dashed line pattern
    
    ctx.beginPath();
    ctx.moveTo(elbowX, elbowY);
    ctx.lineTo(wristX, wristY);
    ctx.stroke();
    
    ctx.setLineDash([]); // Reset line dash
    
    // Draw vector direction arrow
    const angle = Math.atan2(wristY - elbowY, wristX - elbowX);
    const arrowLength = 15;
    const arrowAngle = Math.PI / 6;
    
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(wristX, wristY);
    ctx.lineTo(
      wristX - arrowLength * Math.cos(angle - arrowAngle),
      wristY - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.moveTo(wristX, wristY);
    ctx.lineTo(
      wristX - arrowLength * Math.cos(angle + arrowAngle),
      wristY - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.stroke();
  }
};
```

### 4. Real-time Angle Display Overlay
```typescript
const drawAngleOverlay = (ctx: CanvasRenderingContext2D, currentWristAngles: ElbowWristAngles, canvasWidth: number, canvasHeight: number) => {
  if (!currentWristAngles) return;

  // Background for angle display
  const overlayX = 10;
  const overlayY = 10;
  const overlayWidth = 200;
  const overlayHeight = 120;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);
  
  // Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);
  
  // Angle text display
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('Wrist Angles', overlayX + 10, overlayY + 25);
  
  ctx.font = '14px Arial';
  
  // Current flexion angle
  if (currentWristAngles.wristFlexionAngle > 0) {
    ctx.fillStyle = '#ff6b6b'; // Red for flexion
    ctx.fillText(`Flexion: ${currentWristAngles.wristFlexionAngle.toFixed(1)}°`, overlayX + 10, overlayY + 50);
  }
  
  // Current extension angle
  if (currentWristAngles.wristExtensionAngle > 0) {
    ctx.fillStyle = '#4ecdc4'; // Teal for extension
    ctx.fillText(`Extension: ${currentWristAngles.wristExtensionAngle.toFixed(1)}°`, overlayX + 10, overlayY + 70);
  }
  
  // Hand type and confidence
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Arial';
  ctx.fillText(`Hand: ${currentWristAngles.handType}`, overlayX + 10, overlayY + 90);
  ctx.fillText(`Confidence: ${(currentWristAngles.confidence * 100).toFixed(0)}%`, overlayX + 10, overlayY + 105);
};
```

## Playback Control System

### Animation Loop
```typescript
const playAnimation = useCallback(() => {
  if (!isPlaying || !replayData.length) return;

  const animate = () => {
    setCurrentFrame((prev) => {
      const nextFrame = prev + 1;
      if (nextFrame >= replayData.length) {
        setIsPlaying(false);
        return 0; // Reset to beginning
      }
      return nextFrame;
    });

    if (isPlaying) {
      animationRef.current = setTimeout(() => {
        requestAnimationFrame(animate);
      }, 1000 / (30 * playbackSpeed)); // 30 FPS adjusted by playback speed
    }
  };

  animationRef.current = requestAnimationFrame(animate);
}, [isPlaying, replayData.length, playbackSpeed]);

useEffect(() => {
  if (isPlaying) {
    playAnimation();
  } else if (animationRef.current) {
    cancelAnimationFrame(animationRef.current);
  }

  return () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };
}, [isPlaying, playAnimation]);
```

### Frame Scrubbing
```typescript
const handleFrameChange = (newFrame: number) => {
  setCurrentFrame(Math.max(0, Math.min(newFrame, replayData.length - 1)));
  drawFrame(newFrame);
};

// Slider for frame scrubbing
<input
  type="range"
  min={0}
  max={replayData.length - 1}
  value={currentFrame}
  onChange={(e) => handleFrameChange(parseInt(e.target.value))}
  className="w-full"
/>
```

## Complete Frame Rendering Function

### Main Drawing Pipeline
```typescript
const drawFrame = (frameIndex: number) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const frame = replayData[frameIndex];
  if (!frame) return;

  // 1. Clear and setup background
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Draw reference grid
  drawReferenceGrid(ctx, canvas.width, canvas.height);

  // 3. Draw pose landmarks (elbows, shoulders)
  if (frame.poseLandmarks) {
    drawPoseLandmarks(ctx, frame.poseLandmarks, canvas.width, canvas.height);
  }

  // 4. Draw forearm vector
  drawForearmVector(ctx, frame, canvas.width, canvas.height);

  // 5. Draw hand landmarks (wrist assessment specific)
  if (frame.landmarks) {
    drawWristLandmarks(ctx, frame.landmarks, canvas.width, canvas.height);
  }

  // 6. Draw angle overlay
  if (currentWristAngles) {
    drawAngleOverlay(ctx, currentWristAngles, canvas.width, canvas.height);
  }

  // 7. Draw frame info
  drawFrameInfo(ctx, frameIndex, frame, canvas.width, canvas.height);
};
```

### Frame Information Display
```typescript
const drawFrameInfo = (ctx: CanvasRenderingContext2D, frameIndex: number, frame: ReplayData, canvasWidth: number, canvasHeight: number) => {
  // Frame counter
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(canvasWidth - 120, canvasHeight - 40, 110, 30);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.fillText(`Frame: ${frameIndex + 1}/${replayData.length}`, canvasWidth - 115, canvasHeight - 20);
  
  // Timestamp
  const timestamp = ((frame.timestamp - replayData[0].timestamp) / 1000).toFixed(1);
  ctx.fillText(`Time: ${timestamp}s`, canvasWidth - 115, canvasHeight - 5);
};
```

## Integration with Assessment Results

### Canvas in Results Page Component
```typescript
// client/src/pages/wrist-results.tsx
<Card className="h-full">
  <CardHeader>
    <CardTitle className="text-xl">Motion Replay</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <AssessmentReplay
        assessmentName="Wrist Flexion/Extension"
        userAssessmentId={params?.userAssessmentId}
        onClose={() => {}}
      />
    </div>
    
    {/* Playback controls */}
    <div className="mt-4 flex items-center justify-center space-x-4">
      <Button
        variant="outline"
        onClick={() => setIsPlaying(!isPlaying)}
        className="flex items-center space-x-2"
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        <span>{isPlaying ? 'Pause' : 'Play'}</span>
      </Button>
      
      <Button
        variant="outline"
        onClick={() => setCurrentFrame(0)}
        className="flex items-center space-x-2"
      >
        <RotateCcw size={16} />
        <span>Reset</span>
      </Button>
      
      <select 
        value={playbackSpeed} 
        onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
        className="px-3 py-1 border rounded"
      >
        <option value={0.5}>0.5x</option>
        <option value={1}>1x</option>
        <option value={2}>2x</option>
        <option value={4}>4x</option>
      </select>
    </div>
  </CardContent>
</Card>
```

## Performance Optimizations

### Canvas Rendering Optimizations
```typescript
// Debounced frame drawing
const debouncedDrawFrame = useCallback(
  debounce((frameIndex: number) => {
    drawFrame(frameIndex);
  }, 16), // ~60 FPS limit
  [replayData]
);

// Efficient landmark coordinate transformation
const transformCoordinates = (landmark: {x: number, y: number}, canvasWidth: number, canvasHeight: number) => {
  return {
    x: landmark.x * canvasWidth,
    y: landmark.y * canvasHeight
  };
};

// Batch landmark processing
const processLandmarks = (landmarks: Array<{x: number, y: number, z: number}>, canvasWidth: number, canvasHeight: number) => {
  return landmarks.map(landmark => transformCoordinates(landmark, canvasWidth, canvasHeight));
};
```

### Memory Management
```typescript
// Cleanup animation frames
useEffect(() => {
  return () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };
}, []);

// Canvas context reuse
const getCanvasContext = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas) return null;
  return canvas.getContext('2d');
}, []);
```

## Testing and Validation

### Canvas Rendering Tests
```typescript
// Test frame drawing
const testFrameDrawing = (testFrame: ReplayData) => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  
  // Verify landmarks are within canvas bounds
  testFrame.landmarks.forEach((landmark, index) => {
    const x = landmark.x * canvas.width;
    const y = landmark.y * canvas.height;
    
    console.assert(x >= 0 && x <= canvas.width, `Landmark ${index} X out of bounds: ${x}`);
    console.assert(y >= 0 && y <= canvas.height, `Landmark ${index} Y out of bounds: ${y}`);
  });
};

// Test angle calculation accuracy
const validateAngleCalculation = (frame: ReplayData) => {
  if (frame.landmarks && frame.poseLandmarks) {
    const angles = calculateElbowReferencedWristAngle(frame.landmarks, frame.poseLandmarks);
    
    // Validate angle ranges
    console.assert(angles.wristFlexionAngle >= 0 && angles.wristFlexionAngle <= 180, 
      `Invalid flexion angle: ${angles.wristFlexionAngle}`);
    console.assert(angles.wristExtensionAngle >= 0 && angles.wristExtensionAngle <= 180, 
      `Invalid extension angle: ${angles.wristExtensionAngle}`);
  }
};
```

## Key Features Summary

1. **Real-time Angle Visualization**: Live angle calculations displayed as landmarks move
2. **Session-Locked Handedness**: Consistent left/right elbow mapping throughout replay
3. **Vector Visualization**: Clear forearm and hand vector representations
4. **Smooth Playback Controls**: Variable speed playback with frame scrubbing
5. **Clinical Data Overlay**: Real-time angle measurements and confidence scores
6. **Anatomical Accuracy**: Proper landmark positioning and biomechanical calculations
7. **Performance Optimized**: Efficient canvas rendering at 30-60 FPS

This documentation provides complete technical specifications for implementing a wrist flexion/extension motion replay canvas system with clinical-grade accuracy and professional visualization capabilities.