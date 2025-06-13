# Kapandji Score Assessment Canvas, Scoring & Controls - Complete Recreation Guide

## Overview
This document provides complete specifications for recreating the Kapandji Score assessment system, including the dark canvas with hand landmark visualization, real-time scoring overlay, timeline controls, and playback interface.

## 1. Canvas Implementation

### Canvas Setup and Configuration
```tsx
// Canvas component with dark background and grid
<canvas
  ref={canvasRef}
  width={640}
  height={480}
  className="w-full border-2 border-gray-300 rounded-lg bg-gray-900"
  onMouseDown={handleCanvasMouseDown}
  onMouseMove={handleCanvasMouseMove}
  onMouseUp={handleCanvasMouseUp}
/>
```

### Canvas Drawing Foundation
```tsx
const drawFrame = (frameIndex: number) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const frame = replayData[frameIndex];
  if (!frame) return;

  // Clear canvas with dark background
  ctx.fillStyle = '#1f2937'; // Dark gray-800
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw grid pattern
  drawGrid(ctx, canvas.width, canvas.height);

  // Draw hand landmarks if available
  if (frame.landmarks && frame.landmarks.length >= 21) {
    drawHandLandmarks(ctx, frame.landmarks, canvas.width, canvas.height);
    
    // Draw Kapandji scoring overlay
    if (isKapandjiAssessment) {
      const currentKapandji = calculateKapandjiScore(frame.landmarks);
      drawKapandjiOverlay(ctx, canvas, currentKapandji);
    }
  }

  // Draw frame information overlay
  drawFrameInfo(ctx, canvas, frameIndex);
  
  // Draw timeline scrubber
  drawTimeline(ctx, canvas, frameIndex);
  
  // Draw branding
  drawBranding(ctx, canvas);
};
```

### Grid Pattern Drawing
```tsx
const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.strokeStyle = '#374151'; // Gray-700, subtle grid lines
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;

  const gridSize = 40;

  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.globalAlpha = 1.0; // Reset alpha
};
```

## 2. Hand Landmark Visualization

### MediaPipe Hand Landmark Drawing
```tsx
const drawHandLandmarks = (
  ctx: CanvasRenderingContext2D, 
  landmarks: Array<{x: number, y: number, z: number}>, 
  canvasWidth: number, 
  canvasHeight: number
) => {
  if (!landmarks || landmarks.length === 0) return;

  // Define all hand connections (MediaPipe standard 21-point model)
  const connections = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index finger
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle finger
    [0, 9], [9, 10], [10, 11], [11, 12],
    // Ring finger
    [0, 13], [13, 14], [14, 15], [15, 16],
    // Pinky
    [0, 17], [17, 18], [18, 19], [19, 20],
    // Palm connections
    [5, 9], [9, 13], [13, 17]
  ];

  // Draw hand connections with yellow lines
  ctx.strokeStyle = '#ffeb3b'; // Yellow
  ctx.lineWidth = 2;
  connections.forEach(([start, end]) => {
    if (landmarks[start] && landmarks[end]) {
      const startX = (1 - landmarks[start].x) * canvasWidth; // Mirror X for display
      const startY = landmarks[start].y * canvasHeight;
      const endX = (1 - landmarks[end].x) * canvasWidth;
      const endY = landmarks[end].y * canvasHeight;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  });

  // Draw landmarks with color coding
  for (let index = 0; index < landmarks.length && index < 21; index++) {
    const landmark = landmarks[index];
    if (!landmark) continue;
    
    const x = (1 - landmark.x) * canvasWidth; // Mirror X coordinate
    const y = landmark.y * canvasHeight;

    // Color coding for different landmark types
    if (index === 4) {
      // Thumb tip - special highlighting for Kapandji
      ctx.fillStyle = '#ff6b35'; // Orange
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
    } else if (index === 0) {
      // Wrist center
      ctx.fillStyle = '#f44336'; // Red
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
    } else if ([8, 12, 16, 20].includes(index)) {
      // Fingertips
      ctx.fillStyle = '#4caf50'; // Green
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      // Other landmarks
      ctx.fillStyle = '#4caf50'; // Green
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
};
```

## 3. Kapandji Scoring System

### Core Scoring Logic
```tsx
// Import the Kapandji calculator
import { calculateKapandjiScore, KapandjiScore } from '@/shared/kapandji-calculator';

// Scoring thresholds and targets
const KAPANDJI_TARGETS = [
  { level: 1, name: 'Index Proximal', key: 'indexProximalPhalanx' },
  { level: 2, name: 'Index Middle', key: 'indexMiddlePhalanx' },
  { level: 3, name: 'Index Tip', key: 'indexTip' },
  { level: 4, name: 'Middle Tip', key: 'middleTip' },
  { level: 5, name: 'Ring Tip', key: 'ringTip' },
  { level: 6, name: 'Little Tip', key: 'littleTip' },
  { level: 7, name: 'Little DIP', key: 'littleDipCrease' },
  { level: 8, name: 'Little PIP', key: 'littlePipCrease' },
  { level: 9, name: 'Little MCP', key: 'littleMcpCrease' },
  { level: 10, name: 'Distal Crease', key: 'distalPalmarCrease' }
];
```

