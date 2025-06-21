import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Download } from "lucide-react";
import { calculateCurrentROM, calculateFingerROM, type JointAngles } from "@/lib/rom-calculator";
import { calculateKapandjiScore, calculateMaxKapandjiScore, type KapandjiScore } from "@shared/kapandji-calculator";
import { calculateWristAngleByHandType, getRecordingSessionElbowSelection, setReplayMode, type ElbowWristAngles } from "@shared/elbow-wrist-calculator";
// Remove the import since we'll load the image directly

interface ReplayData {
  timestamp: number;
  landmarks: Array<{x: number, y: number, z: number}>;
  poseLandmarks?: Array<{x: number, y: number, z: number, visibility?: number}>;
  handedness: string;
  sessionHandType?: 'LEFT' | 'RIGHT' | 'UNKNOWN';
  sessionElbowIndex?: number;
  sessionWristIndex?: number;
  sessionElbowLocked?: boolean;
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

  // Get assessment data for hand type information
  const { data: assessmentData } = useQuery({
    queryKey: [`/api/user-assessments/${userAssessmentId}/details`],
    enabled: !!userAssessmentId
  });
  
  const userAssessment = (assessmentData as any)?.userAssessment;
  const [isDragging, setIsDragging] = useState(false);
  const [maxTAMFrame, setMaxTAMFrame] = useState<number>(0);
  const [minTAMFrame, setMinTAMFrame] = useState<number>(0);
  const [isolateMode, setIsolateMode] = useState(false);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  
  // Wrist-specific state variables
  const [currentWristAngles, setCurrentWristAngles] = useState<ElbowWristAngles | null>(null);
  const [maxWristAngles, setMaxWristAngles] = useState<ElbowWristAngles | null>(null);
  
  // Fetch real motion data if userAssessmentId is provided
  const { data: motionData, isLoading } = useQuery({
    queryKey: [`/api/user-assessments/${userAssessmentId}/motion-data`],
    enabled: !!userAssessmentId,
  });

  // Use actual recorded motion data or provided recording data
  const actualMotionData = (motionData as any)?.motionData || recordingData;
  const replayData: ReplayData[] = actualMotionData.length > 0 ? actualMotionData : [];

  // Check assessment types
  const isKapandjiAssessment = assessmentName === "Kapandji Score" || 
                              assessmentName?.includes("Kapandji");
  const isWristAssessment = assessmentName === "Wrist Flexion/Extension" ||
                           assessmentName?.toLowerCase().includes("wrist");

