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
  
  // Total active range of motion
  const totalActiveRom = mcpAngle + pipAngle + dipAngle;
  
  if (confidence) {
    console.log(`${fingerType} ROM calculated with ${Math.round(confidence.confidence * 100)}% confidence: TAM=${Math.round(totalActiveRom)}°`);
  }
  
  return {
    mcpAngle: Math.round(mcpAngle * 100) / 100, // Round to 2 decimal places
    pipAngle: Math.round(pipAngle * 100) / 100,
    dipAngle: Math.round(dipAngle * 100) / 100,
    totalActiveRom: Math.round(totalActiveRom * 100) / 100
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
    let maxMcp = 0, maxPip = 0, maxDip = 0, maxTotal = 0;
    const romHistory: number[] = [];
    const mcpHistory: number[] = [];
    const pipHistory: number[] = [];
    const dipHistory: number[] = [];
    
    // Process each frame and build ROM history
    motionFrames.forEach(frame => {
      if (frame.landmarks && frame.landmarks.length >= 21) {
        const rom = calculateFingerROM(frame.landmarks, finger);
        
        // Validate temporal consistency
        const totalROMValid = validateTemporalConsistency(rom.totalActiveRom, romHistory);
        const mcpValid = validateTemporalConsistency(rom.mcpAngle, mcpHistory);
        const pipValid = validateTemporalConsistency(rom.pipAngle, pipHistory);
        const dipValid = validateTemporalConsistency(rom.dipAngle, dipHistory);
        
        // Only accept ROM values if temporally consistent
        if (totalROMValid && mcpValid && pipValid && dipValid) {
          romHistory.push(rom.totalActiveRom);
          mcpHistory.push(rom.mcpAngle);
          pipHistory.push(rom.pipAngle);
          dipHistory.push(rom.dipAngle);
          
          maxMcp = Math.max(maxMcp, rom.mcpAngle);
          maxPip = Math.max(maxPip, rom.pipAngle);
          maxDip = Math.max(maxDip, rom.dipAngle);
          maxTotal = Math.max(maxTotal, rom.totalActiveRom);
        } else {
          console.log(`${finger} finger ROM rejected due to temporal inconsistency: TAM=${rom.totalActiveRom}°`);
        }
      }
    });

    // Apply smoothing to final ROM values if we have enough data
    if (romHistory.length >= TEMPORAL_CONFIG.minValidFrames) {
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
      console.log(`${finger} finger temporal validation: ${romHistory.length} valid frames, quality: ${Math.round(temporalQuality[finger.toLowerCase()] * 100)}%`);
    } else {
      // Insufficient data for temporal validation, use raw values but mark low quality
      maxROMByFinger[finger.toLowerCase()] = {
        mcpAngle: maxMcp,
        pipAngle: maxPip,
        dipAngle: maxDip,
        totalActiveRom: maxTotal
      };
      
      temporalQuality[finger.toLowerCase()] = 0.3; // Low quality due to insufficient data
      console.log(`${finger} finger insufficient data for temporal validation: ${romHistory.length} frames`);
    }
  });

  return { ...maxROMByFinger, temporalQuality };
}