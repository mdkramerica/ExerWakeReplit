export interface JointAngles {
  mcpAngle: number;
  pipAngle: number;
  dipAngle: number;
  totalActiveRom: number;
  // Extension deficit tracking
  mcpExtensionDeficit?: number;
  pipExtensionDeficit?: number;
  dipExtensionDeficit?: number;
  // Raw flexion values before deficit adjustment
  mcpFlexion?: number;
  pipFlexion?: number;
  dipFlexion?: number;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number; // MediaPipe visibility score (0-1)
}

// Temporal consistency tracking
export interface TemporalROMData {
  fingerType: 'INDEX' | 'MIDDLE' | 'RING' | 'PINKY';
  romHistory: number[];
  lastValidROM: number;
  consistentFrameCount: number;
  isTemporallyValid: boolean;
  temporalQuality: number;
}

export interface TemporalValidationConfig {
  maxROMChangePerFrame: number;
  consistencyFrameCount: number;
  smoothingWindowSize: number;
  minValidFrames: number;
  temporalQualityThreshold: number;
}

// Temporal validation configuration
const TEMPORAL_CONFIG: TemporalValidationConfig = {
  maxROMChangePerFrame: 30,     // degrees
  consistencyFrameCount: 3,     // frames
  smoothingWindowSize: 5,       // frames
  minValidFrames: 10,           // minimum frames for assessment
  temporalQualityThreshold: 0.8 // quality score threshold
};

// Visibility-based validation configuration
const VISIBILITY_CONFIG = {
  minLandmarkVisibility: 0.7,   // MediaPipe visibility threshold
  minFingerVisibility: 0.8,     // Average finger visibility required
  bypassTemporalIfVisible: true // Skip temporal validation for clearly visible fingers
};

// MediaPipe hand landmark indices for each finger
const FINGER_LANDMARKS = {
  INDEX: {
    MCP: [0, 5, 6],   // MCP angle: wrist (0) -> MCP joint (5) -> PIP joint (6)
    PIP: [5, 6, 7],   // PIP angle: MCP joint (5) -> PIP joint (6) -> DIP joint (7)
    DIP: [6, 7, 8],   // DIP angle: PIP joint (6) -> DIP joint (7) -> fingertip (8)
  },
  MIDDLE: {
    MCP: [0, 9, 10],  // MCP angle: wrist (0) -> MCP joint (9) -> PIP joint (10)
    PIP: [9, 10, 11], // PIP angle: MCP joint-PIP joint-DIP joint (9-10-11)
    DIP: [10, 11, 12], // DIP angle: PIP joint-DIP joint-fingertip (10-11-12)
  },
  RING: {
    MCP: [0, 13, 14], // MCP angle: wrist (0) -> MCP joint (13) -> PIP joint (14)
    PIP: [13, 14, 15], // PIP angle: MCP joint-PIP joint-DIP joint (13-14-15)
    DIP: [14, 15, 16], // DIP angle: PIP joint-DIP joint-fingertip (14-15-16)
  },
  PINKY: {
    MCP: [0, 17, 18], // MCP angle: wrist (0) -> MCP joint (17) -> PIP joint (18)
    PIP: [17, 18, 19], // PIP angle: MCP joint-PIP joint-DIP joint (17-18-19)
    DIP: [18, 19, 20], // DIP angle: PIP joint-DIP joint-fingertip (18-19-20)
  }
};

