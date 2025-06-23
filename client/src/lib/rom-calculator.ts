// Re-export from shared ROM calculator for client compatibility
export { calculateFingerROM, calculateAllFingersMaxROM, type JointAngles, type HandLandmark } from "@shared/rom-calculator";

// Real-time ROM calculation for live display (compatibility function)
export function calculateCurrentROM(landmarks: any[]): any {
  if (!landmarks || landmarks.length < 21) {
    return { mcpAngle: 0, pipAngle: 0, dipAngle: 0, totalActiveRom: 0 };
  }
  
  const { calculateFingerROM } = require("@shared/rom-calculator");
  return calculateFingerROM(landmarks, 'INDEX');
}

// Calculate max ROM for single finger (compatibility function)
export function calculateMaxROM(motionFrames: Array<{landmarks: any[]}>): any {
  let maxMcp = 0;
  let maxPip = 0;
  let maxDip = 0;
  
  const { calculateFingerROM } = require("@shared/rom-calculator");
  
  motionFrames.forEach(frame => {
    if (frame.landmarks && frame.landmarks.length >= 21) {
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