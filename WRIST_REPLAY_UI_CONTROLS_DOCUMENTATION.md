# Wrist Flexion/Extension Motion Replay UI Controls - Complete Recreation Guide

## Overview
This document provides complete specifications for recreating the UI controls section below the wrist motion replay canvas, including playback controls, timeline scrubber, angle analysis panels, and recording summary.

## UI Layout Structure

### Main Container Layout
```tsx
<div className="max-w-4xl mx-auto space-y-6 bg-white p-6 min-h-screen">
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center justify-between text-gray-900">
        <span className="text-gray-900 font-bold">Motion Replay: Wrist Flexion/Extension</span>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {/* Canvas Component */}
        <canvas ref={canvasRef} width={640} height={480} className="w-full border-2 border-gray-300 rounded-lg bg-gray-900" />
        
        {/* Control Panels Below Canvas */}
        {/* ... UI sections documented below ... */}
      </div>
    </CardContent>
  </Card>
</div>
```

## 1. Main Control Panel

### Primary Controls Row
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
      
      {/* Navigation Controls with Separator */}
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
      
      {/* Reset Button */}
      <Button
        onClick={handleReset}
        className="bg-gray-600 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-md transition-colors"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset
      </Button>

      {/* Export Button */}
      <Button
        onClick={handleDownload}
        className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-md transition-colors"
      >
        <Download className="w-4 h-4 mr-2" />
        Export Data
      </Button>
    </div>

    {/* Settings Controls Section */}
    <div className="flex flex-wrap items-center gap-4">
      {/* Wrist Assessment Mode Indicator */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-gray-900">View Mode:</label>
        <span className="px-3 py-2 bg-blue-100 text-blue-800 rounded-md font-medium text-sm">
          Wrist Analysis
        </span>
      </div>
      
      {/* Playback Speed Control */}
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

### Button Handler Functions
```tsx
// Play/Pause control
const handlePlay = () => setIsPlaying(!isPlaying);

// Reset to beginning
const handleReset = () => {
  setIsPlaying(false);
  setCurrentFrame(0);
};

// Export motion data as JSON
const handleDownload = () => {
  const motionData = {
    assessment: "Wrist Flexion/Extension",
    duration: replayData.length / 30,
    frames: replayData.length,
    exportedAt: new Date().toISOString(),
    data: replayData
  };
  
  const blob = new Blob([JSON.stringify(motionData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Wrist_Flexion_Extension_motion_data.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

## 2. Timeline Scrubber Section

### Timeline Container
```tsx
<div className="bg-white border border-gray-200 p-4 rounded-lg">
  {/* Frame Information Header */}
  <div className="flex items-center justify-between mb-2 text-sm text-gray-800">
    <span>Frame: {currentFrame + 1} / {replayData.length}</span>
    <span>Time: {(currentFrame / 30).toFixed(1)}s / {(replayData.length / 30).toFixed(1)}s</span>
  </div>
  
  {/* Progress Slider */}
  <div className="relative">
    <input
      type="range"
      min={0}
      max={Math.max(0, replayData.length - 1)}
      value={currentFrame}
      onChange={(e) => {
        const frame = parseInt(e.target.value);
        setCurrentFrame(frame);
        drawFrame(frame);
      }}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      style={{
        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentFrame / Math.max(1, replayData.length - 1)) * 100}%, #e5e7eb ${(currentFrame / Math.max(1, replayData.length - 1)) * 100}%, #e5e7eb 100%)`
      }}
    />
    
    {/* Timeline Markers */}
    <div className="flex justify-between mt-1 text-xs text-gray-800">
      <span>0s</span>
      <span>{(replayData.length / 30 / 4).toFixed(1)}s</span>
      <span>{(replayData.length / 30 / 2).toFixed(1)}s</span>
      <span>{(replayData.length / 30 * 3/4).toFixed(1)}s</span>
      <span>{(replayData.length / 30).toFixed(1)}s</span>
    </div>
  </div>
  
  {/* Footer Information */}
  <div className="flex justify-between items-center mt-3 text-xs text-gray-800">
    <span>Drag to navigate • Click anywhere on timeline to jump</span>
    <span>30 FPS</span>
  </div>