// Calculate joint angle between three points
// Returns angle with proper sign: positive for flexion, negative for hyperextension
function calculateJointAngle(p1: HandLandmark, p2: HandLandmark, p3: HandLandmark): number {
  // Vector from p2 to p1 (proximal segment)
  const v1 = {
    x: p1.x - p2.x,
    y: p1.y - p2.y,
    z: p1.z - p2.z
  };
  
  // Vector from p2 to p3 (distal segment)
  const v2 = {
    x: p3.x - p2.x,
    y: p3.y - p2.y,
    z: p3.z - p2.z
  };
  
  // Calculate dot product
  const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  
  // Calculate magnitudes
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  
  // Avoid division by zero
  if (mag1 === 0 || mag2 === 0) return 0;
  
  // Calculate cosine of angle
  const cosAngle = dotProduct / (mag1 * mag2);
  
  // Clamp to [-1, 1] to avoid NaN from floating point errors
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  
  // Calculate angle in radians then convert to degrees
  const angleRad = Math.acos(clampedCos);
  const totalAngle = (angleRad * 180) / Math.PI;
  
  // Convert to flexion/extension angle: 180° = straight (0°), smaller angles = flexion, larger = hyperextension
  const jointAngle = 180 - totalAngle;
  
  return jointAngle;
}

// Calculate flexion angle (ensures non-negative, ignores hyperextension)
function calculateFlexionAngle(p1: HandLandmark, p2: HandLandmark, p3: HandLandmark): number {
  const jointAngle = calculateJointAngle(p1, p2, p3);
  // Only return positive flexion angles, ignore hyperextension
  return Math.max(0, jointAngle);
}

// Calculate extension deficit (how far short of 0° extension)
function calculateExtensionDeficit(allAngles: number[]): number {
  // Find the minimum angle (closest to full extension)
  const minAngle = Math.min(...allAngles);
  
  // If minimum angle is positive, there's an extension deficit
  // If negative (hyperextension), no deficit
  return Math.max(0, minAngle);
}

// Temporal consistency validation
export function validateTemporalConsistency(
  currentROM: number, 
  previousROMs: number[]
): boolean {
  if (previousROMs.length === 0) return true;
  
  const lastROM = previousROMs[previousROMs.length - 1];
  const change = Math.abs(currentROM - lastROM);
  
  return change <= TEMPORAL_CONFIG.maxROMChangePerFrame;
}

// Apply smoothing filter to ROM values
export function applySmoothingFilter(romHistory: number[]): number {
  if (romHistory.length === 0) return 0;
  
  const windowSize = Math.min(TEMPORAL_CONFIG.smoothingWindowSize, romHistory.length);
  const recentValues = romHistory.slice(-windowSize);
  
  return recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
}

// Validate ROM over multiple frames for consistency
export function requireConsistentFrames(
  currentROM: number,
  romHistory: number[]
): { isValid: boolean; quality: number } {
  if (romHistory.length < TEMPORAL_CONFIG.consistencyFrameCount) {
    return { isValid: true, quality: 0.5 }; // Insufficient data, allow but low quality
  }
  
  const recentROMs = romHistory.slice(-TEMPORAL_CONFIG.consistencyFrameCount);
  const variations = recentROMs.map(rom => Math.abs(rom - currentROM));
  const maxVariation = Math.max(...variations);
  const avgVariation = variations.reduce((sum, val) => sum + val, 0) / variations.length;
  
  const isValid = maxVariation <= TEMPORAL_CONFIG.maxROMChangePerFrame;
  const quality = Math.max(0, 1 - (avgVariation / TEMPORAL_CONFIG.maxROMChangePerFrame));
  
  return { isValid, quality };
}

