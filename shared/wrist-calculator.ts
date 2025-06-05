export interface WristAngles {
  flexionAngle: number;
  extensionAngle: number;
  maxFlexion: number;
  maxExtension: number;
  totalWristRom: number;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// MediaPipe Pose landmark indices for arm tracking
const POSE_LANDMARKS = {
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12
};

// Calculate angle between three 3D points
function calculateAngle3D(p1: HandLandmark | PoseLandmark, p2: HandLandmark | PoseLandmark, p3: HandLandmark | PoseLandmark): number {
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
  
  // Calculate cosine of angle
  const cosAngle = dotProduct / (mag1 * mag2);
  
  // Clamp to [-1, 1] to avoid NaN from floating point errors
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  
  // Calculate angle in radians then convert to degrees
  const angleRad = Math.acos(clampedCos);
  return (angleRad * 180) / Math.PI;
}

// Determine hand laterality from pose landmarks
function determineHandLaterality(handWrist: HandLandmark, poseLandmarks: PoseLandmark[]): 'LEFT' | 'RIGHT' | null {
  if (!poseLandmarks || poseLandmarks.length < 17) return null;
  
  const leftWrist = poseLandmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightWrist = poseLandmarks[POSE_LANDMARKS.RIGHT_WRIST];
  
  if (!leftWrist || !rightWrist) return null;
  
  // Calculate distance from hand landmarks to each pose wrist
  const distToLeft = Math.sqrt(
    Math.pow(handWrist.x - leftWrist.x, 2) +
    Math.pow(handWrist.y - leftWrist.y, 2) +
    Math.pow(handWrist.z - leftWrist.z, 2)
  );
  
  const distToRight = Math.sqrt(
    Math.pow(handWrist.x - rightWrist.x, 2) +
    Math.pow(handWrist.y - rightWrist.y, 2) +
    Math.pow(handWrist.z - rightWrist.z, 2)
  );
  
  // Return the closer match
  return distToLeft < distToRight ? 'LEFT' : 'RIGHT';
}

// Calculate wrist flexion/extension using elbow reference
export function calculateWristAngles(
  handLandmarks: HandLandmark[], 
  poseLandmarks?: PoseLandmark[]
): WristAngles {
  if (!handLandmarks || handLandmarks.length < 21) {
    return {
      flexionAngle: 0,
      extensionAngle: 0,
      maxFlexion: 0,
      maxExtension: 0,
      totalWristRom: 0
    };
  }
  
  // Hand landmark indices
  const wrist = handLandmarks[0]; // Wrist base
  const middleMcp = handLandmarks[9]; // Middle finger MCP joint
  const middleTip = handLandmarks[12]; // Middle finger tip
  
  let wristAngle = 0;
  
  if (poseLandmarks && poseLandmarks.length >= 17) {
    // Enhanced calculation with pose data
    const handLaterality = determineHandLaterality(wrist, poseLandmarks);
    
    if (handLaterality) {
      const elbowIndex = handLaterality === 'LEFT' ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW;
      const wristIndex = handLaterality === 'LEFT' ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST;
      
      const elbow = poseLandmarks[elbowIndex];
      const poseWrist = poseLandmarks[wristIndex];
      
      // Verify pose landmarks are valid
      if (elbow && poseWrist && 
          elbow.visibility && elbow.visibility > 0.5 &&
          poseWrist.visibility && poseWrist.visibility > 0.5) {
        
        // Calculate wrist angle using elbow-wrist-middle finger MCP
        // This gives us the true wrist flexion/extension angle
        wristAngle = calculateAngle3D(elbow, poseWrist, middleMcp);
        
        console.log(`Enhanced wrist calculation (${handLaterality}): ${wristAngle.toFixed(1)}° using pose landmarks`);
      } else {
        // Fallback to hand-only calculation
        wristAngle = calculateAngle3D(wrist, middleMcp, middleTip);
        console.log(`Fallback wrist calculation: ${wristAngle.toFixed(1)}° using hand landmarks only`);
      }
    } else {
      // Fallback to hand-only calculation
      wristAngle = calculateAngle3D(wrist, middleMcp, middleTip);
      console.log(`Hand-only wrist calculation: ${wristAngle.toFixed(1)}° (couldn't determine laterality)`);
    }
  } else {
    // Standard calculation using only hand landmarks
    wristAngle = calculateAngle3D(wrist, middleMcp, middleTip);
    console.log(`Standard wrist calculation: ${wristAngle.toFixed(1)}° using hand landmarks only`);
  }
  
  // Convert angle to flexion/extension
  // 180° = neutral position
  // < 180° = flexion (bending forward)
  // > 180° = extension (bending backward)
  const neutralAngle = 180;
  const flexionAngle = wristAngle < neutralAngle ? neutralAngle - wristAngle : 0;
  const extensionAngle = wristAngle > neutralAngle ? wristAngle - neutralAngle : 0;
  
  return {
    flexionAngle: Math.round(flexionAngle * 100) / 100,
    extensionAngle: Math.round(extensionAngle * 100) / 100,
    maxFlexion: Math.round(flexionAngle * 100) / 100,
    maxExtension: Math.round(extensionAngle * 100) / 100,
    totalWristRom: Math.round((flexionAngle + extensionAngle) * 100) / 100
  };
}

// Calculate maximum wrist ROM across multiple frames
export function calculateMaxWristROM(motionFrames: Array<{
  handLandmarks: HandLandmark[];
  poseLandmarks?: PoseLandmark[];
}>): WristAngles {
  let maxFlexion = 0;
  let maxExtension = 0;
  let maxTotal = 0;
  
  motionFrames.forEach(frame => {
    if (frame.handLandmarks && frame.handLandmarks.length >= 21) {
      const angles = calculateWristAngles(frame.handLandmarks, frame.poseLandmarks);
      maxFlexion = Math.max(maxFlexion, angles.flexionAngle);
      maxExtension = Math.max(maxExtension, angles.extensionAngle);
      maxTotal = Math.max(maxTotal, angles.totalWristRom);
    }
  });
  
  console.log(`Max wrist ROM calculated: Flexion=${maxFlexion}°, Extension=${maxExtension}°, Total=${maxTotal}°`);
  
  return {
    flexionAngle: 0, // Current frame values
    extensionAngle: 0,
    maxFlexion,
    maxExtension,
    totalWristRom: maxTotal
  };
}

// Clinical reference values for wrist ROM
export const WRIST_ROM_NORMS = {
  flexion: {
    normal: 80,
    functional: 60,
    minimum: 30
  },
  extension: {
    normal: 70,
    functional: 50,
    minimum: 20
  },
  total: {
    normal: 150,
    functional: 110,
    minimum: 50
  }
};

// Assess wrist ROM against clinical norms
export function assessWristROM(angles: WristAngles): {
  flexionStatus: 'normal' | 'functional' | 'limited' | 'severely limited';
  extensionStatus: 'normal' | 'functional' | 'limited' | 'severely limited';
  overallStatus: 'normal' | 'functional' | 'limited' | 'severely limited';
  recommendations: string[];
} {
  const flexionStatus = 
    angles.maxFlexion >= WRIST_ROM_NORMS.flexion.normal ? 'normal' :
    angles.maxFlexion >= WRIST_ROM_NORMS.flexion.functional ? 'functional' :
    angles.maxFlexion >= WRIST_ROM_NORMS.flexion.minimum ? 'limited' : 'severely limited';
  
  const extensionStatus =
    angles.maxExtension >= WRIST_ROM_NORMS.extension.normal ? 'normal' :
    angles.maxExtension >= WRIST_ROM_NORMS.extension.functional ? 'functional' :
    angles.maxExtension >= WRIST_ROM_NORMS.extension.minimum ? 'limited' : 'severely limited';
  
  const overallStatus =
    angles.totalWristRom >= WRIST_ROM_NORMS.total.normal ? 'normal' :
    angles.totalWristRom >= WRIST_ROM_NORMS.total.functional ? 'functional' :
    angles.totalWristRom >= WRIST_ROM_NORMS.total.minimum ? 'limited' : 'severely limited';
  
  const recommendations: string[] = [];
  
  if (flexionStatus !== 'normal') {
    recommendations.push('Consider wrist flexion exercises and stretching');
  }
  
  if (extensionStatus !== 'normal') {
    recommendations.push('Consider wrist extension exercises and strengthening');
  }
  
  if (overallStatus === 'severely limited') {
    recommendations.push('Recommend comprehensive rehabilitation program');
    recommendations.push('Consider occupational therapy evaluation');
  }
  
  return {
    flexionStatus,
    extensionStatus,
    overallStatus,
    recommendations
  };
}