### Real-time Score Calculation
```tsx
// Update Kapandji score when frame changes
useEffect(() => {
  if (replayData.length > 0 && currentFrame < replayData.length) {
    const frame = replayData[currentFrame];
    if (frame.landmarks && frame.landmarks.length >= 21 && isKapandjiAssessment) {
      const currentKapandji = calculateKapandjiScore(frame.landmarks);
      setKapandjiScore(currentKapandji);
    }
  }
}, [currentFrame, replayData, isKapandjiAssessment]);

// Calculate session maximum
useEffect(() => {
  if (replayData.length > 0 && isKapandjiAssessment) {
    const formattedFrames = replayData.map(frame => ({
      landmarks: frame.landmarks || []
    })).filter(frame => frame.landmarks.length >= 21);
    
    if (formattedFrames.length > 0) {
      const maxKapandji = calculateMaxKapandjiScore(formattedFrames);
      setMaxKapandjiScore(maxKapandji);
    }
  }
}, [replayData, isKapandjiAssessment]);
```

## 4. Scoring Overlay Display

### Kapandji Score Overlay Drawing
```tsx
const drawKapandjiOverlay = (
  ctx: CanvasRenderingContext2D, 
  canvas: HTMLCanvasElement, 
  kapandjiScore: KapandjiScore
) => {
  const scoreBoxWidth = 250;
  const scoreBoxHeight = 180;
  const scoreBoxX = canvas.width - scoreBoxWidth - 10;
  const scoreBoxY = canvas.height - scoreBoxHeight - 60; // Above timeline
  
  // Semi-transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(scoreBoxX, scoreBoxY, scoreBoxWidth, scoreBoxHeight);
  
  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('Kapandji Opposition Levels', scoreBoxX + 10, scoreBoxY + 20);
  
  // Current score with color coding
  const scoreColor = kapandjiScore.maxScore >= 8 ? '#10b981' : '#ef4444'; // Green or red
  ctx.fillStyle = scoreColor;
  ctx.font = 'bold 18px Arial';
  ctx.fillText(`Current Score: ${kapandjiScore.maxScore}/10`, scoreBoxX + 10, scoreBoxY + 45);
  
  // Individual level indicators
  ctx.font = '11px Arial';
  const startY = scoreBoxY + 65;
  
  KAPANDJI_TARGETS.forEach((target, index) => {
    const yPos = startY + (index * 12);
    const achieved = (kapandjiScore.details as any)[target.key];
    
    // Level number
    ctx.fillStyle = achieved ? '#10b981' : '#6b7280'; // Green if achieved, gray if not
    ctx.fillText(`${target.level}.`, scoreBoxX + 10, yPos);
    
    // Level name
    ctx.fillStyle = achieved ? '#ffffff' : '#9ca3af';
    ctx.fillText(target.name, scoreBoxX + 25, yPos);
    
    // Achievement indicator
    if (achieved) {
      ctx.fillStyle = '#10b981';
      ctx.fillText('✓', scoreBoxX + 220, yPos);
    }
  });
};
```

## 5. Frame Information Display

### Top-Left Information Overlay
```tsx
const drawFrameInfo = (
  ctx: CanvasRenderingContext2D, 
  canvas: HTMLCanvasElement, 
  frameIndex: number
) => {
  const frame = replayData[frameIndex];
  if (!frame) return;

  // Semi-transparent background for readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(10, 10, 200, 80);

  // Frame information
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(`Frame: ${frameIndex + 1}/${replayData.length}`, 20, 30);
  
  // Quality percentage
  const quality = Math.round((frame.quality || 0) * 100);
  ctx.fillText(`Quality: ${quality}%`, 20, 50);
  
  // Hand detection status
  const handStatus = frame.landmarks && frame.landmarks.length >= 21 ? 'DETECTED' : 'UNKNOWN';
  ctx.fillText(`Hand: ${handStatus}`, 20, 70);
};
```

## 6. Control Icons Display

