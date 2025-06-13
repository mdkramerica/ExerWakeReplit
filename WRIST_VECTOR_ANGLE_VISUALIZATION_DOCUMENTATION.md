# Wrist Flexion/Extension Vector Analysis and Canvas Visualization

## Overview
This document details the precise vector calculations, angle measurements, and visual rendering techniques used in the wrist flexion/extension motion replay canvas system.

## Vector Mathematics Foundation

### Core Vector System
The wrist angle calculation uses a two-vector system to measure the deviation of hand position from the forearm baseline:

```typescript
// Vector 1: Forearm Vector (Reference Baseline)
// From pose elbow landmark TO hand wrist landmark (landmark 0)
const forearmVector = {
  x: handWrist.x - poseElbow.x,
  y: handWrist.y - poseElbow.y,
  z: handWrist.z - poseElbow.z
};

// Vector 2: Hand Vector (Movement Measurement)
// From hand wrist landmark TO middle MCP landmark (landmark 9)  
const handVector = {
  x: middleMcp.x - handWrist.x,
  y: middleMcp.y - handWrist.y,
  z: middleMcp.z - handWrist.z
};
```

### Deflection Angle Calculation
The system calculates the deflection from neutral position using dot product methodology:

```typescript
// Calculate vector magnitudes
const forearmLength = Math.sqrt(
  forearmVector.x * forearmVector.x + 
  forearmVector.y * forearmVector.y + 
  forearmVector.z * forearmVector.z
);

const handLength = Math.sqrt(
  handVector.x * handVector.x + 
  handVector.y * handVector.y + 
  handVector.z * handVector.z
);

// Dot product for angle between vectors
const dotProduct = forearmVector.x * handVector.x + 
                  forearmVector.y * handVector.y + 
                  forearmVector.z * handVector.z;

// Calculate cosine of angle
const cosAngle = dotProduct / (forearmLength * handLength);
const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));

// Convert to deflection angle (180° = neutral, deviation = bend)
const vectorAngleRadians = Math.acos(clampedCosAngle);
const vectorAngleDegrees = vectorAngleRadians * (180 / Math.PI);
const deflectionAngle = 180 - vectorAngleDegrees;
```

## Flexion vs Extension Determination

### Cross Product Directional Analysis
Direction classification uses 3D cross product to determine flexion versus extension:

```typescript
// Calculate cross product of forearm and hand vectors
const crossProduct = {
  x: forearmVector.y * handVector.z - forearmVector.z * handVector.y,
  y: forearmVector.z * handVector.x - forearmVector.x * handVector.z,
  z: forearmVector.x * handVector.y - forearmVector.y * handVector.x
};

// Use Y component to determine direction relative to forearm baseline
// Positive Y = hand above forearm (extension)
// Negative Y = hand below forearm (flexion)
const isExtension = crossProduct.y > 0;

// Assign angles based on direction
if (isExtension) {
  result.wristExtensionAngle = deflectionAngle;
  result.wristFlexionAngle = 0;
} else {
  result.wristFlexionAngle = deflectionAngle;
  result.wristExtensionAngle = 0;
}
```

## Canvas Visualization Implementation

### Landmark Coordinate Transformation
MediaPipe landmarks are normalized [0,1] coordinates converted to canvas pixels:

```typescript
// Transform normalized coordinates to canvas pixels
const transformLandmark = (landmark: {x: number, y: number}, canvas: HTMLCanvasElement) => {
  return {
    x: landmark.x * canvas.width,   // Scale to canvas width
    y: landmark.y * canvas.height   // Scale to canvas height
  };
};

// Key landmarks for wrist analysis
const handWrist = frame.landmarks[0];      // Wrist center
const middleMcp = frame.landmarks[9];      // Middle finger MCP
const poseElbow = frame.poseLandmarks[sessionElbowIndex]; // Session-locked elbow
```

### Vector Line Rendering

#### 1. Forearm Vector Visualization
```typescript
// Draw solid forearm vector (elbow to wrist)
const drawForearmVector = (ctx: CanvasRenderingContext2D) => {
  const elbowX = poseElbow.x * canvas.width;
  const elbowY = poseElbow.y * canvas.height;
  const wristX = handWrist.x * canvas.width;
  const wristY = handWrist.y * canvas.height;
  
  // Solid blue line for actual forearm
  ctx.strokeStyle = '#3b82f6'; // Blue
  ctx.lineWidth = 4;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(elbowX, elbowY);
  ctx.lineTo(wristX, wristY);
  ctx.stroke();
};
```

