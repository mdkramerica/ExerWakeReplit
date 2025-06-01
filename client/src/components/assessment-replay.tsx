import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Download } from "lucide-react";
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

export default function AssessmentReplay({ assessmentName, recordingData = [], onClose }: AssessmentReplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const animationRef = useRef<number | null>(null);
  
  // Generate sample replay data if none provided (for demonstration)
  const sampleData: ReplayData[] = recordingData.length > 0 ? recordingData : 
    Array.from({ length: 180 }, (_, i) => {
      const time = i / 30; // 30 FPS simulation
      const waveX = Math.sin(time * 0.5) * 0.1 + 0.5;
      const waveY = Math.cos(time * 0.3) * 0.1 + 0.4;
      
      return {
        timestamp: Date.now() + i * 33,
        landmarks: generateHandLandmarks(waveX, waveY, time),
        handedness: "Right",
        quality: 85 + Math.random() * 10
      };
    });

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

    const frame = sampleData[frameIndex];
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

    // Draw hand landmarks
    ctx.fillStyle = '#10b981';
    frame.landmarks.forEach((landmark, index) => {
      const x = landmark.x * canvas.width;
      const y = landmark.y * canvas.height;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Draw landmark numbers
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText(index.toString(), x + 6, y - 6);
      ctx.fillStyle = '#10b981';
    });

    // Draw hand connections
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

    // Draw timestamp and quality info
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText(`Frame: ${frameIndex + 1}/${sampleData.length}`, 10, 25);
    ctx.fillText(`Quality: ${Math.round(frame.quality)}%`, 10, 45);
    ctx.fillText(`Hand: ${frame.handedness}`, 10, 65);

    // Draw Exer AI branding
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px Arial';
    ctx.fillText('Exer AI Motion Replay', canvas.width - 150, canvas.height - 10);
  };

  const playAnimation = () => {
    if (!isPlaying) return;

    setCurrentFrame(prev => {
      const next = prev + playbackSpeed;
      if (next >= sampleData.length) {
        setIsPlaying(false);
        return sampleData.length - 1;
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
      duration: sampleData.length / 30,
      frames: sampleData.length,
      exportedAt: new Date().toISOString(),
      data: sampleData
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

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Recording Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <div className="font-medium">{(sampleData.length / 30).toFixed(1)}s</div>
                </div>
                <div>
                  <span className="text-gray-600">Frames:</span>
                  <div className="font-medium">{sampleData.length}</div>
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