### Navigation Control Icons (Top-Right)
```tsx
const drawControlIcons = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
  const iconSize = 20;
  const iconSpacing = 25;
  const startX = canvas.width - 120;
  const startY = 15;

  // Background for icons
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillRect(startX - 5, startY - 5, 110, 30);

  // Draw control icons (simplified representations)
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 16px Arial';
  
  // Expand/Contract icons
  ctx.fillText('⟷', startX, startY + 15);
  ctx.fillText('✕', startX + iconSpacing, startY + 15);
  ctx.fillText('⟵', startX + iconSpacing * 2, startY + 15);
  ctx.fillText('⟶', startX + iconSpacing * 3, startY + 15);
};
```

## 7. Timeline Implementation

### Bottom Timeline Scrubber
```tsx
const drawTimeline = (
  ctx: CanvasRenderingContext2D, 
  canvas: HTMLCanvasElement, 
  currentFrame: number
) => {
  const timelineHeight = 30;
  const timelineY = canvas.height - timelineHeight;
  const timelineMargin = 40;
  const timelineWidth = canvas.width - (timelineMargin * 2);

  // Timeline background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, timelineY, canvas.width, timelineHeight);

  // Timeline track
  ctx.fillStyle = '#4b5563'; // Gray-600
  ctx.fillRect(timelineMargin, timelineY + 10, timelineWidth, 10);

  // Progress bar
  const progress = replayData.length > 0 ? currentFrame / (replayData.length - 1) : 0;
  ctx.fillStyle = '#3b82f6'; // Blue-500
  ctx.fillRect(timelineMargin, timelineY + 10, timelineWidth * progress, 10);

  // Current position indicator
  const indicatorX = timelineMargin + (timelineWidth * progress);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(indicatorX, timelineY + 15, 6, 0, 2 * Math.PI);
  ctx.fill();

  // Frame counter
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Arial';
  ctx.fillText(`${currentFrame + 1}/${replayData.length}`, 10, timelineY + 18);

  // Duration
  const currentTime = (currentFrame / 30).toFixed(1);
  const totalTime = (replayData.length / 30).toFixed(1);
  ctx.fillText(`${currentTime}s`, canvas.width - 100, timelineY + 18);
};
```

### Timeline Interaction Handlers
```tsx
const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current;
  if (!canvas || replayData.length === 0) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  // Timeline dimensions
  const timelineHeight = 30;
  const timelineY = canvas.height - timelineHeight;
  const timelineMargin = 40;
  const timelineWidth = canvas.width - (timelineMargin * 2);

  // Check if click is within timeline area
  if (y >= timelineY && y <= timelineY + timelineHeight && 
      x >= timelineMargin && x <= timelineMargin + timelineWidth) {
    
    setIsDragging(true);
    setIsPlaying(false);
    
    // Calculate new frame position
    const clickPosition = (x - timelineMargin) / timelineWidth;
    const newFrame = Math.max(0, Math.min(replayData.length - 1, 
      Math.floor(clickPosition * (replayData.length - 1))));
    setCurrentFrame(newFrame);
  }
};
```

## 8. Control Panel Implementation

### Main Control Button Layout
```tsx
<div className="bg-white border border-gray-300 p-4 rounded-lg space-y-4">
  <div className="flex flex-wrap items-center gap-3">
    {/* Play/Pause Button */}
    <Button
      onClick={handlePlay}
      className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-md"
    >
      {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
      {isPlaying ? 'Pause' : 'Play'}
    </Button>
    
    {/* Navigation Controls - Not applicable for Kapandji */}
    <Button
      onClick={() => {/* Jump to max score frame */}}
      className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-md"
      disabled // Kapandji doesn't use TAM navigation
    >
      Max TAM
    </Button>
    
    <Button
      onClick={() => {/* Jump to min score frame */}}
      className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium px-3 py-2 rounded-md"
      disabled // Kapandji doesn't use TAM navigation
    >
      Min TAM
    </Button>
    
    {/* Reset Button */}
    <Button
      onClick={handleReset}
      className="bg-gray-600 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-md"
    >
      <RotateCcw className="w-4 h-4 mr-2" />
      Reset
    </Button>

    {/* Export Button */}
    <Button
      onClick={handleDownload}
      className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-md"
    >
      <Download className="w-4 h-4 mr-2" />
      Export Data
    </Button>
  </div>

  {/* Settings Row */}
  <div className="flex flex-wrap items-center gap-4">
    {/* Digit Selection */}
    <div className="flex items-center gap-2">
      <label className="text-sm font-semibold text-gray-900">Digit:</label>
      <select
        value="INDEX" // Default for Kapandji
        onChange={() => {/* Kapandji focuses on thumb, digit selection less relevant */}}
        className="border-2 border-gray-300 rounded-md px-3 py-2 bg-white font-medium text-gray-900"
      >
        <option value="INDEX">Index Finger</option>
        <option value="MIDDLE">Middle Finger</option>
        <option value="RING">Ring Finger</option>
        <option value="PINKY">Pinky Finger</option>
      </select>
    </div>
    
    {/* Isolate Mode Toggle */}
    <button
      onClick={() => setIsolateMode(!isolateMode)}
      className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
        isolateMode 
          ? 'bg-blue-600 text-white border-2 border-blue-600' 
          : 'bg-white text-gray-900 border-2 border-gray-300 hover:border-blue-500'
      }`}
    >
      {isolateMode ? 'Show All' : 'Isolate Finger'}
    </button>
    
    {/* Speed Control */}
    <div className="flex items-center gap-2">
      <label className="text-sm font-semibold text-gray-900">Speed:</label>
      <select
        value={playbackSpeed}
        onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
        className="border-2 border-gray-300 rounded-md px-3 py-2 bg-white font-medium text-gray-900"
      >
        <option value={0.5}>0.5x</option>
        <option value={1}>1x</option>
        <option value={1.5}>1.5x</option>
        <option value={2}>2x</option>
      </select>
    </div>
  </div>
