// ROM Calculator for Hand/Finger Joints
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

// MediaPipe Hand Landmark indices for finger joints
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
function calculateFlexionAngle(p1: HandLandmark, p2: HandLandmark, p3: HandLandmark): number {
  const v1 = {
    x: p1.x - p2.x,
    y: p1.y - p2.y,
    z: p1.z - p2.z
  };
  
  const v2 = {
    x: p3.x - p2.x,
    y: p3.y - p2.y,
    z: p3.z - p2.z
  };
  
  const dotProduct = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  const cosAngle = dotProduct / (mag1 * mag2);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const angleRad = Math.acos(clampedCos);
  const totalAngle = (angleRad * 180) / Math.PI;
  const flexionAngle = 180 - totalAngle;
  
  return Math.max(0, flexionAngle);
}

// Calculate joint angles for a specific finger
export function calculateFingerROM(landmarks: HandLandmark[], fingerType: 'INDEX' | 'MIDDLE' | 'RING' | 'PINKY'): JointAngles {
  const finger = FINGER_LANDMARKS[fingerType];
  
  const mcpAngle = calculateFlexionAngle(
    landmarks[finger.MCP[0]], 
    landmarks[finger.MCP[1]], 
    landmarks[finger.MCP[2]]
  );
  
  const pipAngle = calculateFlexionAngle(
    landmarks[finger.PIP[0]], 
    landmarks[finger.PIP[1]], 
    landmarks[finger.PIP[2]]
  );
  
  const dipAngle = calculateFlexionAngle(
    landmarks[finger.DIP[0]], 
    landmarks[finger.DIP[1]], 
    landmarks[finger.DIP[2]]
  );
  
  const totalActiveRom = mcpAngle + pipAngle + dipAngle;
  
  return {
    mcpAngle: Math.round(mcpAngle * 100) / 100,
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

// Real-time ROM calculation for live display (compatibility function)
export function calculateCurrentROM(landmarks: HandLandmark[]): JointAngles {
  if (!landmarks || landmarks.length < 21) {
    return { mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 };
  }
  
  try {
    return calculateFingerROM(landmarks, 'INDEX');
  } catch (error) {
    console.error('ROM calculation error:', error);
    return { mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 };
  }
}

// Calculate max ROM for single finger (compatibility function)
export function calculateMaxROM(motionFrames: Array<{landmarks: HandLandmark[]}>): JointAngles {
  let maxMcp = 0;
  let maxPip = 0;
  let maxDip = 0;
  
  try {
    motionFrames.forEach(frame => {
      if (frame.landmarks && frame.landmarks.length >= 21) {
        const rom = calculateFingerROM(frame.landmarks, 'INDEX');
        maxMcp = Math.max(maxMcp, rom.mcpAngle);
        maxPip = Math.max(maxPip, rom.pipAngle);
        maxDip = Math.max(maxDip, rom.dipAngle);
      }
    });
  } catch (error) {
    console.error('Max ROM calculation error:', error);
  }
  
  const totalActiveRom = maxMcp + maxPip + maxDip;
  
  return {
    mcpAngle: Math.round(maxMcp * 100) / 100,
    pipAngle: Math.round(maxPip * 100) / 100,
    dipAngle: Math.round(maxDip * 100) / 100,
    totalActiveRom: Math.round(totalActiveRom * 100) / 100
  };
}