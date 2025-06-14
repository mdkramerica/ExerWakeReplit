# TAM (Total Active Motion) Assessment Canvas & Controls - Complete Recreation Guide

## Overview
This document provides complete specifications for recreating the TAM assessment system, including canvas visualization with digit selection, live joint angle display, comprehensive ROM analysis, and interactive playback controls.

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

  // Draw reference grid
  drawGrid(ctx, canvas.width, canvas.height);

  // Calculate current ROM for selected digit
  if (frame.landmarks && frame.landmarks.length >= 21) {
    const romData = calculateFingerROM(frame.landmarks, selectedDigit);
    setCurrentROM(romData);
  }

  // Draw hand landmarks with digit-specific highlighting
  drawHandLandmarks(ctx, frame.landmarks, canvas.width, canvas.height);

  // Draw frame information overlay
  drawFrameInfo(ctx, canvas, frameIndex);
  
  // Draw timeline and branding
  drawTimeline(ctx, canvas, frameIndex);
  drawBranding(ctx, canvas);
};
```

### Grid Pattern Implementation
```tsx
const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  ctx.strokeStyle = '#374151'; // Gray-700, subtle grid lines
  ctx.lineWidth = 1;
  
  const gridSize = 40;

  // Draw vertical and horizontal grid lines
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
};
```

## 2. Digit Selection and Highlighting System

### Active Finger Joint Mapping
```tsx
const getActiveFingerJoints = (digit: string) => {
  switch (digit) {
    case 'INDEX': return { mcp: 5, pip: 6, dip: 7, tip: 8 };
    case 'MIDDLE': return { mcp: 9, pip: 10, dip: 11, tip: 12 };
    case 'RING': return { mcp: 13, pip: 14, dip: 15, tip: 16 };
    case 'PINKY': return { mcp: 17, pip: 18, dip: 19, tip: 20 };
    default: return { mcp: 5, pip: 6, dip: 7, tip: 8 };
  }
};
```

### Hand Landmark Visualization with Color Coding
```tsx
const drawHandLandmarks = (
  ctx: CanvasRenderingContext2D, 
  landmarks: Array<{x: number, y: number, z: number}>, 
  canvasWidth: number, 
  canvasHeight: number
) => {
  if (!landmarks || landmarks.length === 0) return;

  const activeJoints = getActiveFingerJoints(selectedDigit);
  const activeLandmarks = [activeJoints.mcp, activeJoints.pip, activeJoints.dip, activeJoints.tip];
  
  // Define connections based on isolation mode
  let connections;
  let visibleLandmarks;
  
  if (isolateMode) {
    // Show only selected finger + thumb + wrist connections
    const fingerConnections = {
      'INDEX': [[0, 5], [5, 6], [6, 7], [7, 8]],
      'MIDDLE': [[0, 9], [9, 10], [10, 11], [11, 12]],
      'RING': [[0, 13], [13, 14], [14, 15], [15, 16]],
      'PINKY': [[0, 17], [17, 18], [18, 19], [19, 20]]
    };
    
    connections = [
      // Always show thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Show selected finger
      ...fingerConnections[selectedDigit],
      // Show all wrist-to-MCP connections for reference
      [0, 5], [0, 9], [0, 13], [0, 17]
    ];
    
    const fingerLandmarks = {
      'INDEX': [5, 6, 7, 8],
      'MIDDLE': [9, 10, 11, 12],
      'RING': [13, 14, 15, 16],
      'PINKY': [17, 18, 19, 20]
    };
    
    visibleLandmarks = [
      0, // Wrist
      1, 2, 3, 4, // Thumb
      5, 9, 13, 17, // All MCP joints
      ...fingerLandmarks[selectedDigit] // Selected finger
    ];
  } else {
    // Show all hand connections
    connections = [
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
    
    visibleLandmarks = Array.from({length: 21}, (_, i) => i); // All landmarks
  }
  
  // Draw connections with color coding
  ctx.lineWidth = 2;
  connections.forEach(([start, end]) => {
    if (landmarks[start] && landmarks[end]) {
      const startX = landmarks[start].x * canvasWidth;
      const startY = landmarks[start].y * canvasHeight;
      const endX = landmarks[end].x * canvasWidth;
      const endY = landmarks[end].y * canvasHeight;
      
      // Color connections: yellow for active finger, green for others
      const isActiveFinger = activeLandmarks.includes(start) && activeLandmarks.includes(end);
      ctx.strokeStyle = isActiveFinger ? '#ffeb3b' : '#4caf50'; // Yellow for active, green for others
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  });
  
  // Draw landmarks with joint-specific color coding
  landmarks.forEach((landmark, index) => {
    if (!visibleLandmarks.includes(index)) return;
    
    const x = landmark.x * canvasWidth;
    const y = landmark.y * canvasHeight;
    
    let color = '#4caf50'; // Default green
    let size = 4;
    
    if (activeLandmarks.includes(index)) {
      // Color-code active finger joints
      if (index === activeJoints.mcp) {
        color = '#3b82f6'; // Blue for MCP
        size = 8;
      } else if (index === activeJoints.pip) {
        color = '#10b981'; // Green for PIP
        size = 8;
      } else if (index === activeJoints.dip) {
        color = '#8b5cf6'; // Purple for DIP
        size = 8;
      } else if (index === activeJoints.tip) {
        color = '#f59e0b'; // Orange for fingertip
        size = 6;
      }
    } else if (index === 0) {
      color = '#ef4444'; // Red for wrist
      size = 5;
    }
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Draw measurement path highlighting
  const measurementConnections = getDigitConnections(selectedDigit);
  measurementConnections.forEach(([start, end]) => {
    if (landmarks[start] && landmarks[end]) {
      ctx.strokeStyle = '#fbbf24'; // Bright yellow for measurement path
      ctx.lineWidth = 4;
      
      ctx.beginPath();
      ctx.moveTo(
        landmarks[start].x * canvasWidth,
        landmarks[start].y * canvasHeight
      );
      ctx.lineTo(
        landmarks[end].x * canvasWidth,
        landmarks[end].y * canvasHeight
      );
      ctx.stroke();
    }
  });
};

const getDigitConnections = (digit: string) => {
  switch (digit) {
    case 'INDEX': return [[0, 5], [5, 6], [6, 7], [7, 8]];
    case 'MIDDLE': return [[0, 9], [9, 10], [10, 11], [11, 12]];
    case 'RING': return [[0, 13], [13, 14], [14, 15], [15, 16]];
    case 'PINKY': return [[0, 17], [17, 18], [18, 19], [19, 20]];
    default: return [[0, 5], [5, 6], [6, 7], [7, 8]];
  }
};
```

## 3. ROM Calculation System

### Individual Finger ROM Calculation
```tsx
import { calculateFingerROM } from '@/shared/rom-calculator';

// Calculate ROM for current frame
useEffect(() => {
  if (replayData.length > 0 && currentFrame < replayData.length) {
    const frame = replayData[currentFrame];
    if (frame.landmarks && frame.landmarks.length >= 21) {
      const romData = calculateFingerROM(frame.landmarks, selectedDigit);
      setCurrentROM(romData);
    }
  }
}, [currentFrame, replayData, selectedDigit]);

// ROM calculation interface
interface JointAngles {
  mcpAngle: number;    // MCP joint flexion angle
  pipAngle: number;    // PIP joint flexion angle  
  dipAngle: number;    // DIP joint flexion angle
  totalActiveRom: number; // Sum of all joint angles (TAM)
}
```

### Comprehensive Multi-Digit Analysis
```tsx
// Calculate maximum ROM for all digits across all frames
useEffect(() => {
  if (replayData.length > 0 && !isKapandjiAssessment) {
    const allFramesAllDigits = replayData.map(frame => ({
      INDEX: calculateFingerROM(frame.landmarks, 'INDEX'),
      MIDDLE: calculateFingerROM(frame.landmarks, 'MIDDLE'),
      RING: calculateFingerROM(frame.landmarks, 'RING'),
      PINKY: calculateFingerROM(frame.landmarks, 'PINKY')
    }));
    
    // Find maximum ROM for each digit
    const maxROMByDigit = {
      INDEX: allFramesAllDigits.reduce((max, current) => 
        current.INDEX.totalActiveRom > max.totalActiveRom ? current.INDEX : max, 
        allFramesAllDigits[0].INDEX
      ),
      MIDDLE: allFramesAllDigits.reduce((max, current) => 
        current.MIDDLE.totalActiveRom > max.totalActiveRom ? current.MIDDLE : max, 
        allFramesAllDigits[0].MIDDLE
      ),
      RING: allFramesAllDigits.reduce((max, current) => 
        current.RING.totalActiveRom > max.totalActiveRom ? current.RING : max, 
        allFramesAllDigits[0].RING
      ),
      PINKY: allFramesAllDigits.reduce((max, current) => 
        current.PINKY.totalActiveRom > max.totalActiveRom ? current.PINKY : max,
        allFramesAllDigits[0].PINKY
      )
    };
    
    setAllDigitsROM(maxROMByDigit);
    setMaxROM(maxROMByDigit[selectedDigit]);
    
    // Find frames with maximum and minimum TAM for navigation
    const selectedDigitFrames = allFramesAllDigits.map(frame => frame[selectedDigit]);
    
    const maxTamFrameIndex = selectedDigitFrames.findIndex(rom => 
      rom.totalActiveRom === maxROMByDigit[selectedDigit].totalActiveRom
    );
    
    const minROM = selectedDigitFrames.reduce((min, current) => 
      current.totalActiveRom < min.totalActiveRom ? current : min, 
      selectedDigitFrames[0]
    );
    const minTamFrameIndex = selectedDigitFrames.findIndex(rom => 
      rom.totalActiveRom === minROM.totalActiveRom
    );
    
    setMaxTAMFrame(maxTamFrameIndex >= 0 ? maxTamFrameIndex : 0);
    setMinTAMFrame(minTamFrameIndex >= 0 ? minTamFrameIndex : 0);
    setCurrentFrame(maxTamFrameIndex >= 0 ? maxTamFrameIndex : 0);
  }
}, [replayData, selectedDigit, isKapandjiAssessment]);
```

## 4. Live Joint Angles Display

### Real-time Angle Panel
```tsx
{/* Live ROM Data Display - only show for TAM assessments */}
{currentROM && !assessmentName.toLowerCase().includes('kapandji') && (
  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
    <h4 className="font-medium mb-3 flex items-center text-gray-900">
      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
      Live Joint Angles - {selectedDigit.charAt(0) + selectedDigit.slice(1).toLowerCase()} Finger
    </h4>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <div className="bg-white p-3 rounded border">
        <span className="text-gray-800 block">MCP Joint:</span>
        <div className="font-bold text-lg text-blue-600">{Math.round(currentROM.mcpAngle)}°</div>
        {maxROM && (
          <div className="text-xs text-gray-700">Max: {Math.round(maxROM.mcpAngle)}°</div>
        )}
      </div>
      <div className="bg-white p-3 rounded border">
        <span className="text-gray-800 block">PIP Joint:</span>
        <div className="font-bold text-lg text-green-600">{Math.round(currentROM.pipAngle)}°</div>
        {maxROM && (
          <div className="text-xs text-gray-700">Max: {Math.round(maxROM.pipAngle)}°</div>
        )}
      </div>
      <div className="bg-white p-3 rounded border">
        <span className="text-gray-800 block">DIP Joint:</span>
        <div className="font-bold text-lg text-purple-600">{Math.round(currentROM.dipAngle)}°</div>
        {maxROM && (
          <div className="text-xs text-gray-700">Max: {Math.round(maxROM.dipAngle)}°</div>
        )}
      </div>
      <div className="bg-white p-3 rounded border">
        <span className="text-gray-800 block">Total ROM:</span>
        <div className="font-bold text-lg text-gray-900">{Math.round(currentROM.totalActiveRom)}°</div>
        {maxROM && (
          <div className="text-xs text-gray-700">Max: {Math.round(maxROM.totalActiveRom)}°</div>
        )}
      </div>
    </div>
  </div>
)}
```

## 5. Control Panel Implementation

### Main Control Buttons
```tsx
<div className="bg-white border border-gray-300 p-4 rounded-lg space-y-4">
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    {/* Play Controls Section */}
    <div className="flex flex-wrap items-center gap-3">
      {/* Play/Pause Button */}
      <Button
        onClick={handlePlay}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-md transition-colors"
      >
        {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
      
      {/* TAM Navigation Controls */}
      <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
        <Button
          onClick={() => {
            setCurrentFrame(maxTAMFrame);
            setIsPlaying(false);
          }}
          className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-md transition-colors"
          title="Jump to Maximum TAM frame"
        >
          Max TAM
        </Button>
        
        <Button
          onClick={() => {
            setCurrentFrame(minTAMFrame);
            setIsPlaying(false);
          }}
          className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium px-3 py-2 rounded-md transition-colors"
          title="Jump to Minimum TAM frame"
        >
          Min TAM
        </Button>
      </div>
      
      {/* Reset and Export */}
      <Button
        onClick={handleReset}
        className="bg-gray-600 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-md transition-colors"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset
      </Button>

      <Button
        onClick={handleDownload}
        className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-md transition-colors"
      >
        <Download className="w-4 h-4 mr-2" />
        Export Data
      </Button>
    </div>

    {/* Settings Controls */}
    <div className="flex flex-wrap items-center gap-4">
      {/* Digit Selection */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-gray-900">Digit:</label>
        <select
          value={selectedDigit}
          onChange={(e) => setSelectedDigit(e.target.value as 'INDEX' | 'MIDDLE' | 'RING' | 'PINKY')}
          className="border-2 border-gray-300 rounded-md px-3 py-2 bg-white font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
        >
          <option value="INDEX">Index Finger</option>
          <option value="MIDDLE">Middle Finger</option>
          <option value="RING">Ring Finger</option>
          <option value="PINKY">Pinky Finger</option>
        </select>
      </div>
      
      {/* Isolate Mode Toggle */}
      <div className="flex items-center gap-2">
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
      </div>
      
      {/* Speed Control */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-gray-900">Speed:</label>
        <select
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          className="border-2 border-gray-300 rounded-md px-3 py-2 bg-white font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
      </div>
    </div>
  </div>
</div>
```

### Control Handler Functions
```tsx
// Play/Pause control
const handlePlay = () => setIsPlaying(!isPlaying);

// Reset to beginning
const handleReset = () => {
  setIsPlaying(false);
  setCurrentFrame(0);
};

// Jump to maximum TAM frame for selected digit
const handleMaxTAM = () => {
  setCurrentFrame(maxTAMFrame);
  setIsPlaying(false);
};

// Jump to minimum TAM frame for selected digit
const handleMinTAM = () => {
  setCurrentFrame(minTAMFrame);
  setIsPlaying(false);
};

// Export TAM data as JSON
const handleDownload = () => {
  const tamExportData = {
    assessment: 'Total Active Motion (TAM)',
    timestamp: new Date().toISOString(),
    duration: replayData.length / 30,
    frames: replayData.length,
    selectedDigit: selectedDigit,
    results: {
      currentROM: currentROM,
      maxROM: maxROM,
      allDigitsMaxROM: allDigitsROM
    },
    motionData: replayData
  };
  
  const blob = new Blob([JSON.stringify(tamExportData, null, 2)], 
    { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TAM_Assessment_${selectedDigit}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

## 6. Comprehensive ROM Analysis Display

### All Digits Overview Panel
```tsx
{/* Comprehensive Multi-Digit ROM Analysis */}
{allDigitsROM && (
  <div className="bg-gray-100 border border-gray-200 p-4 rounded-lg">
    <h4 className="font-medium mb-3 text-gray-900">Comprehensive ROM Analysis - All Digits</h4>
    <div className="space-y-4">
      {Object.entries(allDigitsROM).map(([digit, rom]) => (
        <div key={digit} className={`bg-white p-4 rounded border ${
          digit === selectedDigit ? 'ring-2 ring-blue-500' : ''
        }`}>
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium text-gray-900">
              {digit.charAt(0) + digit.slice(1).toLowerCase()} Finger
            </span>
            <span className="font-bold text-lg text-gray-900">
              {Math.round(rom.totalActiveRom)}° TAM
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className={`p-2 rounded ${
              rom.mcpAngle < 70 ? 'bg-red-50 border border-red-200' : 'bg-gray-100'
            }`}>
              <div className="text-xs text-gray-800">MCP Joint</div>
              <div className={`font-medium ${
                rom.mcpAngle < 70 ? 'text-red-600' : 'text-blue-600'
              }`}>
                {Math.round(rom.mcpAngle)}°
              </div>
              <div className="text-xs text-gray-700">Normal: 70-90°</div>
            </div>
            <div className={`p-2 rounded ${
              rom.pipAngle < 90 ? 'bg-red-50 border border-red-200' : 'bg-gray-100'
            }`}>
              <div className="text-xs text-gray-800">PIP Joint</div>
              <div className={`font-medium ${
                rom.pipAngle < 90 ? 'text-red-600' : 'text-green-600'
              }`}>
                {Math.round(rom.pipAngle)}°
              </div>
              <div className="text-xs text-gray-700">Normal: 90-110°</div>
            </div>
            <div className={`p-2 rounded ${
              rom.dipAngle < 70 ? 'bg-red-50 border border-red-200' : 'bg-gray-100'
            }`}>
              <div className="text-xs text-gray-800">DIP Joint</div>
              <div className={`font-medium ${
                rom.dipAngle < 70 ? 'text-red-600' : 'text-purple-600'
              }`}>
                {Math.round(rom.dipAngle)}°
              </div>
              <div className="text-xs text-gray-700">Normal: 70-90°</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

### Clinical Normal Range Indicators
```tsx
// Normal ROM ranges for clinical reference
const CLINICAL_ROM_RANGES = {
  MCP: { min: 70, max: 90 },
  PIP: { min: 90, max: 110 },
  DIP: { min: 70, max: 90 }
};

// Function to determine if ROM is within normal range
const isWithinNormalRange = (angle: number, joint: 'MCP' | 'PIP' | 'DIP'): boolean => {
  const range = CLINICAL_ROM_RANGES[joint];
  return angle >= range.min && angle <= range.max;
};

// Color coding function for ROM values
const getROMColorClass = (angle: number, joint: 'MCP' | 'PIP' | 'DIP'): string => {
  if (isWithinNormalRange(angle, joint)) {
    return 'text-green-600'; // Normal range
  } else if (angle < CLINICAL_ROM_RANGES[joint].min) {
    return 'text-red-600'; // Below normal (restricted)
  } else {
    return 'text-blue-600'; // Above normal (hypermobile)
  }
};
```

## 7. State Management

### Component State Variables
```tsx
// ROM calculation state
const [currentROM, setCurrentROM] = useState<JointAngles | null>(null);
const [maxROM, setMaxROM] = useState<JointAngles | null>(null);
const [allDigitsROM, setAllDigitsROM] = useState<{[key: string]: JointAngles} | null>(null);

// Digit selection and display modes
const [selectedDigit, setSelectedDigit] = useState<'INDEX' | 'MIDDLE' | 'RING' | 'PINKY'>('INDEX');
const [isolateMode, setIsolateMode] = useState(false);

// TAM navigation frames
const [maxTAMFrame, setMaxTAMFrame] = useState(0);
const [minTAMFrame, setMinTAMFrame] = useState(0);

// Playback control state
const [isPlaying, setIsPlaying] = useState(false);
const [currentFrame, setCurrentFrame] = useState(0);
const [playbackSpeed, setPlaybackSpeed] = useState(1);

// Assessment type detection
const isKapandjiAssessment = assessmentName?.toLowerCase().includes('kapandji');
```

### Animation and Playback System
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

// Update canvas when frame changes
useEffect(() => {
  drawFrame(currentFrame);
}, [currentFrame]);
```

## 8. Timeline and Navigation

### Timeline Implementation
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

  // Frame and time information
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Arial';
  ctx.fillText(`${currentFrame + 1}/${replayData.length}`, 10, timelineY + 18);
  
  const currentTime = (currentFrame / 30).toFixed(1);
  const totalTime = (replayData.length / 30).toFixed(1);
  ctx.fillText(`${currentTime}s`, canvas.width - 100, timelineY + 18);
};
```

### Frame Information Overlay
```tsx
const drawFrameInfo = (
  ctx: CanvasRenderingContext2D, 
  canvas: HTMLCanvasElement, 
  frameIndex: number
) => {
  const frame = replayData[frameIndex];
  if (!frame) return;

  // Frame information overlay (top-left)
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.fillText(`Frame: ${frameIndex + 1}/${replayData.length}`, 10, 25);
  ctx.fillText(`Quality: ${Math.round(frame.quality)}%`, 10, 45);
  
  // Hand detection status
  const displayHandType = frame.sessionHandType || frame.handedness || 'UNKNOWN';
  ctx.fillText(`Hand: ${displayHandType}`, 10, 65);
};
```

## 9. Color Scheme and Visual Design

### TAM-Specific Color Palette
```tsx
const TAM_COLORS = {
  // Canvas background
  CANVAS_BG: '#1f2937', // Dark gray-800
  GRID_LINES: '#374151', // Gray-700
  
  // Joint color coding
  MCP_JOINT: '#3b82f6', // Blue
  PIP_JOINT: '#10b981', // Green
  DIP_JOINT: '#8b5cf6', // Purple
  FINGERTIP: '#f59e0b', // Orange
  WRIST: '#ef4444', // Red
  
  // Connection lines
  ACTIVE_FINGER: '#ffeb3b', // Yellow
  OTHER_CONNECTIONS: '#4caf50', // Green
  MEASUREMENT_PATH: '#fbbf24', // Bright yellow
  
  // ROM value colors
  NORMAL_ROM: '#10b981', // Green
  RESTRICTED_ROM: '#ef4444', // Red
  HYPERMOBILE_ROM: '#3b82f6', // Blue
  
  // UI elements
  LIVE_INDICATOR: '#10b981', // Green pulse
  SELECTED_DIGIT: '#3b82f6', // Blue ring
  TIMELINE_PROGRESS: '#3b82f6' // Blue
};
```

## 10. Export and Data Management

### TAM Data Export Format
```tsx
interface TAMExportData {
  assessment: string;
  timestamp: string;
  duration: number;
  frames: number;
  selectedDigit: string;
  results: {
    currentROM: JointAngles;
    maxROM: JointAngles;
    allDigitsMaxROM: {[key: string]: JointAngles};
    clinicalAssessment: {
      withinNormalRange: boolean;
      restrictedJoints: string[];
      recommendations: string[];
    };
  };
  motionData: Array<any>;
}
```

This comprehensive documentation provides all specifications needed to recreate the complete TAM assessment system with canvas visualization, digit selection, real-time ROM calculation, and interactive controls as shown in the provided screenshots.