// Check if finger is clearly visible based on landmark visibility
export function assessFingerVisibility(landmarks: HandLandmark[], fingerType: 'INDEX' | 'MIDDLE' | 'RING' | 'PINKY'): {
  isVisible: boolean;
  avgVisibility: number;
  reason: string;
} {
  const finger = FINGER_LANDMARKS[fingerType];
  const allIndices = [...finger.MCP, ...finger.PIP, ...finger.DIP];
  
  // Get unique landmark indices for this finger
  const uniqueIndices: number[] = [];
  allIndices.forEach(idx => {
    if (uniqueIndices.indexOf(idx) === -1) {
      uniqueIndices.push(idx);
    }
  });
  
  let totalVisibility = 0;
  let visibleLandmarks = 0;
  
  uniqueIndices.forEach(idx => {
    const landmark = landmarks[idx];
    if (landmark && landmark.visibility !== undefined) {
      totalVisibility += landmark.visibility;
      if (landmark.visibility >= VISIBILITY_CONFIG.minLandmarkVisibility) {
        visibleLandmarks++;
      }
    } else {
      // If no visibility data, assume visible (fallback for older data)
      totalVisibility += 1;
      visibleLandmarks++;
    }
  });
  
  const avgVisibility = totalVisibility / uniqueIndices.length;
  const visibilityRatio = visibleLandmarks / uniqueIndices.length;
  
  const isVisible = avgVisibility >= VISIBILITY_CONFIG.minFingerVisibility && visibilityRatio >= 0.8;
  
  const reason = isVisible 
    ? `Clearly visible (${(avgVisibility * 100).toFixed(1)}% avg visibility)`
    : `Poor visibility (${(avgVisibility * 100).toFixed(1)}% avg visibility, ${visibleLandmarks}/${uniqueIndices.length} landmarks visible)`;
  
  return { isVisible, avgVisibility, reason };
}

// Calculate temporal quality score
export function calculateTemporalQuality(romHistory: number[]): number {
  if (romHistory.length < 2) return 0.5;
  
  let totalVariation = 0;
  let validTransitions = 0;
  
  for (let i = 1; i < romHistory.length; i++) {
    const change = Math.abs(romHistory[i] - romHistory[i-1]);
    totalVariation += change;
    if (change <= TEMPORAL_CONFIG.maxROMChangePerFrame) {
      validTransitions++;
    }
  }
  
  const avgVariation = totalVariation / (romHistory.length - 1);
  const transitionQuality = validTransitions / (romHistory.length - 1);
  const smoothnessQuality = Math.max(0, 1 - (avgVariation / TEMPORAL_CONFIG.maxROMChangePerFrame));
  
  return (transitionQuality + smoothnessQuality) / 2;
}

