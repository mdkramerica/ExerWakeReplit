import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import ExerAIHandler from "@/components/mediapipe-handler";
import { calculateCurrentROM, type JointAngles } from "@/lib/rom-calculator";

export default function JointTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [currentROM, setCurrentROM] = useState<JointAngles>({ mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 });

  const handleMediaPipeUpdate = (data: any) => {
    setHandDetected(data.handDetected);
    
    if (data.landmarks && data.landmarks.length >= 21) {
      setLandmarks(data.landmarks);
      
      try {
        const romData = calculateCurrentROM(data.landmarks);
        setCurrentROM(romData);
        drawHandWithJoints(data.landmarks, romData);
      } catch (error) {
        console.error('ROM calculation error:', error);
      }
    }
  };

  const drawHandWithJoints = (handLandmarks: any[], romData: JointAngles) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all landmarks as small circles
    ctx.fillStyle = '#6b7280';
    handLandmarks.forEach((landmark, index) => {
      const x = landmark.x * canvas.width;
      const y = landmark.y * canvas.height;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
      
      // Label each landmark
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText(index.toString(), x + 5, y - 5);
      ctx.fillStyle = '#6b7280';
    });

    // Highlight index finger joints (5, 6, 7, 8)
    const indexFingerPoints = [5, 6, 7, 8];
    
    // Draw index finger bones with different colors
    ctx.lineWidth = 3;
    
    // Proximal phalanx (5-6) - Red
    if (handLandmarks[5] && handLandmarks[6]) {
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo((1 - handLandmarks[5].x) * canvas.width, handLandmarks[5].y * canvas.height);
      ctx.lineTo((1 - handLandmarks[6].x) * canvas.width, handLandmarks[6].y * canvas.height);
      ctx.stroke();
      
      // Label MCP angle (calculated from 0-5-6) - unmirror coordinates
      const midX = (1 - (handLandmarks[5].x + handLandmarks[6].x) / 2) * canvas.width;
      const midY = (handLandmarks[5].y + handLandmarks[6].y) / 2 * canvas.height;
      ctx.fillStyle = '#ef4444';
      ctx.font = '12px Arial';
      ctx.fillText(`MCP: ${romData.mcpAngle.toFixed(1)}°`, midX + 10, midY);
    }
    
    // Middle phalanx (6-7) - Green
    if (handLandmarks[6] && handLandmarks[7]) {
      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      ctx.moveTo((1 - handLandmarks[6].x) * canvas.width, handLandmarks[6].y * canvas.height);
      ctx.lineTo((1 - handLandmarks[7].x) * canvas.width, handLandmarks[7].y * canvas.height);
      ctx.stroke();
      
      // Label PIP angle (calculated from 5-6-7) - unmirror coordinates
      const midX = (1 - (handLandmarks[6].x + handLandmarks[7].x) / 2) * canvas.width;
      const midY = (handLandmarks[6].y + handLandmarks[7].y) / 2 * canvas.height;
      ctx.fillStyle = '#10b981';
      ctx.font = '12px Arial';
      ctx.fillText(`PIP: ${romData.pipAngle.toFixed(1)}°`, midX + 10, midY);
    }
    
    // Distal phalanx (7-8) - Blue
    if (handLandmarks[7] && handLandmarks[8]) {
      ctx.strokeStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo((1 - handLandmarks[7].x) * canvas.width, handLandmarks[7].y * canvas.height);
      ctx.lineTo((1 - handLandmarks[8].x) * canvas.width, handLandmarks[8].y * canvas.height);
      ctx.stroke();
      
      // Label DIP angle (calculated from 6-7-8) - unmirror coordinates
      const midX = (1 - (handLandmarks[7].x + handLandmarks[8].x) / 2) * canvas.width;
      const midY = (handLandmarks[7].y + handLandmarks[8].y) / 2 * canvas.height;
      ctx.fillStyle = '#3b82f6';
      ctx.font = '12px Arial';
      ctx.fillText(`DIP: ${romData.dipAngle.toFixed(1)}°`, midX + 10, midY);
    }

    // Highlight the anatomical landmarks - unmirror coordinates
    indexFingerPoints.forEach((pointIndex, i) => {
      if (handLandmarks[pointIndex]) {
        const x = (1 - handLandmarks[pointIndex].x) * canvas.width;
        const y = handLandmarks[pointIndex].y * canvas.height;
        
        // Different colors for different anatomical points
        const colors = ['#ef4444', '#f97316', '#10b981', '#3b82f6'];
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Anatomically correct labels
        const labels = ['MCP Joint (5)', 'PIP Joint (6)', 'DIP Joint (7)', 'Fingertip (8)'];
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px Arial';
        ctx.fillText(labels[i], x + 8, y + 3);
      }
    });

    // Draw angle arcs to visualize the calculations with correct reference points
    drawAngleArc(ctx, handLandmarks, 0, 5, 6, '#ef4444', 'MCP'); // MCP angle: 0-5-6
    drawAngleArc(ctx, handLandmarks, 5, 6, 7, '#10b981', 'PIP'); // PIP angle: 5-6-7
    drawAngleArc(ctx, handLandmarks, 6, 7, 8, '#3b82f6', 'DIP'); // DIP angle: 6-7-8
  };

  const drawAngleArc = (ctx: CanvasRenderingContext2D, landmarks: any[], p1: number, p2: number, p3: number, color: string, label: string) => {
    if (!landmarks[p1] || !landmarks[p2] || !landmarks[p3]) return;
    
    const center = {
      x: (1 - landmarks[p2].x) * ctx.canvas.width,
      y: landmarks[p2].y * ctx.canvas.height
    };
    
    const point1 = {
      x: (1 - landmarks[p1].x) * ctx.canvas.width,
      y: landmarks[p1].y * ctx.canvas.height
    };
    
    const point3 = {
      x: (1 - landmarks[p3].x) * ctx.canvas.width,
      y: landmarks[p3].y * ctx.canvas.height
    };
    
    // Calculate angle vectors
    const v1 = { x: point1.x - center.x, y: point1.y - center.y };
    const v2 = { x: point3.x - center.x, y: point3.y - center.y };
    
    const angle1 = Math.atan2(v1.y, v1.x);
    const angle2 = Math.atan2(v2.y, v2.x);
    
    // Draw arc
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, 20, angle1, angle2);
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 640;
      canvas.height = 480;
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/assessments">
          <Button variant="outline" className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Assessments</span>
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Joint Angle Test & Visualization</CardTitle>
          <p className="text-gray-600">
            Live visualization of hand joints and ROM calculations for debugging
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Camera View */}
            <div>
              <h3 className="text-lg font-medium mb-3">Live Camera Feed</h3>
              <div className="bg-gray-900 rounded-xl aspect-video relative overflow-hidden">
                <ExerAIHandler
                  onUpdate={handleMediaPipeUpdate}
                  isRecording={false}
                  assessmentType="Joint Test"
                />
              </div>
            </div>

            {/* Joint Visualization */}
            <div>
              <h3 className="text-lg font-medium mb-3">Joint Analysis</h3>
              <canvas
                ref={canvasRef}
                className="w-full bg-gray-900 rounded-xl"
                style={{ maxHeight: '360px' }}
              />
            </div>
          </div>

          {/* ROM Data Display */}
          <div className="mt-6 grid md:grid-cols-4 gap-4">
            <Card className="bg-red-50">
              <CardContent className="p-4">
                <div className="text-red-700 font-medium">MCP Joint</div>
                <div className="text-2xl font-bold text-red-900">
                  {currentROM.mcpAngle.toFixed(1)}°
                </div>
                <div className="text-xs text-red-600">Metacarpophalangeal</div>
                <div className="text-xs text-red-600 mt-1">Normal: 0-90°</div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50">
              <CardContent className="p-4">
                <div className="text-green-700 font-medium">PIP Joint</div>
                <div className="text-2xl font-bold text-green-900">
                  {currentROM.pipAngle.toFixed(1)}°
                </div>
                <div className="text-xs text-green-600">Proximal Interphalangeal</div>
                <div className="text-xs text-green-600 mt-1">Normal: 0-100°</div>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-50">
              <CardContent className="p-4">
                <div className="text-blue-700 font-medium">DIP Joint</div>
                <div className="text-2xl font-bold text-blue-900">
                  {currentROM.dipAngle.toFixed(1)}°
                </div>
                <div className="text-xs text-blue-600">Distal Interphalangeal</div>
                <div className="text-xs text-blue-600 mt-1">Normal: 0-90°</div>
              </CardContent>
            </Card>
            
            <Card className="bg-orange-50">
              <CardContent className="p-4">
                <div className="text-orange-700 font-medium">Total Active ROM</div>
                <div className="text-2xl font-bold text-orange-900">
                  {currentROM.totalActiveRom.toFixed(1)}°
                </div>
                <div className="text-xs text-orange-600">Combined Range</div>
                <div className="text-xs text-orange-600 mt-1">Normal: 200-280°</div>
              </CardContent>
            </Card>
          </div>

          {/* Debug Information */}
          <div className="mt-6 bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Debug Information</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div><strong>Hand Detected:</strong> {handDetected ? 'Yes' : 'No'}</div>
                <div><strong>Landmarks Count:</strong> {landmarks.length}</div>
                <div><strong>Index Finger Points:</strong> 5, 6, 7, 8</div>
              </div>
              <div>
                <div><strong>MCP Angle:</strong> Between points 0-5-6</div>
                <div><strong>PIP Angle:</strong> Between points 5-6-7</div>
                <div><strong>DIP Angle:</strong> Between points 6-7-8</div>
              </div>
            </div>
            
            {landmarks.length >= 21 && (
              <div className="mt-3">
                <div className="text-xs text-gray-600">Index Finger Landmarks:</div>
                <div className="grid grid-cols-4 gap-2 mt-1 text-xs font-mono">
                  <div>P5: ({landmarks[5]?.x.toFixed(3)}, {landmarks[5]?.y.toFixed(3)})</div>
                  <div>P6: ({landmarks[6]?.x.toFixed(3)}, {landmarks[6]?.y.toFixed(3)})</div>
                  <div>P7: ({landmarks[7]?.x.toFixed(3)}, {landmarks[7]?.y.toFixed(3)})</div>
                  <div>P8: ({landmarks[8]?.x.toFixed(3)}, {landmarks[8]?.y.toFixed(3)})</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}