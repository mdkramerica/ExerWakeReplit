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
// Returns 0° for straight finger, positive for flexion, negative for hyperextension
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
  const flexionAngle = (angleRad * 180) / Math.PI;
  
  return flexionAngle;
}

// Calculate joint angles for a specific finger
export function calculateFingerROM(landmarks: HandLandmark[], fingerType: 'INDEX' | 'MIDDLE' | 'RING' | 'PINKY'): JointAngles {
  const finger = FINGER_LANDMARKS[fingerType];
  
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
  
  return {
    mcpAngle: Math.round(mcpAngle * 100) / 100, // Round to 2 decimal places
    pipAngle: Math.round(pipAngle * 100) / 100,
    dipAngle: Math.round(dipAngle * 100) / 100,
    totalActiveRom: Math.round(totalActiveRom * 100) / 100
  };
}

// Calculate max ROM for all fingers
export function calculateAllFingersMaxROM(motionFrames: Array<{landmarks: HandLandmark[]}>): {
  index: JointAngles;
  middle: JointAngles;
  ring: JointAngles;
  pinky: JointAngles;
} {
  const fingers: ('INDEX' | 'MIDDLE' | 'RING' | 'PINKY')[] = ['INDEX', 'MIDDLE', 'RING', 'PINKY'];
  const maxROMByFinger: any = {};

  fingers.forEach(finger => {
    let maxMcp = 0, maxPip = 0, maxDip = 0, maxTotal = 0;
    
    motionFrames.forEach(frame => {
      if (frame.landmarks && frame.landmarks.length >= 21) {
        const rom = calculateFingerROM(frame.landmarks, finger);
        maxMcp = Math.max(maxMcp, rom.mcpAngle);
        maxPip = Math.max(maxPip, rom.pipAngle);
        maxDip = Math.max(maxDip, rom.dipAngle);
        maxTotal = Math.max(maxTotal, rom.totalActiveRom);
      }
    });

    maxROMByFinger[finger.toLowerCase()] = {
      mcpAngle: maxMcp,
      pipAngle: maxPip,
      dipAngle: maxDip,
      totalActiveRom: maxTotal
    };
  });

  return maxROMByFinger;
}