// Calculate joint angles for a specific finger with temporal validation
export function calculateFingerROM(landmarks: HandLandmark[], fingerType: 'INDEX' | 'MIDDLE' | 'RING' | 'PINKY'): JointAngles {
  const finger = FINGER_LANDMARKS[fingerType];
  
  // Check if landmarks have confidence data attached
  const fingerConfidences = (landmarks as any).fingerConfidences;
  const confidence = fingerConfidences ? fingerConfidences[fingerType] : null;
  
  // Apply confidence threshold - only calculate if tracking is reliable
  const CONFIDENCE_THRESHOLD = 0.7; // 70% confidence required
  if (confidence && confidence.confidence < CONFIDENCE_THRESHOLD) {
    console.log(`${fingerType} finger tracking unreliable (${Math.round(confidence.confidence * 100)}%): ${confidence.reason}, movement: ${confidence.movement?.toFixed(4)}`);
    return {
      mcpAngle: 0,
      pipAngle: 0,
      dipAngle: 0,
      totalActiveRom: 0,
      mcpExtensionDeficit: 0,
      pipExtensionDeficit: 0,
      dipExtensionDeficit: 0,
      mcpFlexion: 0,
      pipFlexion: 0,
      dipFlexion: 0
    };
  }
  
  // Calculate raw joint angles (can be positive for flexion, negative for hyperextension)
  // MCP: wrist (0) -> MCP joint (5) -> PIP joint (6)
  const mcpRawAngle = calculateJointAngle(
    landmarks[finger.MCP[0]], // wrist (0)
    landmarks[finger.MCP[1]], // MCP joint (5)
    landmarks[finger.MCP[2]]  // PIP joint (6)
  );
  
  // PIP: MCP joint (5) -> PIP joint (6) -> DIP joint (7)
  const pipRawAngle = calculateJointAngle(
    landmarks[finger.PIP[0]], // MCP joint (5)
    landmarks[finger.PIP[1]], // PIP joint (6)
    landmarks[finger.PIP[2]]  // DIP joint (7)
  );
  
  // DIP: PIP joint (6) -> DIP joint (7) -> fingertip (8)
  const dipRawAngle = calculateJointAngle(
    landmarks[finger.DIP[0]], // PIP joint (6)
    landmarks[finger.DIP[1]], // DIP joint (7)
    landmarks[finger.DIP[2]]  // fingertip (8)
  );
  
  // Get flexion angles (positive values only, ignore hyperextension)
  const mcpFlexion = Math.max(0, mcpRawAngle);
  const pipFlexion = Math.max(0, pipRawAngle);
  const dipFlexion = Math.max(0, dipRawAngle);
  
  // Calculate extension deficits (cannot reach 0° extension)
  // If raw angle is positive at minimum position, there's an extension deficit
  const mcpExtensionDeficit = Math.max(0, mcpRawAngle > 0 ? mcpRawAngle : 0);
  const pipExtensionDeficit = Math.max(0, pipRawAngle > 0 ? pipRawAngle : 0);
  const dipExtensionDeficit = Math.max(0, dipRawAngle > 0 ? dipRawAngle : 0);
  
  // TAM calculation: Flexion ROM minus extension deficits
  const mcpAngle = Math.max(0, mcpFlexion - mcpExtensionDeficit);
  const pipAngle = Math.max(0, pipFlexion - pipExtensionDeficit);
  const dipAngle = Math.max(0, dipFlexion - dipExtensionDeficit);
  
  // Total active range of motion (clinical TAM)
  const totalActiveRom = mcpAngle + pipAngle + dipAngle;
  
  if (confidence) {
    console.log(`${fingerType} ROM calculated with ${Math.round(confidence.confidence * 100)}% confidence: TAM=${Math.round(totalActiveRom)}°`);
  }
  
  return {
    mcpAngle: Math.round(mcpAngle * 100) / 100, // Round to 2 decimal places
    pipAngle: Math.round(pipAngle * 100) / 100,
    dipAngle: Math.round(dipAngle * 100) / 100,
    totalActiveRom: Math.round(totalActiveRom * 100) / 100,
    mcpExtensionDeficit: Math.round(mcpExtensionDeficit * 100) / 100,
    pipExtensionDeficit: Math.round(pipExtensionDeficit * 100) / 100,
    dipExtensionDeficit: Math.round(dipExtensionDeficit * 100) / 100,
    mcpFlexion: Math.round(mcpFlexion * 100) / 100,
    pipFlexion: Math.round(pipFlexion * 100) / 100,
    dipFlexion: Math.round(dipFlexion * 100) / 100
  };
}

