import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Download } from "lucide-react";
import { calculateCurrentROM, calculateFingerROM, type JointAngles } from "@/lib/rom-calculator";
import { calculateKapandjiScore, calculateMaxKapandjiScore, type KapandjiScore } from "@shared/kapandji-calculator";
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
  const [selectedDigit, setSelectedDigit] = useState<'INDEX' | 'MIDDLE' | 'RING' | 'PINKY'>('INDEX');
  const [allDigitsROM, setAllDigitsROM] = useState<{[key: string]: JointAngles} | null>(null);
  const [kapandjiScore, setKapandjiScore] = useState<KapandjiScore | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [maxTAMFrame, setMaxTAMFrame] = useState<number>(0);
  const [minTAMFrame, setMinTAMFrame] = useState<number>(0);
  
  // Fetch real motion data if userAssessmentId is provided
  const { data: motionData, isLoading } = useQuery({
    queryKey: [`/api/user-assessments/${userAssessmentId}/motion-data`],
    enabled: !!userAssessmentId,
  });

  // Use actual recorded motion data or provided recording data
  const actualMotionData = motionData?.motionData || recordingData;
  const replayData: ReplayData[] = actualMotionData.length > 0 ? actualMotionData : [];

  // Check if this is a Kapandji assessment
  const isKapandjiAssessment = assessmentName === "Kapandji Score" || 
                              assessmentName?.includes("Kapandji");

  // Initialize frame with maximum TAM when replay data changes
  useEffect(() => {
    if (replayData.length > 0) {
      if (isKapandjiAssessment) {
        // Calculate Kapandji scores for all frames
        const kapandjiFrames = replayData.map(frame => ({
          landmarks: frame.landmarks
        }));
        
        // Calculate maximum Kapandji score across all frames
        const maxKapandji = calculateMaxKapandjiScore(kapandjiFrames);
        setKapandjiScore(maxKapandji);
        
        // Set frame to the one with the best score
        setCurrentFrame(0); // Start from beginning for Kapandji
      } else {
        // Calculate ROM for all digits and frames (existing TAM logic)
        const allFramesAllDigits = replayData.map(frame => ({
          INDEX: calculateFingerROM(frame.landmarks, 'INDEX'),
          MIDDLE: calculateFingerROM(frame.landmarks, 'MIDDLE'),
          RING: calculateFingerROM(frame.landmarks, 'RING'),
          PINKY: calculateFingerROM(frame.landmarks, 'PINKY')
        }));
        
        // Find maximum ROM for each digit across all frames
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
      
      // Find the frame indices with maximum and minimum TAM for selected digit
      const selectedDigitFrames = allFramesAllDigits.map(frame => frame[selectedDigit]);
      
      // Find max TAM frame
      const maxTamFrameIndex = selectedDigitFrames.findIndex(rom => 
        rom.totalActiveRom === maxROMByDigit[selectedDigit].totalActiveRom
      );
      
      // Find min TAM frame
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
    }
  }, [replayData, selectedDigit, isKapandjiAssessment]);

  // Update current ROM/Kapandji when frame or digit selection changes
  useEffect(() => {
    if (replayData.length > 0 && currentFrame < replayData.length) {
      const frame = replayData[currentFrame];
      if (frame.landmarks && frame.landmarks.length >= 21) {
        if (isKapandjiAssessment) {
          // Calculate current Kapandji score for this frame
          const currentKapandji = calculateKapandjiScore(frame.landmarks);
          setKapandjiScore(currentKapandji);
        } else {
          // Calculate ROM for standard assessments
          const rom = calculateFingerROM(frame.landmarks, selectedDigit);
          setCurrentROM(rom);
        }
      }
    }
  }, [currentFrame, replayData, selectedDigit, isKapandjiAssessment]);

  // Draw hand landmarks and connections on canvas
  const drawHandLandmarks = (ctx: CanvasRenderingContext2D, landmarks: Array<{x: number, y: number, z: number}>, canvasWidth: number, canvasHeight: number) => {
    if (!landmarks || landmarks.length === 0) return;

    // Determine which landmarks to show based on assessment type
    const isWristAssessment = assessmentName.toLowerCase().includes('wrist') || 
                             assessmentName.toLowerCase().includes('forearm') || 
                             assessmentName.toLowerCase().includes('pronation') || 
                             assessmentName.toLowerCase().includes('supination') ||
                             assessmentName.toLowerCase().includes('radial') ||
                             assessmentName.toLowerCase().includes('ulnar');

    if (isWristAssessment) {
      // For wrist assessments, only show key wrist and arm landmarks
      const wristLandmarks = [0]; // Wrist center
      
      // Draw only relevant landmarks for wrist movement
      ctx.fillStyle = '#ff6b35'; // Orange for wrist
      wristLandmarks.forEach((index) => {
        if (landmarks[index]) {
          const x = landmarks[index].x * canvasWidth;
          const y = landmarks[index].y * canvasHeight;
          
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add label
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.fillText('Wrist', x + 8, y + 4);
          ctx.fillStyle = '#ff6b35';
        }
      });
      
      // Draw minimal connections for wrist area only
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 2;
      // No finger connections for wrist assessments
      
    } else {
      // For finger/hand assessments (TAM, Kapandji), show only relevant landmarks
      
      const fingerLandmarkRanges = {
        'INDEX': [5, 6, 7, 8],
        'MIDDLE': [9, 10, 11, 12],
        'RING': [13, 14, 15, 16],
        'PINKY': [17, 18, 19, 20]
      };

      const activeLandmarks = fingerLandmarkRanges[selectedDigit] || [5, 6, 7, 8];
      
      // Draw wrist point
      if (landmarks[0]) {
        ctx.fillStyle = '#f44336'; // Red for wrist
        const x = landmarks[0].x * canvasWidth;
        const y = landmarks[0].y * canvasHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Draw selected finger landmarks prominently
      ctx.fillStyle = '#ffeb3b'; // Yellow for active finger
      activeLandmarks.forEach((index) => {
        if (landmarks[index]) {
          const x = landmarks[index].x * canvasWidth;
          const y = landmarks[index].y * canvasHeight;
          
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      // Draw hand connections only for the active finger
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 2;
      
      // Draw connections for selected finger only
      for (let i = 0; i < activeLandmarks.length - 1; i++) {
        const start = activeLandmarks[i];
        const end = activeLandmarks[i + 1];
        
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
      }
      
      // Connect finger base to wrist
      if (landmarks[0] && landmarks[activeLandmarks[0]]) {
        const wristX = landmarks[0].x * canvasWidth;
        const wristY = landmarks[0].y * canvasHeight;
        const fingerBaseX = landmarks[activeLandmarks[0]].x * canvasWidth;
        const fingerBaseY = landmarks[activeLandmarks[0]].y * canvasHeight;
        
        ctx.beginPath();
        ctx.moveTo(wristX, wristY);
        ctx.lineTo(fingerBaseX, fingerBaseY);
        ctx.stroke();
      }
    }
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

    // Calculate and update current ROM for this frame using selected digit
    if (frame.landmarks && frame.landmarks.length >= 21) {
      const romData = calculateFingerROM(frame.landmarks, selectedDigit);
      setCurrentROM(romData);
    }

    // Draw hand landmarks with finger highlighting
    frame.landmarks.forEach((landmark, index) => {
      const x = (1 - landmark.x) * canvas.width; // Flip horizontally to remove mirror effect
      const y = landmark.y * canvas.height;
      
      // Get active finger joint landmarks based on selected digit
      const getActiveFingerJoints = (digit: string) => {
        switch (digit) {
          case 'INDEX': return { mcp: 5, pip: 6, dip: 7, tip: 8 };
          case 'MIDDLE': return { mcp: 9, pip: 10, dip: 11, tip: 12 };
          case 'RING': return { mcp: 13, pip: 14, dip: 15, tip: 16 };
          case 'PINKY': return { mcp: 17, pip: 18, dip: 19, tip: 20 };
          default: return { mcp: 5, pip: 6, dip: 7, tip: 8 };
        }
      };
      
      const activeJoints = getActiveFingerJoints(selectedDigit);
      
      // Color-code joints to match live joint angles display
      let color = '#10b981'; // Default green for other landmarks
      let size = 4;
      
      if (index === activeJoints.mcp) {
        // MCP joint - blue to match live display
        color = '#3b82f6';
        size = 8;
      } else if (index === activeJoints.pip) {
        // PIP joint - green to match live display
        color = '#10b981';
        size = 8;
      } else if (index === activeJoints.dip) {
        // DIP joint - purple to match live display
        color = '#8b5cf6';
        size = 8;
      } else if (index === activeJoints.tip) {
        // Fingertip - orange for selected finger
        color = '#f59e0b';
        size = 6;
      } else if (index === 0) {
        // Wrist landmark
        color = '#ef4444'; // Red for wrist
        size = 5;
      }
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw hand connections with highlighted measurement path based on selected digit
    const getDigitConnections = (digit: string) => {
      switch (digit) {
        case 'INDEX': return [[5, 6], [6, 7], [7, 8]];
        case 'MIDDLE': return [[9, 10], [10, 11], [11, 12]];
        case 'RING': return [[13, 14], [14, 15], [15, 16]];
        case 'PINKY': return [[17, 18], [18, 19], [19, 20]];
        default: return [[5, 6], [6, 7], [7, 8]];
      }
    };
    const measurementConnections = getDigitConnections(selectedDigit);
    
    HAND_CONNECTIONS.forEach(([start, end]) => {
      if (frame.landmarks[start] && frame.landmarks[end]) {
        // Highlight measurement path in yellow
        const isMeasurementPath = measurementConnections.some(([s, e]) => 
          (s === start && e === end) || (s === end && e === start)
        );
        
        if (isMeasurementPath) {
          ctx.strokeStyle = '#fbbf24'; // Yellow for measurement path
          ctx.lineWidth = 4;
        } else {
          ctx.strokeStyle = '#10b981'; // Green for other connections
          ctx.lineWidth = 2;
        }
        
        ctx.beginPath();
        ctx.moveTo(
          (1 - frame.landmarks[start].x) * canvas.width,
          frame.landmarks[start].y * canvas.height
        );
        ctx.lineTo(
          (1 - frame.landmarks[end].x) * canvas.width,
          frame.landmarks[end].y * canvas.height
        );
        ctx.stroke();
      }
    });

    // Draw live ROM data overlay
    if (frame.landmarks && frame.landmarks.length >= 21) {
      const romData = calculateFingerROM(frame.landmarks, selectedDigit);
      
      // Semi-transparent background for ROM overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(canvas.width - 240, 10, 220, 120);
      
      // ROM title with selected digit
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`${selectedDigit.charAt(0) + selectedDigit.slice(1).toLowerCase()} Finger`, canvas.width - 230, 30);
      
      // Draw finger diagram indicator based on selected digit
      const getFingerLandmarks = (digit: string) => {
        switch (digit) {
          case 'INDEX': return [5, 6, 7, 8];
          case 'MIDDLE': return [9, 10, 11, 12];
          case 'RING': return [13, 14, 15, 16];
          case 'PINKY': return [17, 18, 19, 20];
          default: return [5, 6, 7, 8];
        }
      };
      
      const fingerLandmarks = getFingerLandmarks(selectedDigit);
      ctx.strokeStyle = '#ffff00'; // Yellow to match highlighted connections
      ctx.lineWidth = 3;
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
      ctx.fillText(`MCP: ${Math.round(romData.mcpAngle)}°`, canvas.width - 230, 50);
      
      // PIP Joint (green)
      ctx.fillStyle = '#10b981';
      ctx.fillText(`PIP: ${Math.round(romData.pipAngle)}°`, canvas.width - 230, 70);
      
      // DIP Joint (purple)
      ctx.fillStyle = '#8b5cf6';
      ctx.fillText(`DIP: ${Math.round(romData.dipAngle)}°`, canvas.width - 230, 90);
      
      // Total ROM (white, emphasized)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(`Total: ${Math.round(romData.totalActiveRom)}°`, canvas.width - 210, 110);
      
      // Draw angle visualization on the finger joints with matching colors
      if (frame.landmarks[5] && frame.landmarks[6] && frame.landmarks[7] && frame.landmarks[8]) {
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        
        // Draw MCP angle arc (blue to match live display)
        const mcpCenter = { x: frame.landmarks[5].x * canvas.width, y: frame.landmarks[5].y * canvas.height };
        ctx.strokeStyle = '#3b82f6'; // Blue - matches MCP in live display
        ctx.beginPath();
        ctx.arc(mcpCenter.x, mcpCenter.y, 15, 0, (romData.mcpAngle / 180) * Math.PI);
        ctx.stroke();
        
        // Draw PIP angle arc (green to match live display)
        const pipCenter = { x: frame.landmarks[6].x * canvas.width, y: frame.landmarks[6].y * canvas.height };
        ctx.strokeStyle = '#10b981'; // Green - matches PIP in live display
        ctx.beginPath();
        ctx.arc(pipCenter.x, pipCenter.y, 12, 0, (romData.pipAngle / 180) * Math.PI);
        ctx.stroke();
        
        // Draw DIP angle arc (purple to match live display)
        const dipCenter = { x: frame.landmarks[7].x * canvas.width, y: frame.landmarks[7].y * canvas.height };
        ctx.strokeStyle = '#8b5cf6'; // Purple - matches DIP in live display
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
    // Display corrected hand detection (the stored handedness might be incorrect due to mirroring)
    const correctedHand = frame.handedness === "Right" ? "Left" : frame.handedness === "Left" ? "Right" : frame.handedness;
    ctx.fillText(`Hand: ${correctedHand}`, 10, 65);

    // Draw finger measurement legend (moved up to avoid timeline scrubber)
    const legendHeight = 70;
    const legendY = canvas.height - 120; // Moved up 40px to clear timeline
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, legendY, 200, legendHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText('Finger Measurement:', 15, legendY + 20);
    
    // Color-coded legend
    ctx.fillStyle = '#ffff00'; // Yellow for active finger
    ctx.fillRect(15, legendY + 35, 10, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${selectedDigit.charAt(0) + selectedDigit.slice(1).toLowerCase()} Finger (Active)`, 30, legendY + 43);
    
    ctx.fillStyle = '#10b981'; // Green for other landmarks
    ctx.fillRect(15, legendY + 55, 10, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Other Landmarks', 30, legendY + 63);

    // Draw Kapandji scoring overlay for Kapandji assessments
    if (isKapandjiAssessment && frame.landmarks && frame.landmarks.length >= 21) {
      const currentKapandji = calculateKapandjiScore(frame.landmarks);
      
      // Draw "Beyond Palm" threshold line
      if (frame.landmarks[0] && frame.landmarks[5] && frame.landmarks[17]) {
        // Calculate palm boundary line from wrist to pinky MCP
        const wrist = frame.landmarks[0];
        const indexMcp = frame.landmarks[5];
        const pinkyMcp = frame.landmarks[17];
        
        // Calculate palm center and extend line beyond it
        const palmCenterX = (indexMcp.x + pinkyMcp.x) / 2;
        const palmCenterY = (indexMcp.y + pinkyMcp.y) / 2;
        
        // Calculate direction vector from wrist to palm center
        const dirX = palmCenterX - wrist.x;
        const dirY = palmCenterY - wrist.y;
        
        // Extend line beyond palm center
        const extensionFactor = 1.5;
        const beyondPalmX = palmCenterX + dirX * extensionFactor;
        const beyondPalmY = palmCenterY + dirY * extensionFactor;
        
        // Convert to canvas coordinates with mirroring
        const startX = (1 - palmCenterX) * canvas.width;
        const startY = palmCenterY * canvas.height;
        const endX = (1 - beyondPalmX) * canvas.width;
        const endY = beyondPalmY * canvas.height;
        
        // Draw the "Beyond Palm" threshold line
        ctx.strokeStyle = currentKapandji.details.beyondPalm ? '#10b981' : '#f59e0b';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Add label for the line
        ctx.fillStyle = currentKapandji.details.beyondPalm ? '#10b981' : '#f59e0b';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('Beyond Palm Line', endX - 50, endY - 10);
      }
      
      // Draw Kapandji score overlay in top-right corner
      const scoreBoxWidth = 250;
      const scoreBoxHeight = 180;
      const scoreBoxX = canvas.width - scoreBoxWidth - 10;
      const scoreBoxY = 10;
      
      // Background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(scoreBoxX, scoreBoxY, scoreBoxWidth, scoreBoxHeight);
      
      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('Kapandji Opposition Levels', scoreBoxX + 10, scoreBoxY + 20);
      
      // Current score
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(`Current Score: ${currentKapandji.maxScore}/10`, scoreBoxX + 10, scoreBoxY + 45);
      
      // Individual level indicators
      ctx.font = '11px Arial';
      const levels = [
        { level: 1, name: 'Index MCP', achieved: currentKapandji.details.indexMcp },
        { level: 2, name: 'Middle MCP', achieved: currentKapandji.details.middleMcp },
        { level: 3, name: 'Ring MCP', achieved: currentKapandji.details.ringMcp },
        { level: 4, name: 'Pinky MCP', achieved: currentKapandji.details.pinkyMcp },
        { level: 5, name: 'Pinky PIP', achieved: currentKapandji.details.pinkyPip },
        { level: 6, name: 'Pinky DIP', achieved: currentKapandji.details.pinkyDip },
        { level: 7, name: 'Pinky Tip', achieved: currentKapandji.details.pinkyTip },
        { level: 8, name: 'Palm Center', achieved: currentKapandji.details.palmCenter },
        { level: 9, name: 'Beyond Palm', achieved: currentKapandji.details.beyondPalm }
      ];
      
      levels.forEach((level, index) => {
        const y = scoreBoxY + 65 + (index * 12);
        
        // Level indicator circle
        ctx.beginPath();
        ctx.arc(scoreBoxX + 15, y - 3, 4, 0, 2 * Math.PI);
        ctx.fillStyle = level.achieved ? '#10b981' : '#374151';
        ctx.fill();
        
        // Level text
        ctx.fillStyle = level.achieved ? '#10b981' : '#9ca3af';
        ctx.fillText(`${level.level}. ${level.name}`, scoreBoxX + 25, y);
        
        // Achievement indicator
        if (level.achieved) {
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 10px Arial';
          ctx.fillText('✓', scoreBoxX + 220, y);
          ctx.font = '11px Arial';
        }
      });
      
      // Visual connection lines to relevant landmarks when achieved
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      
      // Highlight thumb tip (landmark 4) when touching targets
      if (currentKapandji.maxScore > 0 && frame.landmarks[4]) {
        const thumbTip = frame.landmarks[4];
        // Apply mirroring correction for proper alignment
        const thumbX = (1 - thumbTip.x) * canvas.width;
        const thumbY = thumbTip.y * canvas.height;
        
        // Static highlight circle
        ctx.beginPath();
        ctx.arc(thumbX, thumbY, 8, 0, 2 * Math.PI);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Pulsing effect for active achievement - slower, more visible pulse
        const time = Date.now() * 0.003; // Slower pulse timing
        const pulseRadius = 12 + Math.sin(time) * 4; // Bigger pulse range
        ctx.beginPath();
        ctx.arc(thumbX, thumbY, pulseRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(16, 185, 129, ${0.3 + Math.sin(time) * 0.2})`; // Varying opacity
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.setLineDash([]); // Reset line dash
    }

    // Draw timeline scrubber overlay at bottom of canvas
    const timelineHeight = 30;
    const timelineY = canvas.height - timelineHeight;
    const timelineMargin = 40;
    const timelineWidth = canvas.width - (timelineMargin * 2);
    
    // Timeline background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(timelineMargin, timelineY, timelineWidth, timelineHeight);
    
    // Timeline track
    ctx.fillStyle = '#374151';
    ctx.fillRect(timelineMargin + 5, timelineY + 10, timelineWidth - 10, 10);
    
    // Timeline progress
    const progress = replayData.length > 0 ? currentFrame / (replayData.length - 1) : 0;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(timelineMargin + 5, timelineY + 10, (timelineWidth - 10) * progress, 10);
    
    // Timeline scrubber handle
    const handleX = timelineMargin + 5 + (timelineWidth - 10) * progress;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(handleX, timelineY + 15, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Timeline markers and time display
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Arial';
    ctx.fillText(`${currentFrame + 1}/${replayData.length}`, timelineMargin + 5, timelineY + 8);
    ctx.fillText(`${((currentFrame / 30)).toFixed(1)}s`, canvas.width - timelineMargin - 35, timelineY + 8);
    
    // Draw Exer AI branding (moved up to avoid timeline)
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px Arial';
    ctx.fillText('Exer AI Motion Replay', canvas.width - 150, timelineY - 5);
  };

  const playAnimation = useCallback(() => {
    if (!isPlaying) return;

    setCurrentFrame(prev => {
      const next = prev + playbackSpeed;
      if (next >= replayData.length) {
        // Loop back to beginning instead of stopping
        return 0;
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

  // Canvas timeline scrubber interaction with drag support
  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || replayData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    // Scale mouse coordinates to canvas dimensions
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Timeline dimensions (same as in drawFrame function)
    const timelineHeight = 30;
    const timelineY = canvas.height - timelineHeight;
    const timelineMargin = 40;
    const timelineWidth = canvas.width - (timelineMargin * 2);

    // Check if click is within timeline area
    if (y >= timelineY && y <= timelineY + timelineHeight && 
        x >= timelineMargin && x <= timelineMargin + timelineWidth) {
      
      setIsDragging(true);
      setIsPlaying(false); // Pause playback when starting to drag
      
      // Calculate new frame position
      const clickPosition = (x - timelineMargin - 5) / (timelineWidth - 10);
      const newFrame = Math.max(0, Math.min(replayData.length - 1, Math.floor(clickPosition * (replayData.length - 1))));
      setCurrentFrame(newFrame);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || replayData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    // Scale mouse coordinates to canvas dimensions
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // Timeline dimensions
    const timelineHeight = 30;
    const timelineY = canvas.height - timelineHeight;
    const timelineMargin = 40;
    const timelineWidth = canvas.width - (timelineMargin * 2);

    // Handle dragging
    if (isDragging && y >= timelineY - 20 && y <= timelineY + timelineHeight + 20 && 
        x >= timelineMargin && x <= timelineMargin + timelineWidth) {
      
      // Calculate new frame position while dragging
      const dragPosition = (x - timelineMargin - 5) / (timelineWidth - 10);
      const newFrame = Math.max(0, Math.min(replayData.length - 1, Math.floor(dragPosition * (replayData.length - 1))));
      setCurrentFrame(newFrame);
    }

    // Change cursor style when hovering over timeline
    if (y >= timelineY && y <= timelineY + timelineHeight && 
        x >= timelineMargin && x <= timelineMargin + timelineWidth) {
      canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
    } else {
      canvas.style.cursor = 'default';
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  // Global mouse up handler to stop dragging even if mouse leaves canvas
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 bg-white p-6 min-h-screen">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-gray-900">
            <span className="text-gray-900 font-bold">Motion Replay: {assessmentName}</span>
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
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
            />
            
            {/* Control Panel - Responsive Design */}
            <div className="bg-white border border-gray-300 p-4 rounded-lg space-y-4">
              {/* Main Controls Row */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Play Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handlePlay}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-md transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </Button>
                  
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

            {/* Timeline Scrubber */}
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2 text-sm text-gray-800">
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
                <div className="flex justify-between mt-1 text-xs text-gray-800">
                  <span>0s</span>
                  <span>{(replayData.length / 30 / 4).toFixed(1)}s</span>
                  <span>{(replayData.length / 30 / 2).toFixed(1)}s</span>
                  <span>{(replayData.length / 30 * 3/4).toFixed(1)}s</span>
                  <span>{(replayData.length / 30).toFixed(1)}s</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-3 text-xs text-gray-800">
                <span>Drag to navigate • Click anywhere on timeline to jump</span>
                <span>30 FPS</span>
              </div>
            </div>

            {/* Live ROM Data Display - only show for TAM assessments, not Kapandji */}
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
                        <span className="font-medium text-gray-900">{digit.charAt(0) + digit.slice(1).toLowerCase()} Finger</span>
                        <span className="font-bold text-lg text-gray-900">{Math.round(rom.totalActiveRom)}° TAM</span>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}