#### 2. Hand Vector Visualization
```typescript
// Draw solid hand vector (wrist to middle MCP)
const drawHandVector = (ctx: CanvasRenderingContext2D) => {
  const wristX = handWrist.x * canvas.width;
  const wristY = handWrist.y * canvas.height;
  const mcpX = middleMcp.x * canvas.width;
  const mcpY = middleMcp.y * canvas.height;
  
  // Solid orange line for hand vector
  ctx.strokeStyle = '#f59e0b'; // Orange
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(wristX, wristY);
  ctx.lineTo(mcpX, mcpY);
  ctx.stroke();
};
```

#### 3. Infinite Reference Vector Lines
```typescript
// Draw infinite dashed reference lines for vector visualization
const drawInfiniteVectors = (ctx: CanvasRenderingContext2D) => {
  // 1. Infinite forearm reference line
  const forearmVector = {
    x: wristX - elbowX,
    y: wristY - elbowY
  };
  const forearmLength = Math.sqrt(forearmVector.x**2 + forearmVector.y**2);
  
  if (forearmLength > 0) {
    const normalizedForearm = {
      x: forearmVector.x / forearmLength,
      y: forearmVector.y / forearmLength
    };
    
    // Extend line across entire canvas
    const extensionLength = Math.max(canvas.width, canvas.height) * 2;
    const startX = elbowX - normalizedForearm.x * extensionLength;
    const startY = elbowY - normalizedForearm.y * extensionLength;
    const endX = elbowX + normalizedForearm.x * extensionLength;
    const endY = elbowY + normalizedForearm.y * extensionLength;
    
    ctx.strokeStyle = '#fbbf24'; // Yellow
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]); // Dashed pattern
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
  
  // 2. Infinite hand reference line
  const handVector = {
    x: mcpX - wristX,
    y: mcpY - wristY
  };
  const handVectorLength = Math.sqrt(handVector.x**2 + handVector.y**2);
  
  if (handVectorLength > 0) {
    const normalizedHand = {
      x: handVector.x / handVectorLength,
      y: handVector.y / handVectorLength
    };
    
    const extensionLength = Math.max(canvas.width, canvas.height) * 2;
    const startX = wristX - normalizedHand.x * extensionLength;
    const startY = wristY - normalizedHand.y * extensionLength;
    const endX = wristX + normalizedHand.x * extensionLength;
    const endY = wristY + normalizedHand.y * extensionLength;
    
    ctx.strokeStyle = '#fbbf24'; // Yellow
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]); // Different dash pattern
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
  
  ctx.setLineDash([]); // Reset dash pattern
};
```

### Anatomical Landmark Highlighting

#### Key Joint Visualization
```typescript
const drawAnatomicalLandmarks = (ctx: CanvasRenderingContext2D) => {
  // Elbow landmark (blue, large circle)
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.arc(elbowX, elbowY, 10, 0, 2 * Math.PI);
  ctx.fill();
  
  // Elbow label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('ELBOW', elbowX - 25, elbowY - 15);
  
  // Wrist landmark (red, medium circle)
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(wristX, wristY, 8, 0, 2 * Math.PI);
  ctx.fill();
  
  // Wrist label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('WRIST', wristX - 20, wristY - 15);
  
  // Middle MCP landmark (green, medium circle)
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(mcpX, mcpY, 6, 0, 2 * Math.PI);
  ctx.fill();
  
  // MCP label
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px Arial';
  ctx.fillText('MCP', mcpX + 8, mcpY + 4);
};
```

### Angle Arc Visualization

#### Angular Measurement Display
```typescript
const drawAngleArc = (ctx: CanvasRenderingContext2D, currentWristAngles: ElbowWristAngles) => {
  if (currentWristAngles.wristFlexionAngle > 0 || currentWristAngles.wristExtensionAngle > 0) {
    // Calculate angle vectors for arc display
    const elbowToWristVector = { x: wristX - elbowX, y: wristY - elbowY };
    const wristToMcpVector = { x: mcpX - wristX, y: mcpY - wristY };
    
    // Calculate angles in radians
    const forearmAngle = Math.atan2(elbowToWristVector.y, elbowToWristVector.x);
    const handAngle = Math.atan2(wristToMcpVector.y, wristToMcpVector.x);
    
    // Arc radius and positioning
    const arcRadius = 50;
    let startAngle = forearmAngle;
    let endAngle = handAngle;
    
    // Normalize angle difference for proper arc direction
    if (Math.abs(endAngle - startAngle) > Math.PI) {
      if (endAngle > startAngle) {
        endAngle -= 2 * Math.PI;
      } else {
        endAngle += 2 * Math.PI;
      }
    }
    
    // Draw angle arc
    ctx.beginPath();
    ctx.arc(wristX, wristY, arcRadius, startAngle, endAngle, false);
    ctx.strokeStyle = currentWristAngles.wristFlexionAngle > 0 ? '#3b82f6' : '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw angle measurement text
    const midAngle = (startAngle + endAngle) / 2;
    const textRadius = arcRadius + 15;
    const textX = wristX + Math.cos(midAngle) * textRadius;
    const textY = wristY + Math.sin(midAngle) * textRadius;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    const angleValue = currentWristAngles.wristFlexionAngle > 0 ? 
      currentWristAngles.wristFlexionAngle : currentWristAngles.wristExtensionAngle;
    ctx.fillText(`${angleValue.toFixed(1)}°`, textX, textY);
  }
};
```

