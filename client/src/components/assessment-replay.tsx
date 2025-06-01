import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Download } from "lucide-react";
import { calculateCurrentROM, type JointAngles } from "@/lib/rom-calculator";
import exerLogoPath from "@assets/exer-logo.png";

interface ReplayData {
  timestamp: number;
  landmarks: Array<{x: number, y: number, z: number}>;
  handedness: string;
  quality: number;
}

interface AssessmentReplayProps {
  assessmentName: string;
  userAssessmentId?: string;
  recordingData?: ReplayData[];
  onClose: () => void;
}

// Hand landmark connections for drawing skeleton
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // index finger
  [5, 9], [9, 10], [10, 11], [11, 12], // middle finger
  [9, 13], [13, 14], [14, 15], [15, 16], // ring finger
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17] // palm connection
];

export default function AssessmentReplay({ assessmentName, userAssessmentId, recordingData = [], onClose }: AssessmentReplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const animationRef = useRef<number | null>(null);
  const [currentROM, setCurrentROM] = useState<JointAngles | null>(null);
  const [maxROM, setMaxROM] = useState<JointAngles | null>(null);
  
  // Fetch real motion data if userAssessmentId is provided
  const { data: motionData, isLoading } = useQuery({
    queryKey: [`/api/user-assessments/${userAssessmentId}/motion-data`],
    enabled: !!userAssessmentId,
  });

  // Use actual recorded motion data or provided recording data
  const actualMotionData = motionData?.motionData || recordingData;
  const replayData: ReplayData[] = actualMotionData.length > 0 ? actualMotionData : [];

  // Calculate maximum ROM from all frames for comparison
  useEffect(() => {
    if (replayData.length > 0) {
      let maxMcp = 0, maxPip = 0, maxDip = 0, maxTotal = 0;
      
      replayData.forEach(frame => {
        if (frame.landmarks && frame.landmarks.length >= 21) {
          const rom = calculateCurrentROM(frame.landmarks);
          maxMcp = Math.max(maxMcp, rom.mcpAngle);
          maxPip = Math.max(maxPip, rom.pipAngle);
          maxDip = Math.max(maxDip, rom.dipAngle);
          maxTotal = Math.max(maxTotal, rom.totalActiveRom);
        }
      });
      
      setMaxROM({ mcpAngle: maxMcp, pipAngle: maxPip, dipAngle: maxDip, totalActiveRom: maxTotal });
    }
  }, [replayData]);

  // Draw hand landmarks and connections on canvas
  const drawHandLandmarks = (ctx: CanvasRenderingContext2D, landmarks: Array<{x: number, y: number, z: number}>, canvasWidth: number, canvasHeight: number) => {
    if (!landmarks || landmarks.length === 0) return;

    // Draw landmark points
    ctx.fillStyle = '#00ff00';
    landmarks.forEach((landmark, index) => {
      const x = landmark.x * canvasWidth;
      const y = landmark.y * canvasHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw hand connections
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    HAND_CONNECTIONS.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end]) {
        const startX = landmarks[start].x * canvasWidth;
        const startY = landmarks[start].y * canvasHeight;
        const endX = landmarks[end].x * canvasWidth;
        const endY = landmarks[end].y * canvasHeight;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });
  };

  function generateHandLandmarks(centerX: number, centerY: number, time: number): Array<{x: number, y: number, z: number}> {
    const landmarks = [];
    
    // Wrist (0)
    landmarks.push({ x: centerX, y: centerY, z: 0 });
    
    // Thumb (1-4)
    const thumbAngle = Math.sin(time * 2) * 0.3;
    for (let i = 1; i <= 4; i++) {
      landmarks.push({
        x: centerX - 0.08 + (i * 0.02) + Math.cos(thumbAngle) * 0.03,
        y: centerY - 0.05 + (i * 0.015) + Math.sin(thumbAngle) * 0.02,
        z: 0
      });
    }
    
    // Index finger (5-8)
    const indexFlex = Math.sin(time * 1.5) * 0.4 + 0.6;
    for (let i = 1; i <= 4; i++) {
      landmarks.push({
        x: centerX - 0.04 + (i * 0.01),
        y: centerY - 0.08 - (i * 0.02 * indexFlex),
        z: 0
      });
    }
    
    // Middle finger (9-12)
    const middleFlex = Math.sin(time * 1.2 + 0.5) * 0.4 + 0.6;
    for (let i = 1; i <= 4; i++) {
      landmarks.push({
        x: centerX + (i * 0.005),
        y: centerY - 0.08 - (i * 0.025 * middleFlex),
        z: 0
      });
    }
    
    // Ring finger (13-16)
    const ringFlex = Math.sin(time * 1.1 + 1) * 0.4 + 0.6;
    for (let i = 1; i <= 4; i++) {
      landmarks.push({
        x: centerX + 0.04 + (i * 0.005),
        y: centerY - 0.08 - (i * 0.02 * ringFlex),
        z: 0
      });
    }
    
    // Pinky (17-20)
    const pinkyFlex = Math.sin(time * 1.3 + 1.5) * 0.4 + 0.6;
    for (let i = 1; i <= 4; i++) {
      landmarks.push({
        x: centerX + 0.08 + (i * 0.005),
        y: centerY - 0.06 - (i * 0.015 * pinkyFlex),
        z: 0
      });
    }
    
    return landmarks;
  }

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

    // Draw grid for reference
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Calculate and update current ROM for this frame
    if (frame.landmarks && frame.landmarks.length >= 21) {
      const romData = calculateCurrentROM(frame.landmarks);
      setCurrentROM(romData);
    }

    // Draw hand landmarks with finger highlighting
    frame.landmarks.forEach((landmark, index) => {
      const x = landmark.x * canvas.width;
      const y = landmark.y * canvas.height;
      
      // Highlight index finger joints (5, 6, 7, 8) since we're measuring its ROM
      let color = '#10b981'; // Default green
      let size = 4;
      
      if ([5, 6, 7, 8].includes(index)) {
        // Index finger - primary measurement finger
        color = '#3b82f6'; // Blue for index finger
        size = 6;
      } else if ([0].includes(index)) {
        // Wrist landmark
        color = '#ef4444'; // Red for wrist
        size = 5;
      }
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();

      // Draw landmark numbers
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText(index.toString(), x + 6, y - 6);
      ctx.fillStyle = '#10b981';
    });

    // Draw hand connections (natural position without mirroring)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    HAND_CONNECTIONS.forEach(([start, end]) => {
      if (frame.landmarks[start] && frame.landmarks[end]) {
        ctx.beginPath();
        ctx.moveTo(
          frame.landmarks[start].x * canvas.width,
          frame.landmarks[start].y * canvas.height
        );
        ctx.lineTo(
          frame.landmarks[end].x * canvas.width,
          frame.landmarks[end].y * canvas.height
        );
        ctx.stroke();
      }
    });

    // Draw live ROM data overlay
    if (frame.landmarks && frame.landmarks.length >= 21) {
      const romData = calculateCurrentROM(frame.landmarks);
      
      // Semi-transparent background for ROM overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(canvas.width - 220, 10, 200, 120);
      
      // ROM title
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('Live Joint Angles', canvas.width - 210, 30);
      
      // Draw index finger diagram indicator
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width - 50, 40);
      ctx.lineTo(canvas.width - 30, 40);
      ctx.lineTo(canvas.width - 30, 50);
      ctx.lineTo(canvas.width - 20, 50);
      ctx.lineTo(canvas.width - 20, 60);
      ctx.lineTo(canvas.width - 10, 60);
      ctx.stroke();
      
      // Joint angles with color coding
      ctx.font = '12px Arial';
      
      // MCP Joint (blue to match highlighted landmarks)
      ctx.fillStyle = '#3b82f6';
      ctx.fillText(`MCP: ${Math.round(romData.mcpAngle)}°`, canvas.width - 210, 50);
      
      // PIP Joint (green)
      ctx.fillStyle = '#10b981';
      ctx.fillText(`PIP: ${Math.round(romData.pipAngle)}°`, canvas.width - 210, 70);
      
      // DIP Joint (purple)
      ctx.fillStyle = '#8b5cf6';
      ctx.fillText(`DIP: ${Math.round(romData.dipAngle)}°`, canvas.width - 210, 90);
      
      // Total ROM (white, emphasized)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(`Total: ${Math.round(romData.totalActiveRom)}°`, canvas.width - 210, 110);
      
      // Draw angle visualization on the finger joints
      if (frame.landmarks[5] && frame.landmarks[6] && frame.landmarks[7] && frame.landmarks[8]) {
        // Draw MCP angle arc
        const mcpCenter = { x: frame.landmarks[5].x * canvas.width, y: frame.landmarks[5].y * canvas.height };
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(mcpCenter.x, mcpCenter.y, 15, 0, (romData.mcpAngle / 180) * Math.PI);
        ctx.stroke();
        
        // Draw PIP angle arc
        const pipCenter = { x: frame.landmarks[6].x * canvas.width, y: frame.landmarks[6].y * canvas.height };
        ctx.strokeStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(pipCenter.x, pipCenter.y, 12, 0, (romData.pipAngle / 180) * Math.PI);
        ctx.stroke();
        
        // Draw DIP angle arc
        const dipCenter = { x: frame.landmarks[7].x * canvas.width, y: frame.landmarks[7].y * canvas.height };
        ctx.strokeStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(dipCenter.x, dipCenter.y, 10, 0, (romData.dipAngle / 180) * Math.PI);
        ctx.stroke();
        
        ctx.setLineDash([]); // Reset line dash
      }
    }

    // Draw timestamp and quality info
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText(`Frame: ${frameIndex + 1}/${replayData.length}`, 10, 25);
    ctx.fillText(`Quality: ${Math.round(frame.quality)}%`, 10, 45);
    ctx.fillText(`Hand: ${frame.handedness}`, 10, 65);

    // Draw finger measurement legend
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 80, 180, 70);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText('Finger Measurement:', 15, canvas.height - 60);
    
    // Color-coded legend
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(15, canvas.height - 45, 10, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Index Finger (Measured)', 30, canvas.height - 37);
    
    ctx.fillStyle = '#10b981';
    ctx.fillRect(15, canvas.height - 25, 10, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Other Landmarks', 30, canvas.height - 17);

    // Draw Exer AI branding
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px Arial';
    ctx.fillText('Exer AI Motion Replay', canvas.width - 150, canvas.height - 10);
  };

  const playAnimation = () => {
    if (!isPlaying) return;

    setCurrentFrame(prev => {
      const next = prev + playbackSpeed;
      if (next >= replayData.length) {
        setIsPlaying(false);
        return replayData.length - 1;
      }
      return Math.floor(next);
    });

    animationRef.current = requestAnimationFrame(() => {
      setTimeout(playAnimation, 33); // ~30 FPS
    });
  };

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
  }, [isPlaying, playbackSpeed]);

  useEffect(() => {
    drawFrame(currentFrame);
  }, [currentFrame]);

  const handlePlay = () => setIsPlaying(!isPlaying);
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
  };

  const handleDownload = () => {
    // In a real implementation, this would export the motion data
    const motionData = {
      assessment: assessmentName,
      duration: replayData.length / 30,
      frames: replayData.length,
      exportedAt: new Date().toISOString(),
      data: replayData
    };
    
    const blob = new Blob([JSON.stringify(motionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assessmentName.replace(/\s+/g, '_')}_motion_data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Motion Replay: {assessmentName}</span>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="w-full border-2 border-gray-300 rounded-lg bg-gray-900"
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handlePlay}
                  className="medical-button"
                >
                  {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                
                <Button
                  onClick={handleReset}
                  variant="outline"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>

                <Button
                  onClick={handleDownload}
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Speed:</label>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>
            </div>

            {/* Timeline Scrubber */}
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
                <span>Frame: {currentFrame + 1} / {replayData.length}</span>
                <span>Time: {((currentFrame / 30)).toFixed(1)}s / {(replayData.length / 30).toFixed(1)}s</span>
              </div>
              
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
                
                {/* Timeline markers */}
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>0s</span>
                  <span>{(replayData.length / 30 / 4).toFixed(1)}s</span>
                  <span>{(replayData.length / 30 / 2).toFixed(1)}s</span>
                  <span>{(replayData.length / 30 * 3/4).toFixed(1)}s</span>
                  <span>{(replayData.length / 30).toFixed(1)}s</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                <span>Drag to navigate • Click anywhere on timeline to jump</span>
                <span>30 FPS</span>
              </div>
            </div>

            {/* Live ROM Data Display */}
            {currentROM && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  Live Joint Angles
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border">
                    <span className="text-gray-600 block">MCP Joint:</span>
                    <div className="font-bold text-lg text-blue-600">{Math.round(currentROM.mcpAngle)}°</div>
                    {maxROM && (
                      <div className="text-xs text-gray-500">Max: {Math.round(maxROM.mcpAngle)}°</div>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <span className="text-gray-600 block">PIP Joint:</span>
                    <div className="font-bold text-lg text-green-600">{Math.round(currentROM.pipAngle)}°</div>
                    {maxROM && (
                      <div className="text-xs text-gray-500">Max: {Math.round(maxROM.pipAngle)}°</div>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <span className="text-gray-600 block">DIP Joint:</span>
                    <div className="font-bold text-lg text-purple-600">{Math.round(currentROM.dipAngle)}°</div>
                    {maxROM && (
                      <div className="text-xs text-gray-500">Max: {Math.round(maxROM.dipAngle)}°</div>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <span className="text-gray-600 block">Total ROM:</span>
                    <div className="font-bold text-lg text-red-600">{Math.round(currentROM.totalActiveRom)}°</div>
                    {maxROM && (
                      <div className="text-xs text-gray-500">Max: {Math.round(maxROM.totalActiveRom)}°</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ROM Analysis Breakdown */}
            {maxROM && (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <h4 className="font-medium mb-3">ROM Analysis Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Maximum Flexion Achieved:</span>
                    <span className="font-semibold text-lg">{Math.round(maxROM.totalActiveRom)}°</span>
                  </div>
                  
                  <div className="bg-white p-3 rounded border">
                    <div className="text-sm font-medium mb-2">Joint Contribution Analysis:</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>MCP Joint (0° = straight):</span>
                        <span className="font-medium">{Math.round(maxROM.mcpAngle)}° ({Math.round((maxROM.mcpAngle / maxROM.totalActiveRom) * 100)}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PIP Joint (normal max ~100°):</span>
                        <span className="font-medium">{Math.round(maxROM.pipAngle)}° ({Math.round((maxROM.pipAngle / maxROM.totalActiveRom) * 100)}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DIP Joint (normal max ~80°):</span>
                        <span className="font-medium">{Math.round(maxROM.dipAngle)}° ({Math.round((maxROM.dipAngle / maxROM.totalActiveRom) * 100)}%)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-blue-100 p-2 rounded text-center">
                      <div className="font-medium">Normal ROM</div>
                      <div>260-280°</div>
                    </div>
                    <div className="bg-yellow-100 p-2 rounded text-center">
                      <div className="font-medium">Recorded</div>
                      <div>{Math.round(maxROM.totalActiveRom)}°</div>
                    </div>
                    <div className="bg-green-100 p-2 rounded text-center">
                      <div className="font-medium">Recovery %</div>
                      <div>{Math.round((maxROM.totalActiveRom / 270) * 100)}%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Recording Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <div className="font-medium">{(replayData.length / 30).toFixed(1)}s</div>
                </div>
                <div>
                  <span className="text-gray-600">Frames:</span>
                  <div className="font-medium">{replayData.length}</div>
                </div>
                <div>
                  <span className="text-gray-600">Frame Rate:</span>
                  <div className="font-medium">30 FPS</div>
                </div>
                <div>
                  <span className="text-gray-600">Hand Detected:</span>
                  <div className="font-medium text-green-600">100%</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}