</div>
```

## 9. State Management

### Component State Variables
```tsx
// Kapandji-specific state
const [kapandjiScore, setKapandjiScore] = useState<KapandjiScore | null>(null);
const [maxKapandjiScore, setMaxKapandjiScore] = useState<KapandjiScore | null>(null);

// General playback state
const [isPlaying, setIsPlaying] = useState(false);
const [currentFrame, setCurrentFrame] = useState(0);
const [playbackSpeed, setPlaybackSpeed] = useState(1);

// UI interaction state
const [isDragging, setIsDragging] = useState(false);
const [isolateMode, setIsolateMode] = useState(false);

// Assessment type detection
const isKapandjiAssessment = assessmentName?.toLowerCase().includes('kapandji');
```

### Animation System
```tsx
const playAnimation = useCallback(() => {
  if (!isPlaying) return;

  setCurrentFrame(prev => {
    const next = prev + playbackSpeed;
    if (next >= replayData.length) {
      return 0; // Loop back to start
    }
    return Math.floor(next);
  });
}, [isPlaying, playbackSpeed, replayData.length]);

useEffect(() => {
  let intervalId: NodeJS.Timeout | null = null;

  if (isPlaying) {
    intervalId = setInterval(playAnimation, 33); // ~30 FPS
  }

  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}, [isPlaying, playAnimation]);
```

## 10. Export Functionality

### Kapandji Data Export
```tsx
const handleDownload = () => {
  if (!maxKapandjiScore) return;

  const kapandjiExportData = {
    assessment: 'Kapandji Score',
    timestamp: new Date().toISOString(),
    duration: replayData.length / 30,
    frames: replayData.length,
    results: {
      maxScore: maxKapandjiScore.maxScore,
      reachedLandmarks: maxKapandjiScore.reachedLandmarks,
      levelDetails: maxKapandjiScore.details
    },
    clinicalInterpretation: {
      normal: maxKapandjiScore.maxScore >= 8,
      impairment: maxKapandjiScore.maxScore < 6 ? 'Severe' : 
                  maxKapandjiScore.maxScore < 8 ? 'Moderate' : 'None'
    },
    motionData: replayData
  };
  
  const blob = new Blob([JSON.stringify(kapandjiExportData, null, 2)], 
    { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Kapandji_Score_Assessment_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

## 11. Color Scheme

### Kapandji-Specific Color Palette
```tsx
const KAPANDJI_COLORS = {
  // Canvas background
  CANVAS_BG: '#1f2937', // Dark gray-800
  GRID_LINES: '#374151', // Gray-700
  
  // Hand landmarks
  THUMB_TIP: '#ff6b35', // Orange - primary focus
  WRIST_CENTER: '#f44336', // Red
  FINGERTIPS: '#4caf50', // Green
  HAND_CONNECTIONS: '#ffeb3b', // Yellow
  OTHER_LANDMARKS: '#4caf50', // Green
  
  // Scoring overlay
  SCORE_BG: 'rgba(0, 0, 0, 0.8)',
  SCORE_TEXT: '#ffffff',
  ACHIEVED_LEVEL: '#10b981', // Green
  PENDING_LEVEL: '#6b7280', // Gray
  
  // Timeline
  TIMELINE_BG: 'rgba(0, 0, 0, 0.8)',
  TIMELINE_TRACK: '#4b5563', // Gray-600
  TIMELINE_PROGRESS: '#3b82f6', // Blue-500
  TIMELINE_INDICATOR: '#ffffff'
};
```

This comprehensive documentation provides all specifications needed to recreate the complete Kapandji Score assessment system with canvas visualization, real-time scoring, and interactive controls as shown in the screenshot.