## Real-time Angle Information Overlay

### Data Display Panel
```typescript
const drawWristAngleOverlay = (ctx: CanvasRenderingContext2D, currentWristAngles: ElbowWristAngles, maxWristAngles: ElbowWristAngles) => {
  const overlayX = 20;
  const overlayY = canvas.height - 200;
  const overlayWidth = 260;
  const overlayHeight = 180;
  
  // Semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);
  
  // Blue border
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);
  
  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('Wrist Angle Analysis', overlayX + 10, overlayY + 20);
  
  // Raw deflection angle
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`Raw Angle: ${currentWristAngles.forearmToHandAngle.toFixed(1)}°`, overlayX + 10, overlayY + 45);
  
  // Current flexion angle (blue when active)
  ctx.fillStyle = currentWristAngles.wristFlexionAngle > 0 ? '#3b82f6' : '#6b7280';
  ctx.font = '12px Arial';
  ctx.fillText(`Flexion: ${currentWristAngles.wristFlexionAngle.toFixed(1)}°`, overlayX + 10, overlayY + 70);
  
  // Current extension angle (orange when active)
  ctx.fillStyle = currentWristAngles.wristExtensionAngle > 0 ? '#f59e0b' : '#6b7280';
  ctx.fillText(`Extension: ${currentWristAngles.wristExtensionAngle.toFixed(1)}°`, overlayX + 130, overlayY + 70);
  
  // Session metadata
  ctx.fillStyle = '#9ca3af';
  ctx.font = '11px Arial';
  ctx.fillText(`Hand: ${currentWristAngles.handType}`, overlayX + 10, overlayY + 95);
  ctx.fillText(`Confidence: ${(currentWristAngles.confidence * 100).toFixed(1)}%`, overlayX + 10, overlayY + 110);
  
  // Maximum values from session
  if (maxWristAngles) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px Arial';
    ctx.fillText('Session Maximum:', overlayX + 10, overlayY + 135);
    
    ctx.fillStyle = '#3b82f6';
    ctx.font = '10px Arial';
    ctx.fillText(`Max Flexion: ${maxWristAngles.wristFlexionAngle.toFixed(1)}°`, overlayX + 10, overlayY + 150);
    
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`Max Extension: ${maxWristAngles.wristExtensionAngle.toFixed(1)}°`, overlayX + 10, overlayY + 165);
  }
};
```

## Session-Locked Elbow Selection

### Consistent Anatomical Mapping
```typescript
// Ensure replay uses identical elbow selection as calculation
const getSessionElbowIndex = (frame: ReplayData, currentWristAngles: ElbowWristAngles) => {
  // Priority 1: Use stored session data from recording
  if (frame.sessionElbowLocked && frame.sessionElbowIndex !== undefined) {
    return {
      elbowIndex: frame.sessionElbowIndex,
      wristIndex: frame.sessionWristIndex || (frame.sessionElbowIndex === 13 ? 15 : 16)
    };
  }
  
  // Priority 2: Direct anatomical mapping
  const sessionHandType = currentWristAngles?.handType || frame.sessionHandType || frame.handedness;
  const useRightElbow = sessionHandType === 'RIGHT';
  
  return {
    elbowIndex: useRightElbow ? 14 : 13, // RIGHT elbow (14) or LEFT elbow (13)
    wristIndex: useRightElbow ? 16 : 15  // RIGHT wrist (16) or LEFT wrist (15)
  };
};
```

## Frame-by-Frame Animation System