// Calculate max ROM for all fingers with temporal validation
export function calculateAllFingersMaxROM(motionFrames: Array<{landmarks: HandLandmark[]}>): {
  index: JointAngles;
  middle: JointAngles;
  ring: JointAngles;
  pinky: JointAngles;
  temporalQuality: {[key: string]: number};
} {
  const fingers: ('INDEX' | 'MIDDLE' | 'RING' | 'PINKY')[] = ['INDEX', 'MIDDLE', 'RING', 'PINKY'];
  const maxROMByFinger: any = {};
  const temporalQuality: {[key: string]: number} = {};

  fingers.forEach(finger => {
    // Track both flexion and extension angles for TAM calculation
    const mcpFlexionAngles: number[] = [];
    const pipFlexionAngles: number[] = [];
    const dipFlexionAngles: number[] = [];
    const mcpRawAngles: number[] = [];
    const pipRawAngles: number[] = [];
    const dipRawAngles: number[] = [];
    const romHistory: number[] = [];
    
    // Assess overall finger visibility across all frames
    const visibilityAssessments = motionFrames.map(frame => 
      frame.landmarks && frame.landmarks.length >= 21 
        ? assessFingerVisibility(frame.landmarks, finger)
        : { isVisible: false, avgVisibility: 0, reason: 'No landmarks' }
    );
    
    const visibleFrames = visibilityAssessments.filter(v => v.isVisible).length;
    const totalFrames = visibilityAssessments.length;
    const overallVisibilityRatio = visibleFrames / totalFrames;
    
    // Determine if finger is consistently well-visible (bypass temporal validation)
    const isClearlyVisible = overallVisibilityRatio >= 0.8; // 80% of frames must be clearly visible
    
    console.log(`${finger} finger visibility assessment: ${visibleFrames}/${totalFrames} frames clearly visible (${(overallVisibilityRatio * 100).toFixed(1)}%) - ${isClearlyVisible ? 'BYPASSING temporal validation' : 'APPLYING temporal validation'}`);
    
    // Process each frame to collect flexion and extension data
    motionFrames.forEach((frame, frameIndex) => {
      if (frame.landmarks && frame.landmarks.length >= 21) {
        const fingerLandmarks = FINGER_LANDMARKS[finger];
        
        // Calculate raw joint angles (can be positive for flexion, negative for hyperextension)
        const mcpRawAngle = calculateJointAngle(
          frame.landmarks[fingerLandmarks.MCP[0]],
          frame.landmarks[fingerLandmarks.MCP[1]],
          frame.landmarks[fingerLandmarks.MCP[2]]
        );
        
        const pipRawAngle = calculateJointAngle(
          frame.landmarks[fingerLandmarks.PIP[0]],
          frame.landmarks[fingerLandmarks.PIP[1]],
          frame.landmarks[fingerLandmarks.PIP[2]]
        );
        
        const dipRawAngle = calculateJointAngle(
          frame.landmarks[fingerLandmarks.DIP[0]],
          frame.landmarks[fingerLandmarks.DIP[1]],
          frame.landmarks[fingerLandmarks.DIP[2]]
        );
        
        // Get flexion angles (positive values only)
        const mcpFlexion = Math.max(0, mcpRawAngle);
        const pipFlexion = Math.max(0, pipRawAngle);
        const dipFlexion = Math.max(0, dipRawAngle);
        
        const frameVisibility = visibilityAssessments[frameIndex];
        let acceptFrame = true;
        
        // Apply temporal validation if needed
        if (!isClearlyVisible || !VISIBILITY_CONFIG.bypassTemporalIfVisible) {
          const currentTotalROM = mcpFlexion + pipFlexion + dipFlexion;
          const totalROMValid = validateTemporalConsistency(currentTotalROM, romHistory);
          
          if (!totalROMValid && romHistory.length > 0) {
            acceptFrame = false;
            console.log(`${finger} finger ROM REJECTED due to temporal inconsistency: TAM=${currentTotalROM.toFixed(1)}° - change: ${Math.abs(currentTotalROM - romHistory[romHistory.length - 1]).toFixed(1)}°`);
          }
        }
        
        if (acceptFrame) {
          mcpFlexionAngles.push(mcpFlexion);
          pipFlexionAngles.push(pipFlexion);
          dipFlexionAngles.push(dipFlexion);
          mcpRawAngles.push(mcpRawAngle);
          pipRawAngles.push(pipRawAngle);
          dipRawAngles.push(dipRawAngle);
          romHistory.push(mcpFlexion + pipFlexion + dipFlexion);
        }
      }
    });

    // Calculate TAM with extension deficit adjustment
    if (mcpFlexionAngles.length > 0 && pipFlexionAngles.length > 0 && dipFlexionAngles.length > 0) {
      // Find maximum flexion for each joint
      const maxMcpFlexion = Math.max(...mcpFlexionAngles);
      const maxPipFlexion = Math.max(...pipFlexionAngles);
      const maxDipFlexion = Math.max(...dipFlexionAngles);
      
      // Find minimum extension (extension deficit) for each joint
      // If the minimum raw angle is positive, there's an extension deficit
      const mcpExtensionDeficit = Math.max(0, Math.min(...mcpRawAngles));
      const pipExtensionDeficit = Math.max(0, Math.min(...pipRawAngles));
      const dipExtensionDeficit = Math.max(0, Math.min(...dipRawAngles));
      
      // Clinical TAM calculation: Flexion ROM minus extension deficits
      const mcpTAM = Math.max(0, maxMcpFlexion - mcpExtensionDeficit);
      const pipTAM = Math.max(0, maxPipFlexion - pipExtensionDeficit);
      const dipTAM = Math.max(0, maxDipFlexion - dipExtensionDeficit);
      const totalTAM = mcpTAM + pipTAM + dipTAM;
      
      // Log the TAM calculation details
      console.log(`${finger} finger TAM calculation:`);
      console.log(`  MCP: ${maxMcpFlexion.toFixed(1)}° flexion - ${mcpExtensionDeficit.toFixed(1)}° deficit = ${mcpTAM.toFixed(1)}°`);
      console.log(`  PIP: ${maxPipFlexion.toFixed(1)}° flexion - ${pipExtensionDeficit.toFixed(1)}° deficit = ${pipTAM.toFixed(1)}°`);
      console.log(`  DIP: ${maxDipFlexion.toFixed(1)}° flexion - ${dipExtensionDeficit.toFixed(1)}° deficit = ${dipTAM.toFixed(1)}°`);
      console.log(`  Total TAM: ${totalTAM.toFixed(1)}° (${romHistory.length} frames processed)`);
      
      maxROMByFinger[finger.toLowerCase()] = {
        mcpAngle: Math.round(mcpTAM * 100) / 100,
        pipAngle: Math.round(pipTAM * 100) / 100,
        dipAngle: Math.round(dipTAM * 100) / 100,
        totalActiveRom: Math.round(totalTAM * 100) / 100,
        mcpExtensionDeficit: Math.round(mcpExtensionDeficit * 100) / 100,
        pipExtensionDeficit: Math.round(pipExtensionDeficit * 100) / 100,
        dipExtensionDeficit: Math.round(dipExtensionDeficit * 100) / 100,
        mcpFlexion: Math.round(maxMcpFlexion * 100) / 100,
        pipFlexion: Math.round(maxPipFlexion * 100) / 100,
        dipFlexion: Math.round(maxDipFlexion * 100) / 100
      };
      
      // Set quality based on visibility and data amount
      if (isClearlyVisible) {
        temporalQuality[finger.toLowerCase()] = 1.0; // Perfect quality for clearly visible fingers
        console.log(`${finger} finger clearly visible: ${romHistory.length} frames, bypassed temporal validation, final TAM: ${totalTAM.toFixed(1)}°`);
      } else if (romHistory.length >= TEMPORAL_CONFIG.minValidFrames) {
        temporalQuality[finger.toLowerCase()] = calculateTemporalQuality(romHistory);
        console.log(`${finger} finger temporal validation: ${romHistory.length} valid frames, quality: ${Math.round(temporalQuality[finger.toLowerCase()] * 100)}%, final TAM: ${totalTAM.toFixed(1)}°`);
      } else {
        temporalQuality[finger.toLowerCase()] = 0.3; // Low quality due to insufficient data
        console.log(`${finger} finger insufficient data: ${romHistory.length} frames, final TAM: ${totalTAM.toFixed(1)}°`);
      }
    } else {
      // No valid data for this finger
      maxROMByFinger[finger.toLowerCase()] = {
        mcpAngle: 0,
        pipAngle: 0,
        dipAngle: 0,
        totalActiveRom: 0,
        mcpExtensionDeficit: 0,
        pipExtensionDeficit: 0,
        dipExtensionDeficit: 0,
        mcpFlexion: 0,
        pipFlexion: 0,
        dipFlexion: 0
      };
      temporalQuality[finger.toLowerCase()] = 0;
      console.log(`${finger} finger: No valid data available`);
    }
  });

  return { ...maxROMByFinger, temporalQuality };
}