  // Load Exer logo image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogoImage(img);
    img.src = '/images/exer-logo.png';
  }, []);

  // Initialize frame with maximum TAM when replay data changes
  useEffect(() => {
    if (replayData.length > 0) {
      // Enable replay mode to prevent session state modification
      setReplayMode(true);
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
      } else if (isWristAssessment) {
        // Use recorded session data instead of recalculating to preserve hand type
        let sessionHandType: 'LEFT' | 'RIGHT' | 'UNKNOWN' = 'UNKNOWN';
        
        // Extract hand type from recorded session data with comprehensive fallback
        const frameWithHandType = replayData.find(f => f.sessionHandType && f.sessionHandType !== 'UNKNOWN');
        if (frameWithHandType) {
          sessionHandType = frameWithHandType.sessionHandType;
          console.log(`REPLAY: Found recorded session hand type = ${sessionHandType} from frame data`);
        } else {
          // Try alternative data fields if sessionHandType is not available
          const frameWithHandedness = replayData.find(f => f.handedness && f.handedness !== 'UNKNOWN');
          if (frameWithHandedness) {
            sessionHandType = frameWithHandedness.handedness as 'LEFT' | 'RIGHT';
            console.log(`REPLAY: Using handedness as fallback = ${sessionHandType}`);
          } else {
            // Use assessment metadata as final fallback
            if (userAssessment?.handType && userAssessment.handType !== 'UNKNOWN') {
              sessionHandType = userAssessment.handType as 'LEFT' | 'RIGHT';
              console.log(`REPLAY: Using assessment metadata hand type = ${sessionHandType}`);
            } else {
              // Analyze recorded wrist angles to determine hand type
              const framesWithWristAngles = replayData.filter(f => f.wristAngles?.handType && f.wristAngles.handType !== 'UNKNOWN');
              if (framesWithWristAngles.length > 0) {
                const leftCount = framesWithWristAngles.filter(f => f.wristAngles.handType === 'LEFT').length;
                const rightCount = framesWithWristAngles.filter(f => f.wristAngles.handType === 'RIGHT').length;
                sessionHandType = leftCount > rightCount ? 'LEFT' : 'RIGHT';
                console.log(`REPLAY: Determined hand type from wrist angles = ${sessionHandType} (Left: ${leftCount}, Right: ${rightCount})`);
              }
            }
          }
        }
        
        // Force session hand type for ALL frames - use recorded data when available
        const wristAnglesAllFrames = replayData.map(frame => {
          // Always use recorded wrist angles if available
          if (frame.wristAngles && frame.wristAngles.elbowDetected) {
            const result = { ...frame.wristAngles };
            result.handType = sessionHandType !== 'UNKNOWN' ? sessionHandType : 'RIGHT';
            return result;
          }
          
          // Fallback: calculate fresh if no recorded data (shouldn't happen in replay)
          if (frame.landmarks && frame.poseLandmarks) {
            const calculated = calculateWristAngleByHandType(frame.landmarks, frame.poseLandmarks);
            calculated.handType = sessionHandType !== 'UNKNOWN' ? sessionHandType : 'RIGHT';
            return calculated;
          }
          
          // Last resort fallback
          return {
            forearmToHandAngle: 90,
            wristFlexionAngle: 0,
            wristExtensionAngle: 0,
            elbowDetected: true,
            handType: sessionHandType !== 'UNKNOWN' ? sessionHandType : 'RIGHT',
            confidence: 0.8
          };
        }).filter(Boolean);
        
        console.log(`REPLAY: Processed ${wristAnglesAllFrames.length} frames with forced hand type = ${sessionHandType}`);
        
        if (wristAnglesAllFrames.length > 0) {
          // Find maximum wrist angles - capture all positive angles
          const allFlexionAngles = wristAnglesAllFrames.map(w => w!.wristFlexionAngle).filter(angle => !isNaN(angle) && angle >= 0);
          const allExtensionAngles = wristAnglesAllFrames.map(w => w!.wristExtensionAngle).filter(angle => !isNaN(angle) && angle >= 0);
          const allForearmAngles = wristAnglesAllFrames.map(w => w!.forearmToHandAngle).filter(angle => !isNaN(angle));
          
          const maxFlexion = allFlexionAngles.length > 0 ? Math.max(...allFlexionAngles) : 0;
          const maxExtension = allExtensionAngles.length > 0 ? Math.max(...allExtensionAngles) : 0;
          const maxForearmAngle = allForearmAngles.length > 0 ? Math.max(...allForearmAngles) : 0;
          
          console.log(`REPLAY MAXIMUM ANALYSIS:`);
          console.log(`  - Flexion angles found: ${allFlexionAngles.length}, Max: ${maxFlexion.toFixed(1)}°`);
          console.log(`  - Extension angles found: ${allExtensionAngles.length}, Max: ${maxExtension.toFixed(1)}°`);
          console.log(`  - Total frames analyzed: ${wristAnglesAllFrames.length}`);
          console.log(`  - Raw angle range: ${Math.min(...allForearmAngles).toFixed(1)}° to ${maxForearmAngle.toFixed(1)}°`);
          
          // Prioritize recorded session hand type over calculation results
          const finalHandType = sessionHandType !== 'UNKNOWN' ? sessionHandType : wristAnglesAllFrames[0]!.handType;
          
          setMaxWristAngles({
            forearmToHandAngle: maxForearmAngle,
            wristFlexionAngle: maxFlexion,
            wristExtensionAngle: maxExtension,
            elbowDetected: true,
            handType: finalHandType,
            confidence: Math.max(...wristAnglesAllFrames.map(w => w!.confidence))
          });
          
          console.log(`REPLAY: MaxWristAngles set with recorded session hand type = ${finalHandType} (recorded: ${sessionHandType}, calculated: ${wristAnglesAllFrames[0]?.handType})`);
        }
        setCurrentFrame(0);
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

  // Cleanup replay mode when component unmounts
  useEffect(() => {
    return () => {
      setReplayMode(false);
    };
  }, []);

  // Auto-start playback when replay data is loaded
  useEffect(() => {
    if (replayData.length > 0 && !isPlaying) {
      // Start from beginning for better user experience
      setCurrentFrame(0);
      
      // Draw the initial frame immediately
      setTimeout(() => {
        drawFrame(0);
        // Start autoplay after ensuring canvas is rendered
        setTimeout(() => {
          setIsPlaying(true);
        }, 800);
      }, 200);
    }
  }, [replayData.length]); // Remove currentFrame dependency to avoid loops

  // Update current ROM/Kapandji when frame or digit selection changes
  useEffect(() => {
    if (replayData.length > 0 && currentFrame < replayData.length) {
      const frame = replayData[currentFrame];
      if (frame.landmarks && frame.landmarks.length >= 21) {
        if (isKapandjiAssessment) {
          // Calculate current Kapandji score for this frame
          const currentKapandji = calculateKapandjiScore(frame.landmarks);
          setKapandjiScore(currentKapandji);
        } else if (isWristAssessment) {
          // Use recorded session hand type consistently
          let currentWrist = {
            forearmToHandAngle: 90,
            wristFlexionAngle: 0,
            wristExtensionAngle: 0,
            elbowDetected: true,
            handType: 'UNKNOWN' as 'LEFT' | 'RIGHT' | 'UNKNOWN',
            confidence: 0.8
          };
          
          // Priority 1: Use recorded wrist angles with session hand type
          if (frame.wristAngles && frame.wristAngles.elbowDetected) {
            currentWrist = { ...frame.wristAngles };
          } else if (frame.landmarks && frame.poseLandmarks) {
            // Calculate fresh if no recorded data
            currentWrist = calculateWristAngleByHandType(frame.landmarks, frame.poseLandmarks);
          }
          
          // Force recorded session hand type with fallback chain
          if (maxWristAngles?.handType && maxWristAngles.handType !== 'UNKNOWN') {
            currentWrist.handType = maxWristAngles.handType;
            console.log(`WRIST FRAME ${currentFrame}: Using maxWristAngles session hand type = ${maxWristAngles.handType}`);
          } else if (frame.sessionHandType && frame.sessionHandType !== 'UNKNOWN') {
            currentWrist.handType = frame.sessionHandType;
            console.log(`WRIST FRAME ${currentFrame}: Using frame session hand type = ${frame.sessionHandType}`);
          } else if (frame.handedness && frame.handedness !== 'UNKNOWN') {
            currentWrist.handType = frame.handedness as 'LEFT' | 'RIGHT';
            console.log(`WRIST FRAME ${currentFrame}: Using frame handedness = ${frame.handedness}`);
          }
          
          setCurrentWristAngles(currentWrist);
          console.log(`WRIST FRAME ${currentFrame}: Final hand type = ${currentWrist.handType}, Elbow used = ${currentWrist.handType === 'LEFT' ? 'LEFT (13)' : 'RIGHT (14)'}`);
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
      // For finger/hand assessments (TAM, Kapandji), show all 21 landmarks
      
      const fingerLandmarkRanges = {
        'INDEX': [5, 6, 7, 8],
        'MIDDLE': [9, 10, 11, 12],
        'RING': [13, 14, 15, 16],
        'PINKY': [17, 18, 19, 20]
      };

      const activeLandmarks = fingerLandmarkRanges[selectedDigit] || [5, 6, 7, 8];
      
      // Define all hand connections (MediaPipe standard)
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

      // Draw all hand connections
      ctx.strokeStyle = '#ffeb3b'; // Yellow for connections
      ctx.lineWidth = 2;
      connections.forEach(([start, end]) => {
        if (landmarks[start] && landmarks[end]) {
          const startX = (1 - landmarks[start].x) * canvasWidth; // Mirror X coordinate
          const startY = landmarks[start].y * canvasHeight;
          const endX = (1 - landmarks[end].x) * canvasWidth; // Mirror X coordinate
          const endY = landmarks[end].y * canvasHeight;
          
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      });
      
      // Draw all 21 landmarks
      for (let index = 0; index < landmarks.length && index < 21; index++) {
        const landmark = landmarks[index];
        if (!landmark) continue;
        
        const x = (1 - landmark.x) * canvasWidth; // Mirror X coordinate for display
        const y = landmark.y * canvasHeight;

        // Set different colors for different landmark types
        if (activeLandmarks.includes(index)) {
          ctx.fillStyle = '#ffeb3b'; // Yellow for active finger
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
        } else if (index === 0) {
          ctx.fillStyle = '#f44336'; // Red for wrist
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          ctx.fillStyle = '#4caf50'; // Green for other landmarks
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
      
      // Connect finger base to wrist
      if (landmarks[0] && landmarks[activeLandmarks[0]]) {
        const wristX = (1 - landmarks[0].x) * canvasWidth; // Mirror X coordinate
        const wristY = landmarks[0].y * canvasHeight;
        const fingerBaseX = (1 - landmarks[activeLandmarks[0]].x) * canvasWidth; // Mirror X coordinate
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

    // Draw Exer logo in top-right corner
    if (logoImage) {
      const logoWidth = 120;
      const logoHeight = 40;
      const logoX = canvas.width - logoWidth - 10;
      const logoY = 10;
      
      // Draw semi-transparent background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(logoX - 5, logoY - 5, logoWidth + 10, logoHeight + 10);
      
      // Draw the logo image
      ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
    }

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

    // Draw all 21 hand landmarks with special highlighting for active finger
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
    const activeLandmarks = [activeJoints.mcp, activeJoints.pip, activeJoints.dip, activeJoints.tip]; // Active finger joints
    
    // Define connections based on isolation mode
    let connections;
    let visibleLandmarks;
    
    if (isolateMode) {
      // Show only selected finger + thumb + wrist-to-MCP connections
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
        // Show all wrist-to-MCP connections
        [0, 5], [0, 9], [0, 13], [0, 17]
      ];
      
      // Define visible landmarks for isolation mode
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
      // Show all connections (existing behavior)
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
    
    ctx.lineWidth = 2;
    connections.forEach(([start, end]) => {
      if (frame.landmarks[start] && frame.landmarks[end]) {
        const startX = frame.landmarks[start].x * canvas.width;
        const startY = frame.landmarks[start].y * canvas.height;
        const endX = frame.landmarks[end].x * canvas.width;
        const endY = frame.landmarks[end].y * canvas.height;
        
        // Color connections: yellow for active finger, green for others
        const isActiveFinger = activeLandmarks.includes(start) && activeLandmarks.includes(end);
        ctx.strokeStyle = isActiveFinger ? '#ffeb3b' : '#4caf50'; // Yellow for active finger, green for others
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });
    
    frame.landmarks.forEach((landmark, index) => {
      // Only draw visible landmarks based on isolation mode
      if (!visibleLandmarks.includes(index)) return;
      
      const x = landmark.x * canvas.width; // Natural orientation for wrist analysis
      const y = landmark.y * canvas.height;
      
      // Color-code landmarks for all 21 hand points
      let color = '#4caf50'; // Default green for other landmarks
      let size = 4;
      
      if (activeLandmarks.includes(index)) {
        // Active finger landmarks - yellow/bright colors
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
        // Wrist landmark
        color = '#ef4444'; // Red for wrist
        size = 5;
      }
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw only the finger measurement connections (no scattered connections)
    const getDigitConnections = (digit: string) => {
      switch (digit) {
        case 'INDEX': return [[0, 5], [5, 6], [6, 7], [7, 8]]; // Wrist to MCP, then finger joints
        case 'MIDDLE': return [[0, 9], [9, 10], [10, 11], [11, 12]];
        case 'RING': return [[0, 13], [13, 14], [14, 15], [15, 16]];
        case 'PINKY': return [[0, 17], [17, 18], [18, 19], [19, 20]];
        default: return [[0, 5], [5, 6], [6, 7], [7, 8]];
      }
    };
    const measurementConnections = getDigitConnections(selectedDigit);
    
    // Only draw the measurement path connections
    measurementConnections.forEach(([start, end]) => {
      if (frame.landmarks[start] && frame.landmarks[end]) {
        // Yellow for measurement path
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        
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

    // For Kapandji assessments, only highlight thumb landmarks (no ROM data)
    if (isKapandjiAssessment && frame.landmarks && frame.landmarks.length >= 21) {
      // Draw thumb connections in yellow
      const thumbConnections = [[0, 1], [1, 2], [2, 3], [3, 4]]; // Wrist to thumb joints
      
      thumbConnections.forEach(([start, end]) => {
        if (frame.landmarks[start] && frame.landmarks[end]) {
          ctx.strokeStyle = '#fbbf24'; // Yellow for thumb
          ctx.lineWidth = 4;
          
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
    }

    // Draw timestamp and quality info
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText(`Frame: ${frameIndex + 1}/${replayData.length}`, 10, 25);
    ctx.fillText(`Quality: ${Math.round(frame.quality)}%`, 10, 45);
    // Display hand detection - get from assessment data if frame data is missing
    let displayHandType = frame.sessionHandType || frame.handedness;
    
    // If still unknown, determine from assessment metadata or overall session
    if (!displayHandType || displayHandType === 'UNKNOWN') {
      // For wrist assessments, prioritize calculation results over display logic
      if (isWristAssessment) {
        // Priority 1: Use maxWristAngles from calculation results
        if (maxWristAngles?.handType && maxWristAngles.handType !== 'UNKNOWN') {
          displayHandType = maxWristAngles.handType;
        }
        // Priority 2: Use current wrist angles if available
        else if (currentWristAngles?.handType && currentWristAngles.handType !== 'UNKNOWN') {
          displayHandType = currentWristAngles.handType;
        }
        // Priority 3: Use session data from recorded frames
        else if (frame.sessionHandType && frame.sessionHandType !== 'UNKNOWN') {
          displayHandType = frame.sessionHandType;
        }
        // Priority 4: Use handedness from recorded frames
        else if (frame.handedness && frame.handedness !== 'UNKNOWN') {
          displayHandType = frame.handedness;
        }
        // Priority 5: Check all frames for consistent hand type
        else {
          const allHandTypes = replayData
            .map(f => f.sessionHandType || f.handedness)
            .filter(h => h && h !== 'UNKNOWN');
          
          if (allHandTypes.length > 0) {
            const leftCount = allHandTypes.filter(h => h === 'LEFT' || h === 'Left').length;
            const rightCount = allHandTypes.filter(h => h === 'RIGHT' || h === 'Right').length;
            displayHandType = leftCount > rightCount ? 'LEFT' : 'RIGHT';
          }
        }
      } 
      // For non-wrist assessments, use existing logic
      else if (userAssessment?.handType && userAssessment.handType !== 'UNKNOWN') {
        displayHandType = userAssessment.handType;
      } else {
        // Check all frames for hand type information
        const allHandTypes = replayData
          .map(f => f.sessionHandType || f.handedness)
          .filter(h => h && h !== 'UNKNOWN');
        
        if (allHandTypes.length > 0) {
          // Use most common hand type
          const leftCount = allHandTypes.filter(h => h === 'LEFT' || h === 'Left').length;
          const rightCount = allHandTypes.filter(h => h === 'RIGHT' || h === 'Right').length;
          displayHandType = leftCount > rightCount ? 'LEFT' : 'RIGHT';
        } else {
          // Last resort fallback
          displayHandType = 'RIGHT';
        }
      }
    }
    
    console.log(`Canvas display - Frame hand: ${frame.sessionHandType}, Handedness: ${frame.handedness}, Final: ${displayHandType}`);
    ctx.fillText(`Hand: ${(displayHandType || 'LEFT').toUpperCase()}`, 10, 65);



    // No legend for Kapandji assessments - keep display clean

    // Draw Kapandji scoring overlay for Kapandji assessments
    if (isKapandjiAssessment && frame.landmarks && frame.landmarks.length >= 21) {
      const currentKapandji = calculateKapandjiScore(frame.landmarks);
      

      
      // Draw Kapandji score overlay in bottom-right corner, above Exer AI branding
      const scoreBoxWidth = 250;
      const scoreBoxHeight = 180;
      const scoreBoxX = canvas.width - scoreBoxWidth - 10;
      const scoreBoxY = canvas.height - scoreBoxHeight - 60; // 60px above bottom for timeline and branding
      
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
        { level: 1, name: 'Index Proximal', achieved: currentKapandji.details.indexProximalPhalanx },
        { level: 2, name: 'Index Middle', achieved: currentKapandji.details.indexMiddlePhalanx },
        { level: 3, name: 'Index Tip', achieved: currentKapandji.details.indexTip },
        { level: 4, name: 'Middle Tip', achieved: currentKapandji.details.middleTip },
        { level: 5, name: 'Ring Tip', achieved: currentKapandji.details.ringTip },
        { level: 6, name: 'Little Tip', achieved: currentKapandji.details.littleTip },
        { level: 7, name: 'Little DIP', achieved: currentKapandji.details.littleDipCrease },
        { level: 8, name: 'Little PIP', achieved: currentKapandji.details.littlePipCrease },
        { level: 9, name: 'Little MCP', achieved: currentKapandji.details.littleMcpCrease },
        { level: 10, name: 'Distal Crease', achieved: currentKapandji.details.distalPalmarCrease }
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
        
        // Use proper coordinates without extra mirroring since landmarks are already in correct space
        const thumbX = thumbTip.x * canvas.width;
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
    
    // Draw wrist angle information for wrist assessments
    if (isWristAssessment && currentWristAngles) {
      const wristBoxX = 20;
      const wristBoxY = canvas.height - 200;
      const wristBoxWidth = 260;
      const wristBoxHeight = 180;
      
      // Semi-transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(wristBoxX, wristBoxY, wristBoxWidth, wristBoxHeight);
      
      // Border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(wristBoxX, wristBoxY, wristBoxWidth, wristBoxHeight);
      
      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('Wrist Angle Analysis', wristBoxX + 10, wristBoxY + 20);
      
      // Current forearm-to-hand angle
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`Raw Angle: ${currentWristAngles.forearmToHandAngle.toFixed(1)}°`, wristBoxX + 10, wristBoxY + 45);
      
      // Flexion angle
      ctx.fillStyle = currentWristAngles.wristFlexionAngle > 0 ? '#3b82f6' : '#6b7280';
      ctx.font = '12px Arial';
      ctx.fillText(`Flexion: ${currentWristAngles.wristFlexionAngle.toFixed(1)}°`, wristBoxX + 10, wristBoxY + 70);
      
      // Extension angle
      ctx.fillStyle = currentWristAngles.wristExtensionAngle > 0 ? '#f59e0b' : '#6b7280';
      ctx.fillText(`Extension: ${currentWristAngles.wristExtensionAngle.toFixed(1)}°`, wristBoxX + 130, wristBoxY + 70);
      
      // Hand type and confidence
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px Arial';
      ctx.fillText(`Hand: ${currentWristAngles.handType}`, wristBoxX + 10, wristBoxY + 95);
      ctx.fillText(`Confidence: ${(currentWristAngles.confidence * 100).toFixed(1)}%`, wristBoxX + 10, wristBoxY + 110);
      
      // Maximum angles (if available)
      if (maxWristAngles) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('Session Maximum:', wristBoxX + 10, wristBoxY + 135);
        
        ctx.fillStyle = '#3b82f6';
        ctx.font = '10px Arial';
        ctx.fillText(`Max Flexion: ${maxWristAngles.wristFlexionAngle.toFixed(1)}°`, wristBoxX + 10, wristBoxY + 150);
        
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`Max Extension: ${maxWristAngles.wristExtensionAngle.toFixed(1)}°`, wristBoxX + 10, wristBoxY + 165);
      }
      
      // Visual angle indicator with elbow and forearm line
      if (frame.landmarks && frame.landmarks.length >= 21 && frame.poseLandmarks) {
        const wrist = frame.landmarks[0]; // Wrist landmark
        const middleMcp = frame.landmarks[9]; // Middle finger MCP
        
        const wristX = wrist.x * canvas.width;
        const wristY = wrist.y * canvas.height;
        const mcpX = middleMcp.x * canvas.width;
        const mcpY = middleMcp.y * canvas.height;
        
        // Draw elbow and forearm line if pose landmarks available
        if (frame.poseLandmarks && frame.poseLandmarks.length > 15) {
          // Use hand type from current wrist analysis for consistent elbow tracking
          const sessionHandType = currentWristAngles?.handType || frame.sessionHandType || frame.handedness;
          
          // USE IDENTICAL SESSION-LOCKED ELBOW SELECTION: Match calculation exactly
          // Get the exact same elbow selection that was locked during recording
          const sessionElbowData = getRecordingSessionElbowSelection();
          let elbowIndex: number;
          let wristIndex: number;
          
          // FORCE EXACT MATCH WITH CALCULATION: Use RIGHT elbow for RIGHT hand
          // PRIORITY 1: Always use stored session elbow data if available (from recording)
          if (frame.sessionElbowLocked && frame.sessionElbowIndex !== undefined) {
            elbowIndex = frame.sessionElbowIndex;
            wristIndex = frame.sessionWristIndex || (frame.sessionElbowIndex === 13 ? 15 : 16);
            const elbowSide = elbowIndex === 13 ? 'LEFT' : 'RIGHT';
            console.log(`REPLAY: Using recorded session elbow - ${elbowSide} elbow (index ${elbowIndex})`);
          } 
          // PRIORITY 2: Use hand type from actual wrist calculation results
          else if (currentWristAngles && currentWristAngles.handType !== 'UNKNOWN') {
            const useRightElbow = currentWristAngles.handType === 'RIGHT';
            elbowIndex = useRightElbow ? 14 : 13;
            wristIndex = useRightElbow ? 16 : 15;
            console.log(`REPLAY: Using calculation hand type - ${currentWristAngles.handType} hand uses ${useRightElbow ? 'RIGHT' : 'LEFT'} elbow (index ${elbowIndex})`);
          }
          // PRIORITY 3: Fall back to frame hand type data
          else {
            const frameHandType = frame.sessionHandType || frame.handedness;
            const useRightElbow = frameHandType === 'RIGHT';
            elbowIndex = useRightElbow ? 14 : 13;
            wristIndex = useRightElbow ? 16 : 15;
            console.log(`REPLAY: Using frame hand type - ${frameHandType} hand uses ${useRightElbow ? 'RIGHT' : 'LEFT'} elbow (index ${elbowIndex})`);
          }
          
          const selectedElbow = frame.poseLandmarks[elbowIndex];
          const selectedPoseWrist = frame.poseLandmarks[wristIndex];
          
          // Remove the problematic console log that references undefined variable
          
          if (selectedElbow && selectedPoseWrist && (selectedElbow.visibility || 1) > 0.5) {
            const elbowX = selectedElbow.x * canvas.width;
            const elbowY = selectedElbow.y * canvas.height;
            const poseWristX = selectedPoseWrist.x * canvas.width;
            const poseWristY = selectedPoseWrist.y * canvas.height;
            
            // Draw forearm line (elbow to base of hand)
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(elbowX, elbowY);
            ctx.lineTo(wristX, wristY);
            ctx.stroke();
            
            // Draw infinite reference line (elbow-wrist baseline extended)
            const referenceVector = {
              x: wristX - elbowX,
              y: wristY - elbowY
            };
            const referenceLength = Math.sqrt(referenceVector.x**2 + referenceVector.y**2);
            
            if (referenceLength > 0) {
              // Normalize the reference vector
              const normalizedRef = {
                x: referenceVector.x / referenceLength,
                y: referenceVector.y / referenceLength
              };
              
              // Extend the line across the entire canvas
              const extensionLength = Math.max(canvas.width, canvas.height) * 2;
              const startX = elbowX - normalizedRef.x * extensionLength;
              const startY = elbowY - normalizedRef.y * extensionLength;
              const endX = elbowX + normalizedRef.x * extensionLength;
              const endY = elbowY + normalizedRef.y * extensionLength;
              
              // Draw infinite reference line
              ctx.strokeStyle = '#fbbf24'; // Yellow
              ctx.lineWidth = 2;
              ctx.setLineDash([8, 4]); // Dashed pattern
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(endX, endY);
              ctx.stroke();
              ctx.setLineDash([]); // Reset dash pattern
            }
            
            // Highlight elbow point
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(elbowX, elbowY, 10, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add elbow label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('ELBOW', elbowX - 25, elbowY - 15);
            
            // Draw wrist-to-hand vector (hand vector)
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(wristX, wristY);
            ctx.lineTo(mcpX, mcpY);
            ctx.stroke();
            
            // Draw infinite reference vectors as dashed yellow lines
            // 1. Forearm vector: from elbow through hand wrist, extended infinitely
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
              
              // Extend forearm line across entire canvas
              const extensionLength = Math.max(canvas.width, canvas.height) * 2;
              const forearmStartX = elbowX - normalizedForearm.x * extensionLength;
              const forearmStartY = elbowY - normalizedForearm.y * extensionLength;
              const forearmEndX = elbowX + normalizedForearm.x * extensionLength;
              const forearmEndY = elbowY + normalizedForearm.y * extensionLength;
              
              ctx.strokeStyle = '#fbbf24'; // Yellow
              ctx.lineWidth = 2;
              ctx.setLineDash([8, 4]); // Dashed pattern
              ctx.beginPath();
              ctx.moveTo(forearmStartX, forearmStartY);
              ctx.lineTo(forearmEndX, forearmEndY);
              ctx.stroke();
            }
            
            // 2. Hand vector: from wrist through middle MCP, extended infinitely
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
              
              // Extend hand line across entire canvas
              const extensionLength = Math.max(canvas.width, canvas.height) * 2;
              const handStartX = wristX - normalizedHand.x * extensionLength;
              const handStartY = wristY - normalizedHand.y * extensionLength;
              const handEndX = wristX + normalizedHand.x * extensionLength;
              const handEndY = wristY + normalizedHand.y * extensionLength;
              
              ctx.strokeStyle = '#fbbf24'; // Yellow
              ctx.lineWidth = 2;
              ctx.setLineDash([6, 6]); // Different dash pattern for hand vector
              ctx.beginPath();
              ctx.moveTo(handStartX, handStartY);
              ctx.lineTo(handEndX, handEndY);
              ctx.stroke();
            }
            
            ctx.setLineDash([]); // Reset dash pattern
            
            // Highlight wrist point
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(wristX, wristY, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add wrist label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('WRIST', wristX - 20, wristY - 15);
            
            // Draw angle arc to visualize wrist flexion/extension
            const wristToMcpVector = { x: mcpX - wristX, y: mcpY - wristY };
            const elbowToWristVector = { x: poseWristX - elbowX, y: poseWristY - elbowY };
            
            // Calculate angle between forearm and hand vectors
            const forearmAngle = Math.atan2(elbowToWristVector.y, elbowToWristVector.x);
            const handAngle = Math.atan2(wristToMcpVector.y, wristToMcpVector.x);
            let angleArc = handAngle - forearmAngle;
            
            // Normalize angle to [-π, π]
            while (angleArc > Math.PI) angleArc -= 2 * Math.PI;
            while (angleArc < -Math.PI) angleArc += 2 * Math.PI;
            
            // Draw angle arc for wrist flexion/extension
            if (currentWristAngles.wristFlexionAngle > 0 || currentWristAngles.wristExtensionAngle > 0) {
              const arcRadius = 50;
              let startAngle = forearmAngle;
              let endAngle = handAngle;
              
              // Ensure proper arc direction
              if (Math.abs(endAngle - startAngle) > Math.PI) {
                if (endAngle > startAngle) {
                  endAngle -= 2 * Math.PI;
                } else {
                  endAngle += 2 * Math.PI;
                }
              }
              
              ctx.beginPath();
              ctx.arc(wristX, wristY, arcRadius, startAngle, endAngle, false);
              
              if (currentWristAngles.wristFlexionAngle > 0) {
                ctx.strokeStyle = '#ec4899'; // Pink for flexion
                ctx.lineWidth = 4;
              } else if (currentWristAngles.wristExtensionAngle > 0) {
                ctx.strokeStyle = '#f59e0b'; // Orange for extension
                ctx.lineWidth = 4;
              }
              ctx.stroke();
              
              // Add angle value on the arc
              const midAngle = (startAngle + endAngle) / 2;
              const textRadius = arcRadius + 15;
              const textX = wristX + Math.cos(midAngle) * textRadius;
              const textY = wristY + Math.sin(midAngle) * textRadius;
              
              ctx.fillStyle = currentWristAngles.wristFlexionAngle > 0 ? '#ec4899' : '#f59e0b';
              ctx.font = 'bold 14px Arial';
              const angleText = currentWristAngles.wristFlexionAngle > 0 
                ? `${currentWristAngles.wristFlexionAngle.toFixed(1)}°`
                : `${currentWristAngles.wristExtensionAngle.toFixed(1)}°`;
              ctx.fillText(angleText, textX - 15, textY);
            }
          } else {
            // Draw wrist-to-hand vector even without elbow
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(wristX, wristY);
            ctx.lineTo(mcpX, mcpY);
            ctx.stroke();
            
            // Highlight wrist point
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(wristX, wristY, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add wrist label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('WRIST', wristX - 20, wristY - 15);
          }
        }
        
        // Add angle indicator text near middle MCP - show flexion/extension angle
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        
        if (currentWristAngles.wristFlexionAngle > 0) {
          // Show flexion angle in red
          ctx.fillStyle = '#ef4444';
          ctx.fillText(`${currentWristAngles.wristFlexionAngle.toFixed(1)}° FLEXION`, mcpX + 10, mcpY - 10);
        } else if (currentWristAngles.wristExtensionAngle > 0) {
          // Show extension angle in orange
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(`${currentWristAngles.wristExtensionAngle.toFixed(1)}° EXTENSION`, mcpX + 10, mcpY - 10);
        } else {
          // Show neutral position
          ctx.fillStyle = '#10b981';
          ctx.fillText('NEUTRAL', mcpX + 10, mcpY - 10);
        }
      }
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

  // Draw initial frame when canvas is ready
  useEffect(() => {
    if (replayData.length > 0) {
      drawFrame(currentFrame);
    }
  }, [replayData, canvasRef.current]);

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
                  {!isWristAssessment && (
                    <>
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
                    </>
                  )}
                  
                  {isWristAssessment && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-gray-900">View Mode:</label>
                      <span className="px-3 py-2 bg-blue-100 text-blue-800 rounded-md font-medium text-sm">
                        Wrist Analysis
                      </span>
                    </div>
                  )}
                  
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

            {/* Wrist Assessment Data */}
            {isWristAssessment && currentWristAngles && (
              <div className="bg-gray-100 border border-gray-200 p-4 rounded-lg">
                <h4 className="font-medium mb-3 text-gray-900">Wrist Angle Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded border">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium text-gray-900">Current Frame</span>
                      <span className="text-sm text-gray-600">Frame {currentFrame + 1}</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Raw Angle:</span>
                        <span className="font-bold text-green-600">{currentWristAngles.forearmToHandAngle.toFixed(1)}°</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Flexion:</span>
                        <span className={`font-bold ${currentWristAngles.wristFlexionAngle > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                          {currentWristAngles.wristFlexionAngle.toFixed(1)}°
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Extension:</span>
                        <span className={`font-bold ${currentWristAngles.wristExtensionAngle > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                          {currentWristAngles.wristExtensionAngle.toFixed(1)}°
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Hand Type:</span>
                        <span className="font-medium text-gray-900">{currentWristAngles.handType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Confidence:</span>
                        <span className="font-medium text-gray-900">{(currentWristAngles.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {maxWristAngles && (
                    <div className="bg-white p-4 rounded border">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium text-gray-900">Session Maximum</span>
                        <span className="text-sm text-gray-600">Best Performance</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Max Raw Angle:</span>
                          <span className="font-bold text-green-600">{maxWristAngles.forearmToHandAngle.toFixed(1)}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Max Flexion:</span>
                          <span className="font-bold text-blue-600">{maxWristAngles.wristFlexionAngle.toFixed(1)}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Max Extension:</span>
                          <span className="font-bold text-orange-600">{maxWristAngles.wristExtensionAngle.toFixed(1)}°</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="text-xs text-gray-600">Clinical Normal Ranges:</div>
                          <div className="text-xs text-gray-600">Flexion: 0-80° | Extension: 0-70°</div>
                        </div>
                      </div>
                    </div>
                  )}
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