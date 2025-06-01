// Range of Motion Calculator for Hand/Finger Joints
// Calculates MCP, PIP, and DIP joint angles from MediaPipe landmarks

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
  // Index finger (most commonly affected by trigger finger)
  INDEX: {
    MCP: [5, 6], // MCP joint between landmarks 5-6
    PIP: [6, 7], // PIP joint between landmarks 6-7  
    DIP: [7, 8], // DIP joint between landmarks 7-8
  },
  // Middle finger
  MIDDLE: {
    MCP: [9, 10],
    PIP: [10, 11],
    DIP: [11, 12],
  },
  // Ring finger
  RING: {
    MCP: [13, 14],
    PIP: [14, 15],
    DIP: [15, 16],
  },
  // Pinky finger
  PINKY: {
    MCP: [17, 18],
    PIP: [18, 19],
    DIP: [19, 20],
  }
};

// Calculate angle between three points
function calculateAngle(p1: HandLandmark, p2: HandLandmark, p3: HandLandmark): number {
  // Vector from p2 to p1
  const v1 = {
    x: p1.x - p2.x,
    y: p1.y - p2.y,
    z: p1.z - p2.z
  };
  
  // Vector from p2 to p3
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
  
  // Calculate angle in radians, then convert to degrees
  const cosAngle = dotProduct / (mag1 * mag2);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
  
  return angle;
}

// Calculate joint angles for a specific finger
export function calculateFingerROM(landmarks: HandLandmark[], fingerType: 'INDEX' | 'MIDDLE' | 'RING' | 'PINKY'): JointAngles {
  const finger = FINGER_LANDMARKS[fingerType];
  
  // Get landmarks for each joint
  const mcpLandmarks = [
    landmarks[0], // Wrist as reference
    landmarks[finger.MCP[0]], 
    landmarks[finger.MCP[1]]
  ];
  
  const pipLandmarks = [
    landmarks[finger.MCP[0]], 
    landmarks[finger.PIP[0]], 
    landmarks[finger.PIP[1]]
  ];
  
  const dipLandmarks = [
    landmarks[finger.PIP[0]], 
    landmarks[finger.DIP[0]], 
    landmarks[finger.DIP[1]]
  ];
  
  // Calculate angles
  const mcpAngle = calculateAngle(mcpLandmarks[0], mcpLandmarks[1], mcpLandmarks[2]);
  const pipAngle = calculateAngle(pipLandmarks[0], pipLandmarks[1], pipLandmarks[2]);
  const dipAngle = calculateAngle(dipLandmarks[0], dipLandmarks[1], dipLandmarks[2]);
  
  // Total active range of motion
  const totalActiveRom = mcpAngle + pipAngle + dipAngle;
  
  return {
    mcpAngle: Math.round(mcpAngle * 100) / 100, // Round to 2 decimal places
    pipAngle: Math.round(pipAngle * 100) / 100,
    dipAngle: Math.round(dipAngle * 100) / 100,
    totalActiveRom: Math.round(totalActiveRom * 100) / 100
  };
}

// Calculate maximum ROM values from an array of motion data
export function calculateMaxROM(motionFrames: Array<{landmarks: HandLandmark[]}>): JointAngles {
  let maxMcp = 0;
  let maxPip = 0;
  let maxDip = 0;
  
  motionFrames.forEach(frame => {
    if (frame.landmarks && frame.landmarks.length >= 21) {
      // Calculate ROM for index finger (most common for trigger finger)
      const rom = calculateFingerROM(frame.landmarks, 'INDEX');
      
      maxMcp = Math.max(maxMcp, rom.mcpAngle);
      maxPip = Math.max(maxPip, rom.pipAngle);
      maxDip = Math.max(maxDip, rom.dipAngle);
    }
  });
  
  const totalActiveRom = maxMcp + maxPip + maxDip;
  
  return {
    mcpAngle: Math.round(maxMcp * 100) / 100,
    pipAngle: Math.round(maxPip * 100) / 100,
    dipAngle: Math.round(maxDip * 100) / 100,
    totalActiveRom: Math.round(totalActiveRom * 100) / 100
  };
}

// Real-time ROM calculation for live display
export function calculateCurrentROM(landmarks: HandLandmark[]): JointAngles {
  if (!landmarks || landmarks.length < 21) {
    return { mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 };
  }
  
  return calculateFingerROM(landmarks, 'INDEX');
}