### Playback Control Integration
```typescript
// Main frame drawing function called during animation
const drawFrame = (frameIndex: number) => {
  const frame = replayData[frameIndex];
  if (!frame) return;
  
  // 1. Clear canvas and draw background
  clearCanvasWithBackground(ctx, canvas);
  
  // 2. Calculate current frame angles
  if (frame.landmarks && frame.poseLandmarks) {
    const currentAngles = calculateElbowReferencedWristAngle(
      frame.landmarks, 
      frame.poseLandmarks
    );
    setCurrentWristAngles(currentAngles);
    
    // 3. Draw vector visualization
    drawInfiniteVectors(ctx);
    drawForearmVector(ctx);
    drawHandVector(ctx);
    
    // 4. Draw anatomical landmarks
    drawAnatomicalLandmarks(ctx);
    
    // 5. Draw angle measurements
    drawAngleArc(ctx, currentAngles);
    drawWristAngleOverlay(ctx, currentAngles, maxWristAngles);
  }
  
  // 6. Draw frame information
  drawFrameInfo(ctx, frameIndex, frame);
};

// Animation loop with variable speed
const playAnimation = () => {
  const animate = () => {
    setCurrentFrame(prev => {
      const nextFrame = prev + 1;
      if (nextFrame >= replayData.length) {
        setIsPlaying(false);
        return 0;
      }
      return nextFrame;
    });

    if (isPlaying) {
      setTimeout(() => requestAnimationFrame(animate), 1000 / (30 * playbackSpeed));
    }
  };
  requestAnimationFrame(animate);
};
```

## Color Coding System

### Visual Distinction Scheme
```typescript
const WRIST_COLORS = {
  // Vector colors
  FOREARM_VECTOR: '#3b82f6',    // Blue - solid forearm line
  HAND_VECTOR: '#f59e0b',       // Orange - solid hand line
  REFERENCE_LINES: '#fbbf24',   // Yellow - dashed infinite lines
  
  // Landmark colors
  ELBOW: '#3b82f6',             // Blue - elbow joint
  WRIST: '#ef4444',             // Red - wrist center
  MCP: '#10b981',               // Green - middle MCP
  
  // Angle indicators
  FLEXION: '#3b82f6',           // Blue - flexion angles
  EXTENSION: '#f59e0b',         // Orange - extension angles
  NEUTRAL: '#6b7280',           // Gray - inactive values
  
  // UI elements
  OVERLAY_BG: 'rgba(0, 0, 0, 0.8)',     // Semi-transparent black
  OVERLAY_BORDER: '#3b82f6',             // Blue border
  TEXT_PRIMARY: '#ffffff',               // White text
  TEXT_SECONDARY: '#9ca3af'              // Gray secondary text
};
```

## Performance Optimization

### Efficient Rendering Techniques
```typescript
// Minimize canvas operations per frame
const optimizedDrawFrame = (frameIndex: number) => {
  // Batch coordinate transformations
  const coordinates = transformLandmarksToCanvas(frame.landmarks, canvas);
  const poseCoordinates = transformLandmarksToCanvas(frame.poseLandmarks, canvas);
  
  // Single context state changes
  ctx.save();
  
  // Draw all solid lines first
  ctx.setLineDash([]);
  drawSolidVectors(ctx, coordinates, poseCoordinates);
  
  // Draw all dashed lines second
  ctx.setLineDash([8, 4]);
  drawDashedVectors(ctx, coordinates, poseCoordinates);
  
  // Draw all filled shapes last
  ctx.setLineDash([]);
  drawLandmarkCircles(ctx, coordinates, poseCoordinates);
  
  ctx.restore();
};

// Debounced updates for smooth playback
const debouncedAngleUpdate = debounce((angles) => {
  setCurrentWristAngles(angles);
}, 16); // ~60 FPS limit
```

## Clinical Validation Integration

### Accuracy Verification Display
```typescript
// Show calculation confidence and validation metrics
const drawValidationMetrics = (ctx: CanvasRenderingContext2D, angles: ElbowWristAngles) => {
  const metricsY = 100;
  
  // Confidence indicator
  const confidenceColor = angles.confidence > 0.9 ? '#10b981' : 
                         angles.confidence > 0.7 ? '#f59e0b' : '#ef4444';
  
  ctx.fillStyle = confidenceColor;
  ctx.font = '12px Arial';
  ctx.fillText(`Tracking Quality: ${(angles.confidence * 100).toFixed(0)}%`, 10, metricsY);
  
  // Elbow detection status
  ctx.fillStyle = angles.elbowDetected ? '#10b981' : '#ef4444';
  ctx.fillText(`Elbow: ${angles.elbowDetected ? 'Detected' : 'Not Found'}`, 10, metricsY + 20);
  
  // Hand type consistency
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Side: ${angles.handType}`, 10, metricsY + 40);
};
```

This comprehensive vector and visualization system provides clinically accurate wrist flexion/extension measurements with intuitive visual feedback, maintaining precision throughout the motion replay process while clearly displaying the underlying biomechanical calculations.