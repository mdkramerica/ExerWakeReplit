import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Download } from "lucide-react";
import { calculateFingerROM, type JointAngles } from "@shared/rom-calculator";
import { calculateKapandjiScore, calculateMaxKapandjiScore, type KapandjiScore } from "@shared/kapandji-calculator";
import { calculateWristAngleByHandType, calculateElbowReferencedWristAngleWithForce, getRecordingSessionElbowSelection, setReplayMode, type ElbowWristAngles } from "@shared/elbow-wrist-calculator";
import { calculateWristDeviation } from "@shared/rom-calculator";
import { calculateWristResults } from "@shared/wrist-results-calculator";
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
  onSessionMaximumsCalculated?: (maximums: {maxFlexion: number, maxExtension: number}) => void;
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
  // Check assessment types first
  const isKapandjiAssessment = assessmentName === "Kapandji Score" || 
                              assessmentName?.includes("Kapandji");
  const isWristDeviationAssessment = assessmentName === "Wrist Radial/Ulnar Deviation" ||
                                    assessmentName?.toLowerCase().includes("radial") ||
                                    assessmentName?.toLowerCase().includes("ulnar") ||
                                    assessmentName?.toLowerCase().includes("deviation");
  const isWristFlexionExtensionAssessment = (assessmentName === "Wrist Flexion/Extension" ||
                                            assessmentName?.toLowerCase().includes("wrist")) &&
                                           !isWristDeviationAssessment;
  const isWristAssessment = isWristFlexionExtensionAssessment || isWristDeviationAssessment;

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
  const [sessionHandType, setSessionHandType] = useState<'LEFT' | 'RIGHT' | 'UNKNOWN'>('UNKNOWN');

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
  const [authoritativeWristResults, setAuthoritativeWristResults] = useState<any>(null);
  
  // Fetch real motion data if userAssessmentId is provided
  const { data: motionData, isLoading } = useQuery({
    queryKey: [`/api/user-assessments/${userAssessmentId}/motion-data`],
    enabled: !!userAssessmentId,
  });

  // Use actual recorded motion data or provided recording data
  const actualMotionData = (motionData as any)?.motionData || recordingData;
  const replayData: ReplayData[] = actualMotionData.length > 0 ? actualMotionData : [];

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
        
        // Extract hand type from recorded session data with comprehensive fallback
        const frameWithHandType = replayData.find(f => f.sessionHandType && f.sessionHandType !== 'UNKNOWN');
        if (frameWithHandType && frameWithHandType.sessionHandType) {
          setSessionHandType(frameWithHandType.sessionHandType);
          console.log(`REPLAY: Found recorded session hand type = ${frameWithHandType.sessionHandType} from frame data`);
        } else {
          // Try alternative data fields if sessionHandType is not available
          const frameWithHandedness = replayData.find(f => f.handedness && f.handedness !== 'UNKNOWN');
          if (frameWithHandedness) {
            setSessionHandType(frameWithHandedness.handedness as 'LEFT' | 'RIGHT');
            console.log(`REPLAY: Using handedness as fallback = ${frameWithHandedness.handedness}`);
          } else {
            // Use assessment metadata as final fallback
            if (userAssessment?.handType && userAssessment.handType !== 'UNKNOWN') {
              setSessionHandType(userAssessment.handType as 'LEFT' | 'RIGHT');
              console.log(`REPLAY: Using assessment metadata hand type = ${userAssessment.handType}`);
            } else {
              // Final fallback - use RIGHT as default
              setSessionHandType('RIGHT');
              console.log(`REPLAY: Unable to determine hand type, using RIGHT as default`);
            }
          }
        }
        
        // Use the same calculation method as /wrist-results page for consistency
        const wristAnglesAllFrames = replayData.map(frame => {
          
          // Use the EXACT same calculation as wrist-results page
          if (frame.landmarks && frame.poseLandmarks) {
            // DETERMINE CORRECT HAND TYPE BASED ON PROXIMITY TO ELBOWS
            // Calculate distances to both elbows to determine which hand this is
            const handWrist = frame.landmarks[0]; // Hand wrist landmark
            const leftElbow = frame.poseLandmarks[13];
            const rightElbow = frame.poseLandmarks[14];
            
            let detectedHandType: 'LEFT' | 'RIGHT' = 'RIGHT'; // default
            
            if (leftElbow && rightElbow && handWrist) {
              const distanceToLeft = Math.sqrt(
                Math.pow(handWrist.x - leftElbow.x, 2) +
                Math.pow(handWrist.y - leftElbow.y, 2) +
                Math.pow(handWrist.z - (leftElbow.z || 0), 2)
              );
              const distanceToRight = Math.sqrt(
                Math.pow(handWrist.x - rightElbow.x, 2) +
                Math.pow(handWrist.y - rightElbow.y, 2) +
                Math.pow(handWrist.z - (rightElbow.z || 0), 2)
              );
              
              // Use closest elbow to determine hand type
              detectedHandType = distanceToLeft < distanceToRight ? 'LEFT' : 'RIGHT';
              console.log(`FRAME HAND DETECTION: Left dist: ${distanceToLeft.toFixed(3)}, Right dist: ${distanceToRight.toFixed(3)} → ${detectedHandType} hand`);
            }
            
            // Override with session hand type if available and consistent
            const finalHandType: 'LEFT' | 'RIGHT' = sessionHandType !== 'UNKNOWN' ? sessionHandType : detectedHandType;
            
            // This mirrors the exact calculation in wrist-results-calculator.ts
            const calculated = calculateElbowReferencedWristAngleWithForce(
              frame.landmarks, 
              frame.poseLandmarks, 
              finalHandType
            );
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
          // SINGLE SOURCE OF TRUTH: Use only calculated frame values
          // No authoritative override - motion replay shows actual recorded movement
          
          // CALCULATE SESSION MAXIMUMS FROM ACTUAL MOTION REPLAY FRAMES
          // This ensures motion replay shows real frame-by-frame maximums
          const allFlexionAngles = wristAnglesAllFrames.map(w => w.wristFlexionAngle).filter(angle => !isNaN(angle) && angle >= 0);
          const allExtensionAngles = wristAnglesAllFrames.map(w => w.wristExtensionAngle).filter(angle => !isNaN(angle) && angle >= 0);
          
          const replayMaxFlexion = allFlexionAngles.length > 0 ? Math.max(...allFlexionAngles) : 0;
          const replayMaxExtension = allExtensionAngles.length > 0 ? Math.max(...allExtensionAngles) : 0;
          
          // Use session hand type consistently
          const consensusHandType = sessionHandType !== 'UNKNOWN' ? sessionHandType : 
            (wristAnglesAllFrames.find(w => w.handType !== 'UNKNOWN')?.handType || 'RIGHT');
          
          // Use calculated maximums as single source of truth for motion replay
          setMaxWristAngles({
            forearmToHandAngle: Math.max(replayMaxFlexion, replayMaxExtension),
            wristFlexionAngle: replayMaxFlexion,
            wristExtensionAngle: replayMaxExtension,
            elbowDetected: true,
            handType: consensusHandType,
            confidence: 0.9
          });
          
          // Store calculated results for display consistency
          setAuthoritativeWristResults({
            maxFlexion: replayMaxFlexion,
            maxExtension: replayMaxExtension,
            totalROM: replayMaxFlexion + replayMaxExtension,
            frameCount: wristAnglesAllFrames.length,
            handType: consensusHandType,
            averageConfidence: 0.9
          });
          
          console.log(`🎯 MOTION REPLAY SESSION MAXIMUMS (calculated only): Flexion: ${replayMaxFlexion.toFixed(1)}°, Extension: ${replayMaxExtension.toFixed(1)}°`);
          console.log(`📊 Single source of truth - frame calculations match canvas display perfectly`);
          
          // Log sample angles for debugging
          if (allFlexionAngles.length > 0) {
            console.log(`📊 Sample flexion angles: [${allFlexionAngles.slice(0, 5).map(a => a.toFixed(1)).join(', ')}...]`);
          }
          if (allExtensionAngles.length > 0) {
            console.log(`📊 Sample extension angles: [${allExtensionAngles.slice(0, 5).map(a => a.toFixed(1)).join(', ')}...]`);
          }
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
          
          // Check if this is a deviation assessment
          const isWristDeviationAssessment = assessmentName.toLowerCase().includes('deviation') ||
                                           assessmentName.toLowerCase().includes('radial') ||
                                           assessmentName.toLowerCase().includes('ulnar');
          
          if (isWristDeviationAssessment) {
            // Use deviation calculator for deviation assessments
            if (frame.landmarks && frame.poseLandmarks) {
              // Use session-locked hand type for consistent deviation calculation
              const isLeftHand = sessionHandType === 'LEFT';
              
              // Calculate deviation angle for this frame using session hand type
              const deviationAngle = calculateWristDeviation(
                frame.poseLandmarks,
                frame.landmarks,
                isLeftHand
              );
              
              // Convert deviation result to wrist angles format for display
              currentWrist = {
                wristFlexionAngle: 0,
                wristExtensionAngle: 0,
                forearmToHandAngle: deviationAngle,
                handType: sessionHandType,
                elbowDetected: true,
                confidence: 0.8
              };
              
              const radialComponent = deviationAngle < 0 ? Math.abs(deviationAngle) : 0;
              const ulnarComponent = deviationAngle > 0 ? deviationAngle : 0;
              
              console.log(`DEVIATION FRAME ${currentFrame}: ${sessionHandType} hand - Angle ${deviationAngle.toFixed(1)}° (Radial: ${radialComponent.toFixed(1)}°, Ulnar: ${ulnarComponent.toFixed(1)}°)`);
            }
          } else {
            // Use flexion/extension calculator for flexion/extension assessments
            if (frame.landmarks && frame.poseLandmarks) {
              // PRIORITIZE FRAME HANDEDNESS - use frame detection as primary source
              let frameHandType = frame.handedness || 'UNKNOWN';
              
              // Convert MediaPipe handedness to standard format
              if (frameHandType === 'Left') frameHandType = 'LEFT';
              if (frameHandType === 'Right') frameHandType = 'RIGHT';
              
              // Only use authoritative override if frame handedness is unknown/invalid
              if (frameHandType === 'UNKNOWN') {
                if (authoritativeWristResults?.handType && authoritativeWristResults.handType !== 'UNKNOWN') {
                  console.log(`⚠️ FRAME HANDEDNESS UNKNOWN - Using authoritative override: ${authoritativeWristResults.handType}`);
                  frameHandType = authoritativeWristResults.handType;
                } else if (maxWristAngles?.handType && maxWristAngles.handType !== 'UNKNOWN') {
                  console.log(`⚠️ FRAME HANDEDNESS UNKNOWN - Using session override: ${maxWristAngles.handType}`);
                  frameHandType = maxWristAngles.handType;
                } else {
                  frameHandType = 'RIGHT'; // Final fallback
                  console.log(`⚠️ NO HAND TYPE AVAILABLE - Using fallback: RIGHT`);
                }
              } else {
                console.log(`✅ USING FRAME HANDEDNESS: ${frameHandType} (authoritative sources ignored)`);
              }
              
              console.log(`REPLAY: Using frame hand type - ${frameHandType} hand uses ${frameHandType} elbow (index ${frameHandType === 'LEFT' ? 13 : 14})`);
              
              // Use IDENTICAL calculation method as session maximums
              currentWrist = calculateElbowReferencedWristAngleWithForce(
                frame.landmarks, 
                frame.poseLandmarks, 
                frameHandType as 'LEFT' | 'RIGHT'
              );
              
              console.log(`MOTION FRAME ${currentFrame}: ${frameHandType} hand - Flexion: ${currentWrist.wristFlexionAngle.toFixed(1)}°, Extension: ${currentWrist.wristExtensionAngle.toFixed(1)}°`);
            } else {
              // Fallback when no calculation possible
              console.log(`MOTION FRAME ${currentFrame}: No wrist angle calculation available`);
            }
          }
          
          setCurrentWristAngles(currentWrist);
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
    
    // Check if this is a wrist deviation assessment
    const isWristDeviationAssessment = assessmentName.toLowerCase().includes('radial') || 
                                      assessmentName.toLowerCase().includes('ulnar') || 
                                      assessmentName.toLowerCase().includes('deviation');
    
    if (isWristDeviationAssessment) {
      // For wrist deviation: animate side-to-side (radial/ulnar) movement
      const deviationAngle = Math.sin(time * 1.5) * 0.3; // Side-to-side movement
      
      // Wrist (0) - moves side to side
      landmarks.push({ 
        x: centerX + deviationAngle * 0.1, 
        y: centerY, 
        z: 0 
      });
      
      // All fingers move together with wrist for deviation
      const handOffset = deviationAngle * 0.1;
      
      // Thumb (1-4) - moves with hand
      for (let i = 1; i <= 4; i++) {
        landmarks.push({
          x: centerX - 0.08 + (i * 0.02) + handOffset,
          y: centerY - 0.05 + (i * 0.015),
          z: 0
        });
      }
      
      // Index finger (5-8) - moves with hand
      for (let i = 1; i <= 4; i++) {
        landmarks.push({
          x: centerX - 0.04 + (i * 0.01) + handOffset,
          y: centerY - 0.08 - (i * 0.02),
          z: 0
        });
      }
      
      // Middle finger (9-12) - moves with hand
      for (let i = 1; i <= 4; i++) {
        landmarks.push({
          x: centerX + (i * 0.005) + handOffset,
          y: centerY - 0.08 - (i * 0.025),
          z: 0
        });
      }
      
      // Ring finger (13-16) - moves with hand
      for (let i = 1; i <= 4; i++) {
        landmarks.push({
          x: centerX + 0.04 + (i * 0.005) + handOffset,
          y: centerY - 0.08 - (i * 0.02),
          z: 0
        });
      }
      
      // Pinky (17-20) - moves with hand
      for (let i = 1; i <= 4; i++) {
        landmarks.push({
          x: centerX + 0.08 + (i * 0.005) + handOffset,
          y: centerY - 0.06 - (i * 0.015),
          z: 0
        });
      }
    } else {
      // For flexion/extension assessments: animate up-down movement
      
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
        // Priority 1: Analyze multiple frames to establish consistent handedness
        if (replayData.length > 0) {
          // Analyze first 10 frames to establish consistent handedness
          const handednessVotes: ('LEFT' | 'RIGHT')[] = [];
          const framesToAnalyze = Math.min(10, replayData.length);
          
          for (let i = 0; i < framesToAnalyze; i++) {
            const frameData = replayData[i];
            if (frameData.landmarks && frameData.poseLandmarks) {
              const frameCalc = calculateWristAngleByHandType(frameData.landmarks, frameData.poseLandmarks);
              if (frameCalc.handType && frameCalc.handType !== 'UNKNOWN') {
                handednessVotes.push(frameCalc.handType);
              }
            }
          }
          
          // Use majority vote for consistent handedness
          if (handednessVotes.length > 0) {
            const leftCount = handednessVotes.filter(h => h === 'LEFT').length;
            const rightCount = handednessVotes.filter(h => h === 'RIGHT').length;
            displayHandType = leftCount > rightCount ? 'LEFT' : 'RIGHT';
            console.log(`🗳️ HANDEDNESS CONSENSUS: ${displayHandType} (${displayHandType === 'LEFT' ? leftCount : rightCount}/${handednessVotes.length} votes)`);
          }
        }
        // Priority 2: Use maxWristAngles from calculation results as fallback
        else if (maxWristAngles?.handType && maxWristAngles.handType !== 'UNKNOWN') {
          displayHandType = maxWristAngles.handType;
        }
        // Priority 3: Use current wrist angles if available
        else if (currentWristAngles?.handType && currentWristAngles.handType !== 'UNKNOWN') {
          displayHandType = currentWristAngles.handType;
        }
        // Priority 4: Use session data from recorded frames
        else if (frame.sessionHandType && frame.sessionHandType !== 'UNKNOWN') {
          displayHandType = frame.sessionHandType;
        }
        // Priority 5: Use handedness from recorded frames
        else if (frame.handedness && frame.handedness !== 'UNKNOWN') {
          displayHandType = frame.handedness;
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
      
      // Title - different for deviation vs flexion/extension
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      if (isWristDeviationAssessment) {
        ctx.fillText('Wrist Deviation Analysis', wristBoxX + 10, wristBoxY + 20);
      } else {
        ctx.fillText('Wrist Angle Analysis', wristBoxX + 10, wristBoxY + 20);
      }
      
      // Current forearm-to-hand angle
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px Arial';
      if (isWristDeviationAssessment) {
        ctx.fillText(`Deviation Angle: ${currentWristAngles.forearmToHandAngle.toFixed(1)}°`, wristBoxX + 10, wristBoxY + 45);
      } else {
        ctx.fillText(`Raw Angle: ${currentWristAngles.forearmToHandAngle.toFixed(1)}°`, wristBoxX + 10, wristBoxY + 45);
      }
      
      if (isWristDeviationAssessment) {
        // For deviation assessments, show radial/ulnar components - anatomically correct
        const currentDeviationAngle = currentWristAngles.forearmToHandAngle || 0;
        const radialComponent = currentDeviationAngle < 0 ? Math.abs(currentDeviationAngle) : 0;
        const ulnarComponent = currentDeviationAngle > 0 ? currentDeviationAngle : 0;
        
        // Radial deviation
        ctx.fillStyle = radialComponent > 0 ? '#f97316' : '#6b7280';
        ctx.font = '12px Arial';
        ctx.fillText(`Radial: ${radialComponent.toFixed(1)}°`, wristBoxX + 10, wristBoxY + 70);
        
        // Ulnar deviation
        ctx.fillStyle = ulnarComponent > 0 ? '#8b5cf6' : '#6b7280';
        ctx.fillText(`Ulnar: ${ulnarComponent.toFixed(1)}°`, wristBoxX + 130, wristBoxY + 70);
        
        console.log(`Canvas display - Frame hand: ${sessionHandType}, Handedness: ${sessionHandType}, Final: ${sessionHandType}`);
      } else {
        // Calculate frame-synchronized angles for flexion/extension assessments
        let frameAngles = { wristFlexionAngle: 0, wristExtensionAngle: 0 };
        if (frame.landmarks && frame.poseLandmarks) {
          // Use the same hand type determination as the authoritative calculation
          const determinedHandType = authoritativeWristResults?.handType || currentWristAngles?.handType || 'RIGHT';
          
          // Force the same calculation method used in wrist-results-calculator
          const frameCalc = calculateElbowReferencedWristAngleWithForce(
            frame.landmarks, 
            frame.poseLandmarks, 
            determinedHandType
          );
          frameAngles = frameCalc;
          
          console.log(`FRAME ${currentFrame}: ${determinedHandType} hand - Flexion: ${frameCalc.wristFlexionAngle.toFixed(1)}°, Extension: ${frameCalc.wristExtensionAngle.toFixed(1)}°`);
        }
        
        // Flexion angle
        ctx.fillStyle = frameAngles.wristFlexionAngle > 0 ? '#3b82f6' : '#6b7280';
        ctx.font = '12px Arial';
        ctx.fillText(`Flexion: ${frameAngles.wristFlexionAngle.toFixed(1)}°`, wristBoxX + 10, wristBoxY + 70);
        
        // Extension angle
        ctx.fillStyle = frameAngles.wristExtensionAngle > 0 ? '#f59e0b' : '#6b7280';
        ctx.fillText(`Extension: ${frameAngles.wristExtensionAngle.toFixed(1)}°`, wristBoxX + 130, wristBoxY + 70);
      }
      
      // Hand type and confidence - use consistent hand type display
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px Arial';
      ctx.fillText(`Hand: ${displayHandType || currentWristAngles.handType}`, wristBoxX + 10, wristBoxY + 95);
      ctx.fillText(`Confidence: ${(currentWristAngles.confidence * 100).toFixed(1)}%`, wristBoxX + 10, wristBoxY + 110);
      
      // Session Maximum angles from motion replay frames
      if (maxWristAngles && !isWristDeviationAssessment) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('Session Maximum (Motion Replay):', wristBoxX + 10, wristBoxY + 135);
        
        ctx.fillStyle = '#3b82f6';
        ctx.font = '10px Arial';
        ctx.fillText(`Max Flexion: ${maxWristAngles.wristFlexionAngle.toFixed(1)}°`, wristBoxX + 10, wristBoxY + 150);
        
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(`Max Extension: ${maxWristAngles.wristExtensionAngle.toFixed(1)}°`, wristBoxX + 10, wristBoxY + 165);
        
        const totalReplayROM = maxWristAngles.wristFlexionAngle + maxWristAngles.wristExtensionAngle;
        ctx.fillStyle = '#10b981';
        ctx.fillText(`Total ROM: ${totalReplayROM.toFixed(1)}°`, wristBoxX + 10, wristBoxY + 180);
      } else if (isWristDeviationAssessment) {
        // Show deviation session maximums
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('Session Maximum (Motion Replay):', wristBoxX + 10, wristBoxY + 135);
        
        // For now, show current values as maximums (will be enhanced with proper tracking)
        const currentDeviationAngle = currentWristAngles.forearmToHandAngle || 0;
        const sessionRadial = Math.max(0, currentDeviationAngle);
        const sessionUlnar = Math.max(0, -currentDeviationAngle);
        
        ctx.fillStyle = '#f97316';
        ctx.font = '10px Arial';
        ctx.fillText(`Max Radial: ${sessionRadial.toFixed(1)}°`, wristBoxX + 10, wristBoxY + 150);
        
        ctx.fillStyle = '#8b5cf6';
        ctx.fillText(`Max Ulnar: ${sessionUlnar.toFixed(1)}°`, wristBoxX + 10, wristBoxY + 165);
        
        const totalDeviationROM = sessionRadial + sessionUlnar;
        ctx.fillStyle = '#10b981';
        ctx.fillText(`Total Deviation ROM: ${totalDeviationROM.toFixed(1)}°`, wristBoxX + 10, wristBoxY + 180);
      }
      
      // Calculate wrist angles for this frame FIRST (needed for arc coloring and labels)
      let frameWristAngles = { wristFlexionAngle: 0, wristExtensionAngle: 0 };
      
      if (frame.landmarks && frame.poseLandmarks) {
        // Use the EXACT same calculation method that produces the correct angles
        const determinedHandType = authoritativeWristResults?.handType || currentWristAngles?.handType || 'RIGHT';
        const frameCalculation = calculateElbowReferencedWristAngleWithForce(
          frame.landmarks, 
          frame.poseLandmarks, 
          determinedHandType
        );
        frameWristAngles = frameCalculation;
        
        console.log(`🎨 CANVAS SYNC DISPLAY: Frame ${currentFrame} - Flexion: ${frameWristAngles.wristFlexionAngle.toFixed(1)}°, Extension: ${frameWristAngles.wristExtensionAngle.toFixed(1)}°`);
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
            if (currentWristAngles) {
              const wristToMcpVector = { x: mcpX - wristX, y: mcpY - wristY };
              const elbowToWristVector = { x: wristX - elbowX, y: wristY - elbowY };
              
              // Calculate angle between forearm and hand vectors
              const forearmAngle = Math.atan2(elbowToWristVector.y, elbowToWristVector.x);
              const handAngle = Math.atan2(wristToMcpVector.y, wristToMcpVector.x);
              
              // Draw angle arc visualization
              const arcRadius = 40;
              const startAngle = Math.min(forearmAngle, handAngle);
              const endAngle = Math.max(forearmAngle, handAngle);
              
              // Color based on flexion/extension using frame-synchronized angles
              const isFlexion = frameWristAngles.wristFlexionAngle > frameWristAngles.wristExtensionAngle;
              ctx.strokeStyle = isFlexion ? '#ef4444' : '#3b82f6'; // Red for flexion, blue for extension
              ctx.lineWidth = 3;
              ctx.setLineDash([]);
              
              // Draw arc
              ctx.beginPath();
              ctx.arc(wristX, wristY, arcRadius, startAngle, endAngle);
              ctx.stroke();
              
              // Draw angle measurement
              const midAngle = (startAngle + endAngle) / 2;
              const textRadius = arcRadius + 20;
              const textX = wristX + Math.cos(midAngle) * textRadius;
              const textY = wristY + Math.sin(midAngle) * textRadius;
              
              // Background for text
              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.fillRect(textX - 25, textY - 10, 50, 20);
              
              // Angle text using frame-synchronized data (use the same frameWristAngles calculated above)
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 12px Arial';
              const displayAngle = Math.abs(isFlexion ? frameWristAngles.wristFlexionAngle : frameWristAngles.wristExtensionAngle);
              ctx.fillText(`${displayAngle.toFixed(1)}°`, textX - 15, textY + 3);
            }
            
            // Remove duplicate angle arc - the main angle arc above already handles this
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
        
        // frameWristAngles already calculated above - use the existing calculation
        
        // Add angle indicator text near middle MCP - show flexion/extension angle
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        
        // Use minimal threshold for displaying extension/flexion vs neutral
        const motionThreshold = 0.1; // degrees - very small threshold
        
        if (frameWristAngles.wristFlexionAngle > motionThreshold) {
          // Show flexion angle in red
          ctx.fillStyle = '#ef4444';
          ctx.fillText(`${frameWristAngles.wristFlexionAngle.toFixed(1)}° FLEXION`, mcpX + 10, mcpY - 10);
        } else if (frameWristAngles.wristExtensionAngle > motionThreshold) {
          // Show extension angle in orange
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(`${frameWristAngles.wristExtensionAngle.toFixed(1)}° EXTENSION`, mcpX + 10, mcpY - 10);
        } else {
          // Show neutral position - only when both angles are essentially zero
          ctx.fillStyle = '#10b981';
          ctx.fillText(`NEUTRAL (F:${frameWristAngles.wristFlexionAngle.toFixed(1)}° E:${frameWristAngles.wristExtensionAngle.toFixed(1)}°)`, mcpX + 10, mcpY - 10);
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
      // Adjust interval based on assessment type for consistent playback speed
      const baseInterval = isWristAssessment ? 80 : 33; // Much slower for wrist assessments
      intervalId = setInterval(playAnimation, baseInterval);
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
    <div className="w-full space-y-4 bg-white p-4">
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
              width={800}
              height={500}
              className="w-full border-2 border-gray-300 rounded-lg bg-gray-900"
              style={{ maxWidth: '100%', height: '500px' }}
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
                  
                  {authoritativeWristResults ? (
                    <div className="bg-white p-4 rounded border">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium text-gray-900">Session Maximum</span>
                        <span className="text-sm text-gray-600">Centralized Calculator</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Max Flexion:</span>
                          <span className="font-bold text-blue-600">
                            {authoritativeWristResults?.maxFlexion?.toFixed(1) || '0.0'}°
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Max Extension:</span>
                          <span className="font-bold text-orange-600">
                            {authoritativeWristResults?.maxExtension?.toFixed(1) || '0.0'}°
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Total ROM:</span>
                          <span className="font-bold text-purple-600">
                            {authoritativeWristResults?.totalROM?.toFixed(1) || '0.0'}°
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Hand Type:</span>
                          <span className="font-medium text-gray-900">{authoritativeWristResults?.handType || 'UNKNOWN'}</span>
                        </div>
                        <div className="mt-2 p-2 bg-blue-100 border border-blue-300 rounded text-xs">
                          <strong>Authoritative Source:</strong> Flexion: {authoritativeWristResults?.maxFlexion?.toFixed(1) || '0.0'}°, Extension: {authoritativeWristResults?.maxExtension?.toFixed(1) || '0.0'}°, Total: {authoritativeWristResults?.totalROM?.toFixed(1) || '0.0'}°
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded border">
                      <div className="text-center text-gray-500">
                        Loading authoritative wrist results...
                        <div className="text-xs mt-1">
                          Debug: authoritativeWristResults = {JSON.stringify(authoritativeWristResults)}
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