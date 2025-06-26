export interface JointAngles {
  mcpAngle: number;
  pipAngle: number;
  dipAngle: number;
  totalActiveRom: number;
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

// Anatomical limits for joint angles (based on clinical studies)
const ANATOMICAL_LIMITS = {
  MCP: { min: 0, max: 95 },   // Metacarpophalangeal joint: 0-95 degrees
  PIP: { min: 0, max: 115 },  // Proximal interphalangeal joint: 0-115 degrees
  DIP: { min: 0, max: 90 }    // Distal interphalangeal joint: 0-90 degrees
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

// Calculate flexion angle between three points
// Returns 0° for straight finger, positive for flexion
function calculateFlexionAngle(p1: HandLandmark, p2: HandLandmark, p3: HandLandmark): number {
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
  
  // Convert to flexion angle: 180° = straight (0° flexion), smaller angles = more flexion
  const flexionAngle = 180 - totalAngle;
  
  // Ensure non-negative values (straight finger = 0°, flexed finger = positive)
  return Math.max(0, flexionAngle);
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

// Validate joint angles against anatomical limits
export function validateAnatomicalLimits(angles: JointAngles): { 
  isValid: boolean; 
  correctedAngles: JointAngles; 
  violations: string[] 
} {
  const violations: string[] = [];
  let correctedAngles = { ...angles };
  
  // Check and correct MCP angle
  if (angles.mcpAngle > ANATOMICAL_LIMITS.MCP.max) {
    violations.push(`MCP: ${angles.mcpAngle.toFixed(1)}° > ${ANATOMICAL_LIMITS.MCP.max}°`);
    correctedAngles.mcpAngle = ANATOMICAL_LIMITS.MCP.max;
  } else if (angles.mcpAngle < ANATOMICAL_LIMITS.MCP.min) {
    correctedAngles.mcpAngle = ANATOMICAL_LIMITS.MCP.min;
  }
  
  // Check and correct PIP angle
  if (angles.pipAngle > ANATOMICAL_LIMITS.PIP.max) {
    violations.push(`PIP: ${angles.pipAngle.toFixed(1)}° > ${ANATOMICAL_LIMITS.PIP.max}°`);
    correctedAngles.pipAngle = ANATOMICAL_LIMITS.PIP.max;
  } else if (angles.pipAngle < ANATOMICAL_LIMITS.PIP.min) {
    correctedAngles.pipAngle = ANATOMICAL_LIMITS.PIP.min;
  }
  
  // Check and correct DIP angle
  if (angles.dipAngle > ANATOMICAL_LIMITS.DIP.max) {
    violations.push(`DIP: ${angles.dipAngle.toFixed(1)}° > ${ANATOMICAL_LIMITS.DIP.max}°`);
    correctedAngles.dipAngle = ANATOMICAL_LIMITS.DIP.max;
  } else if (angles.dipAngle < ANATOMICAL_LIMITS.DIP.min) {
    correctedAngles.dipAngle = ANATOMICAL_LIMITS.DIP.min;
  }
  
  // Recalculate total ROM with corrected values
  correctedAngles.totalActiveRom = correctedAngles.mcpAngle + correctedAngles.pipAngle + correctedAngles.dipAngle;
  
  return {
    isValid: violations.length === 0,
    correctedAngles,
    violations
  };
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
  
  // Get unique landmark indices for this finger (avoiding Set iteration)
  const uniqueIndices: number[] = [];
  allIndices.forEach(idx => {
    if (!uniqueIndices.includes(idx)) {
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
      totalActiveRom: 0
    };
  }
  
  // Calculate flexion angles using correct landmark triplets
  // MCP: wrist (0) -> MCP joint (5) -> PIP joint (6)
  const mcpAngle = calculateFlexionAngle(
    landmarks[finger.MCP[0]], // wrist (0)
    landmarks[finger.MCP[1]], // MCP joint (5)
    landmarks[finger.MCP[2]]  // PIP joint (6)
  );
  
  // PIP: MCP joint (5) -> PIP joint (6) -> DIP joint (7)
  const pipAngle = calculateFlexionAngle(
    landmarks[finger.PIP[0]], // MCP joint (5)
    landmarks[finger.PIP[1]], // PIP joint (6)
    landmarks[finger.PIP[2]]  // DIP joint (7)
  );
  
  // DIP: PIP joint (6) -> DIP joint (7) -> fingertip (8)
  const dipAngle = calculateFlexionAngle(
    landmarks[finger.DIP[0]], // PIP joint (6)
    landmarks[finger.DIP[1]], // DIP joint (7)
    landmarks[finger.DIP[2]]  // fingertip (8)
  );
  
  // Create initial ROM object
  const initialROM: JointAngles = {
    mcpAngle: Math.round(mcpAngle * 100) / 100,
    pipAngle: Math.round(pipAngle * 100) / 100,
    dipAngle: Math.round(dipAngle * 100) / 100,
    totalActiveRom: Math.round((mcpAngle + pipAngle + dipAngle) * 100) / 100
  };
  
  // Apply anatomical validation and correction
  const validation = validateAnatomicalLimits(initialROM);
  
  if (!validation.isValid) {
    console.log(`${fingerType} anatomical limits exceeded: ${validation.violations.join(', ')} - applying corrections`);
  }
  
  if (confidence) {
    console.log(`${fingerType} ROM calculated with ${Math.round(confidence.confidence * 100)}% confidence: TAM=${Math.round(validation.correctedAngles.totalActiveRom)}°`);
  }
  
  return validation.correctedAngles;
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
    let maxMcp = 0, maxPip = 0, maxDip = 0, maxTotal = 0;
    const romHistory: number[] = [];
    const mcpHistory: number[] = [];
    const pipHistory: number[] = [];
    const dipHistory: number[] = [];
    
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
    
    // Process each frame and build ROM history
    motionFrames.forEach((frame, frameIndex) => {
      if (frame.landmarks && frame.landmarks.length >= 21) {
        const rom = calculateFingerROM(frame.landmarks, finger);
        const frameVisibility = visibilityAssessments[frameIndex];
        
        // Determine if we should apply temporal validation for this frame
        let shouldApplyTemporal = true;
        
        if (isClearlyVisible && VISIBILITY_CONFIG.bypassTemporalIfVisible) {
          // Bypass temporal validation for clearly visible fingers
          shouldApplyTemporal = false;
        }
        
        let acceptFrame = true;
        
        if (shouldApplyTemporal) {
          // Apply temporal consistency validation
          const totalROMValid = validateTemporalConsistency(rom.totalActiveRom, romHistory);
          const mcpValid = validateTemporalConsistency(rom.mcpAngle, mcpHistory);
          const pipValid = validateTemporalConsistency(rom.pipAngle, pipHistory);
          const dipValid = validateTemporalConsistency(rom.dipAngle, dipHistory);
          
          acceptFrame = totalROMValid && mcpValid && pipValid && dipValid;
          
          if (!acceptFrame) {
            // Log detailed rejection reasons for clinical documentation
            const rejectionReasons = [];
            if (!totalROMValid) rejectionReasons.push(`TAM change: ${romHistory.length > 0 ? Math.abs(rom.totalActiveRom - romHistory[romHistory.length - 1]).toFixed(1) : 'N/A'}°`);
            if (!mcpValid) rejectionReasons.push(`MCP change: ${mcpHistory.length > 0 ? Math.abs(rom.mcpAngle - mcpHistory[mcpHistory.length - 1]).toFixed(1) : 'N/A'}°`);
            if (!pipValid) rejectionReasons.push(`PIP change: ${pipHistory.length > 0 ? Math.abs(rom.pipAngle - pipHistory[pipHistory.length - 1]).toFixed(1) : 'N/A'}°`);
            if (!dipValid) rejectionReasons.push(`DIP change: ${dipHistory.length > 0 ? Math.abs(rom.dipAngle - dipHistory[dipHistory.length - 1]).toFixed(1) : 'N/A'}°`);
            
            console.log(`${finger} finger ROM REJECTED due to temporal inconsistency: TAM=${rom.totalActiveRom.toFixed(1)}° (${rejectionReasons.join(', ')}) - threshold: ${TEMPORAL_CONFIG.maxROMChangePerFrame}°`);
          }
        }
        
        if (acceptFrame) {
          romHistory.push(rom.totalActiveRom);
          mcpHistory.push(rom.mcpAngle);
          pipHistory.push(rom.pipAngle);
          dipHistory.push(rom.dipAngle);
          
          maxMcp = Math.max(maxMcp, rom.mcpAngle);
          maxPip = Math.max(maxPip, rom.pipAngle);
          maxDip = Math.max(maxDip, rom.dipAngle);
          maxTotal = Math.max(maxTotal, rom.totalActiveRom);
        }
      }
    });

    // Apply smoothing to final ROM values if we have enough data AND temporal validation was applied
    if (romHistory.length >= TEMPORAL_CONFIG.minValidFrames && !isClearlyVisible) {
      const smoothedMaxTotal = applySmoothingFilter([...romHistory].sort((a, b) => b - a).slice(0, 3));
      const smoothedMaxMcp = applySmoothingFilter([...mcpHistory].sort((a, b) => b - a).slice(0, 3));
      const smoothedMaxPip = applySmoothingFilter([...pipHistory].sort((a, b) => b - a).slice(0, 3));
      const smoothedMaxDip = applySmoothingFilter([...dipHistory].sort((a, b) => b - a).slice(0, 3));
      
      maxROMByFinger[finger.toLowerCase()] = {
        mcpAngle: Math.round(smoothedMaxMcp * 100) / 100,
        pipAngle: Math.round(smoothedMaxPip * 100) / 100,
        dipAngle: Math.round(smoothedMaxDip * 100) / 100,
        totalActiveRom: Math.round(smoothedMaxTotal * 100) / 100
      };
      
      temporalQuality[finger.toLowerCase()] = calculateTemporalQuality(romHistory);
      console.log(`${finger} finger temporal validation: ${romHistory.length} valid frames, quality: ${Math.round(temporalQuality[finger.toLowerCase()] * 100)}%, final ROM: ${Math.round(smoothedMaxTotal * 100) / 100}°`);
    } else {
      // Use raw values for clearly visible fingers or insufficient data
      maxROMByFinger[finger.toLowerCase()] = {
        mcpAngle: Math.round(maxMcp * 100) / 100,
        pipAngle: Math.round(maxPip * 100) / 100,
        dipAngle: Math.round(maxDip * 100) / 100,
        totalActiveRom: Math.round(maxTotal * 100) / 100
      };
      
      if (isClearlyVisible) {
        temporalQuality[finger.toLowerCase()] = 1.0; // Perfect quality for clearly visible fingers
        console.log(`${finger} finger clearly visible: ${romHistory.length} frames, bypassed temporal validation, final ROM: ${Math.round(maxTotal * 100) / 100}° (RAW)`);
      } else {
        temporalQuality[finger.toLowerCase()] = 0.3; // Low quality due to insufficient data
        console.log(`${finger} finger insufficient data for temporal validation: ${romHistory.length} frames, using raw ROM: ${Math.round(maxTotal * 100) / 100}°`);
      }
    }
  });

  return { ...maxROMByFinger, temporalQuality };
}