</div>
```

### Custom Slider CSS
```css
/* Custom range slider styling */
.slider::-webkit-slider-thumb {
  appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider::-moz-range-thumb {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
```

## 3. Wrist Angle Analysis Panel

### Two-Column Layout for Current vs Maximum Values
```tsx
<div className="bg-gray-100 border border-gray-200 p-4 rounded-lg">
  <h4 className="font-medium mb-3 text-gray-900">Wrist Angle Analysis</h4>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    
    {/* Current Frame Data */}
    <div className="bg-white p-4 rounded border">
      <div className="flex justify-between items-center mb-3">
        <span className="font-medium text-gray-900">Current Frame</span>
        <span className="text-sm text-gray-600">Frame {currentFrame + 1}</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-700">Raw Angle:</span>
          <span className="font-bold text-green-600">
            {currentWristAngles.forearmToHandAngle.toFixed(1)}°
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Flexion:</span>
          <span className={`font-bold ${
            currentWristAngles.wristFlexionAngle > 0 ? 'text-blue-600' : 'text-gray-400'
          }`}>
            {currentWristAngles.wristFlexionAngle.toFixed(1)}°
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Extension:</span>
          <span className={`font-bold ${
            currentWristAngles.wristExtensionAngle > 0 ? 'text-orange-600' : 'text-gray-400'
          }`}>
            {currentWristAngles.wristExtensionAngle.toFixed(1)}°
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Hand Type:</span>
          <span className="font-medium text-gray-900">{currentWristAngles.handType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Confidence:</span>
          <span className="font-medium text-gray-900">
            {(currentWristAngles.confidence * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
    
    {/* Session Maximum Data */}
    <div className="bg-white p-4 rounded border">
      <div className="flex justify-between items-center mb-3">
        <span className="font-medium text-gray-900">Session Maximum</span>
        <span className="text-sm text-gray-600">Best Performance</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-700">Max Raw Angle:</span>
          <span className="font-bold text-green-600">
            {maxWristAngles.forearmToHandAngle.toFixed(1)}°
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Max Flexion:</span>
          <span className="font-bold text-blue-600">
            {maxWristAngles.wristFlexionAngle.toFixed(1)}°
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">Max Extension:</span>
          <span className="font-bold text-orange-600">
            {maxWristAngles.wristExtensionAngle.toFixed(1)}°
          </span>
        </div>
        
        {/* Clinical Reference Ranges */}
        <div className="pt-2 border-t">
          <div className="text-xs text-gray-600">Clinical Normal Ranges:</div>
          <div className="text-xs text-gray-600">Flexion: 0-80° | Extension: 0-70°</div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Data Update Logic
```tsx
// Update current frame angles
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

// Calculate session maximums
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

## 4. Recording Summary Panel

### Statistics Grid Layout
```tsx
<div className="bg-gray-100 p-4 rounded-lg">
  <h4 className="font-medium mb-2 text-gray-900">Recording Summary</h4>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
    <div>
      <span className="text-gray-800">Duration:</span>
      <div className="font-medium text-gray-900">{(replayData.length / 30).toFixed(1)}s</div>
    </div>
    <div>
      <span className="text-gray-800">Frames:</span>
      <div className="font-medium text-gray-900">{replayData.length}</div>
    </div>
    <div>
      <span className="text-gray-800">Frame Rate:</span>
      <div className="font-medium text-gray-900">30 FPS</div>
    </div>
    <div>
      <span className="text-gray-800">Hand Detected:</span>
      <div className="font-medium text-green-600">100%</div>
    </div>
  </div>
</div>
```

### Hand Detection Calculation
```tsx
// Calculate hand detection percentage
const calculateHandDetectionRate = (replayData: ReplayData[]): number => {
  if (!replayData.length) return 0;
  
  const validFrames = replayData.filter(frame => 
    frame.landmarks && frame.landmarks.length >= 21 && frame.quality > 0.5
  );
  
  return Math.round((validFrames.length / replayData.length) * 100);
};

// Usage in component
const handDetectionRate = calculateHandDetectionRate(replayData);
```

## 5. Animation and Playback System

### Animation Loop Implementation
```tsx
const playAnimation = useCallback(() => {
  if (!isPlaying) return;

  setCurrentFrame(prev => {
    const next = prev + playbackSpeed;
    if (next >= replayData.length) {
      return 0; // Loop back to beginning
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

### Playback Speed Control
```tsx
const [playbackSpeed, setPlaybackSpeed] = useState(1);

// Speed multiplier affects animation interval
const animationInterval = 33 / playbackSpeed; // Faster speeds = shorter intervals

// Available speed options
const speedOptions = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' }
];
```

## 6. State Management

### Component State Variables
```tsx
// Playback control state
const [isPlaying, setIsPlaying] = useState(false);
const [currentFrame, setCurrentFrame] = useState(0);
const [playbackSpeed, setPlaybackSpeed] = useState(1);

// Wrist angle data state
const [currentWristAngles, setCurrentWristAngles] = useState<ElbowWristAngles | null>(null);
const [maxWristAngles, setMaxWristAngles] = useState<ElbowWristAngles | null>(null);

// Drag interaction state
const [isDragging, setIsDragging] = useState(false);

// Animation reference
const animationRef = useRef<NodeJS.Timeout | null>(null);
```

### Data Loading and Processing
```tsx
// Load motion data from API
const { data: motionData, isLoading } = useQuery({
  queryKey: [`/api/user-assessments/${userAssessmentId}/motion-data`],
  enabled: !!userAssessmentId,
});

// Process replay data
const replayData: ReplayData[] = motionData?.motionData || [];

// Assessment type detection
const isWristAssessment = assessmentName === "Wrist Flexion/Extension" ||
                         assessmentName?.toLowerCase().includes("wrist");
```

## 7. Responsive Design Considerations

### Mobile-First Layout
```tsx
// Responsive control panel layout
<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
  {/* Controls stack vertically on mobile, horizontally on desktop */}
</div>

// Responsive grid for angle analysis
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Single column on mobile, two columns on desktop */}
</div>

// Responsive recording summary
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
  {/* 2 columns on mobile, 4 on desktop */}
</div>
```

### Breakpoint Classes
```css
/* Tailwind responsive breakpoints */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
```

## 8. Color Scheme and Visual Hierarchy

### Primary Color Palette
```tsx
const WRIST_UI_COLORS = {
  // Primary actions
  PLAY_BUTTON: 'bg-blue-600 hover:bg-blue-700',
  RESET_BUTTON: 'bg-gray-600 hover:bg-gray-700',
  EXPORT_BUTTON: 'bg-purple-600 hover:bg-purple-700',
  
  // Navigation controls
  MAX_TAM: 'bg-green-600 hover:bg-green-700',
  MIN_TAM: 'bg-orange-600 hover:bg-orange-700',
  
  // Data visualization
  RAW_ANGLE: 'text-green-600',
  FLEXION: 'text-blue-600',
  EXTENSION: 'text-orange-600',
  INACTIVE: 'text-gray-400',
  
  // Backgrounds
  PANEL_BG: 'bg-gray-100',
  CARD_BG: 'bg-white',
  TIMELINE_BG: 'bg-white border border-gray-200',
  
  // Borders and dividers
  BORDER: 'border-gray-300',
  TIMELINE_PROGRESS: '#3b82f6'
};
```

## 9. Keyboard Shortcuts (Optional Enhancement)

### Keyboard Event Handlers
```tsx
useEffect(() => {
  const handleKeyPress = (event: KeyboardEvent) => {
    switch (event.key) {
      case ' ': // Spacebar
        event.preventDefault();
        setIsPlaying(!isPlaying);
        break;
      case 'r': // Reset
        event.preventDefault();
        handleReset();
        break;
      case 'ArrowLeft': // Previous frame
        event.preventDefault();
        setCurrentFrame(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowRight': // Next frame
        event.preventDefault();
        setCurrentFrame(prev => Math.min(replayData.length - 1, prev + 1));
        break;
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [isPlaying, replayData.length]);
```

This comprehensive documentation provides all specifications needed to recreate the complete UI control system below the wrist flexion/extension motion replay canvas, maintaining visual consistency and functional accuracy with the original implementation.
