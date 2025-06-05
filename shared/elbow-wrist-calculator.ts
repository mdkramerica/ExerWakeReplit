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

export interface ElbowWristAngles {
  forearmToHandAngle: number;
  wristFlexionAngle: number;
  wristExtensionAngle: number;
  elbowDetected: boolean;
  handType: 'LEFT' | 'RIGHT' | 'UNKNOWN';
  confidence: number;
}

// MediaPipe Pose landmark indices
const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24
};

// MediaPipe Hand landmark indices
const HAND_LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20
};

function euclideanDistance3D(a: HandLandmark | PoseLandmark, b: HandLandmark | PoseLandmark): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + 
    Math.pow(a.y - b.y, 2) + 
    Math.pow(a.z - b.z, 2)
  );
}

function calculateAngleBetweenVectors(
  point1: HandLandmark | PoseLandmark,
  point2: HandLandmark | PoseLandmark,
  point3: HandLandmark | PoseLandmark
): number {
  // Vector from point2 to point1
  const vector1 = {
    x: point1.x - point2.x,
    y: point1.y - point2.y,
    z: point1.z - point2.z
  };
  
  // Vector from point2 to point3
  const vector2 = {
    x: point3.x - point2.x,
    y: point3.y - point2.y,
    z: point3.z - point2.z
  };
  
  // Calculate dot product
  const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;
  
  // Calculate magnitudes
  const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y + vector1.z * vector1.z);
  const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y + vector2.z * vector2.z);
  
  // Calculate angle in radians then convert to degrees
  const cosAngle = dotProduct / (magnitude1 * magnitude2);
  const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle)); // Clamp to prevent NaN
  const angleRadians = Math.acos(clampedCosAngle);
  const angleDegrees = angleRadians * (180 / Math.PI);
  
  return angleDegrees;
}

function determineHandType(
  handLandmarks: HandLandmark[],
  poseLandmarks: PoseLandmark[]
): 'LEFT' | 'RIGHT' | 'UNKNOWN' {
  if (!handLandmarks || handLandmarks.length === 0 || !poseLandmarks || poseLandmarks.length === 0) {
    return 'UNKNOWN';
  }

  const handWrist = handLandmarks[HAND_LANDMARKS.WRIST];
  const leftPoseWrist = poseLandmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rightPoseWrist = poseLandmarks[POSE_LANDMARKS.RIGHT_WRIST];

  if (!leftPoseWrist || !rightPoseWrist || !handWrist) {
    return 'UNKNOWN';
  }

  const distanceToLeft = euclideanDistance3D(handWrist, leftPoseWrist);
  const distanceToRight = euclideanDistance3D(handWrist, rightPoseWrist);

  return distanceToLeft < distanceToRight ? 'LEFT' : 'RIGHT';
}

export function calculateElbowReferencedWristAngle(
  handLandmarks: HandLandmark[],
  poseLandmarks?: PoseLandmark[]
): ElbowWristAngles {
  const result: ElbowWristAngles = {
    forearmToHandAngle: 0,
    wristFlexionAngle: 0,
    wristExtensionAngle: 0,
    elbowDetected: false,
    handType: 'UNKNOWN',
    confidence: 0
  };

  if (!handLandmarks || handLandmarks.length < 21) {
    return result;
  }

  // Determine hand type and get corresponding pose landmarks
  if (poseLandmarks && poseLandmarks.length > 16) {
    const handType = determineHandType(handLandmarks, poseLandmarks);
    result.handType = handType;

    const elbowIndex = handType === 'LEFT' ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW;
    const wristIndex = handType === 'LEFT' ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST;
    const shoulderIndex = handType === 'LEFT' ? POSE_LANDMARKS.LEFT_SHOULDER : POSE_LANDMARKS.RIGHT_SHOULDER;

    const elbow = poseLandmarks[elbowIndex];
    const poseWrist = poseLandmarks[wristIndex];
    const shoulder = poseLandmarks[shoulderIndex];

    if (elbow && poseWrist && shoulder && 
        (elbow.visibility || 1) > 0.5 && (poseWrist.visibility || 1) > 0.5 && (shoulder.visibility || 1) > 0.5) {
      
      result.elbowDetected = true;
      result.confidence = Math.min(elbow.visibility || 1, poseWrist.visibility || 1, shoulder.visibility || 1);

      // Get hand landmarks for wrist analysis
      const handWrist = handLandmarks[HAND_LANDMARKS.WRIST];
      const indexMcp = handLandmarks[HAND_LANDMARKS.INDEX_MCP];
      const middleMcp = handLandmarks[HAND_LANDMARKS.MIDDLE_MCP];

      if (handWrist && indexMcp && middleMcp) {
        // Calculate forearm vector (elbow to wrist)
        const forearmVector = {
          x: poseWrist.x - elbow.x,
          y: poseWrist.y - elbow.y,
          z: poseWrist.z - elbow.z
        };

        // Calculate hand orientation vector (wrist to middle of knuckles)
        const knuckleCenter = {
          x: (indexMcp.x + middleMcp.x) / 2,
          y: (indexMcp.y + middleMcp.y) / 2,
          z: (indexMcp.z + middleMcp.z) / 2
        };

        const handVector = {
          x: knuckleCenter.x - handWrist.x,
          y: knuckleCenter.y - handWrist.y,
          z: knuckleCenter.z - handWrist.z
        };

        // Calculate the true forearm-to-hand angle
        const forearmToHandAngle = calculateAngleBetweenVectors(
          { x: elbow.x, y: elbow.y, z: elbow.z },
          { x: poseWrist.x, y: poseWrist.y, z: poseWrist.z },
          { x: knuckleCenter.x, y: knuckleCenter.y, z: knuckleCenter.z }
        );

        result.forearmToHandAngle = forearmToHandAngle;

        // Calculate anatomically correct wrist flexion/extension angles
        // Neutral = 0°, Flexion = forward bend, Extension = backward bend
        
        const forearmLength = Math.sqrt(forearmVector.x**2 + forearmVector.y**2 + forearmVector.z**2);
        const handLength = Math.sqrt(handVector.x**2 + handVector.y**2 + handVector.z**2);
        
        if (forearmLength > 0 && handLength > 0) {
          // Normalize vectors
          const forearmNorm = {
            x: forearmVector.x / forearmLength,
            y: forearmVector.y / forearmLength,
            z: forearmVector.z / forearmLength
          };
          
          const handNorm = {
            x: handVector.x / handLength,
            y: handVector.y / handLength,
            z: handVector.z / handLength
          };
          
          // Calculate angle between forearm and hand vectors
          const dotProduct = forearmNorm.x * handNorm.x + forearmNorm.y * handNorm.y + forearmNorm.z * handNorm.z;
          const clampedDot = Math.max(-1, Math.min(1, dotProduct));
          const angleRadians = Math.acos(clampedDot);
          const angleDegrees = angleRadians * (180 / Math.PI);
          
          // In neutral position, vectors should be aligned (0° angle between them)
          // Deviation from 0° indicates wrist movement
          if (angleDegrees > 5) { // Minimum threshold for detection
            // Use cross product to determine flexion vs extension direction
            const crossProduct = {
              x: forearmNorm.y * handNorm.z - forearmNorm.z * handNorm.y,
              y: forearmNorm.z * handNorm.x - forearmNorm.x * handNorm.z,
              z: forearmNorm.x * handNorm.y - forearmNorm.y * handNorm.x
            };
            
            // Determine direction based on camera coordinate system
            // Positive Y cross product indicates extension (hand moves upward/backward)
            const isExtension = crossProduct.y > 0;
            
            if (isExtension) {
              result.wristExtensionAngle = Math.min(angleDegrees, 70);
              result.wristFlexionAngle = 0;
              console.log(`Wrist extension: ${result.wristExtensionAngle.toFixed(1)}° (angle between vectors: ${angleDegrees.toFixed(1)}°)`);
            } else {
              result.wristFlexionAngle = Math.min(angleDegrees, 80);
              result.wristExtensionAngle = 0;
              console.log(`Wrist flexion: ${result.wristFlexionAngle.toFixed(1)}° (angle between vectors: ${angleDegrees.toFixed(1)}°)`);
            }
          } else {
            // Neutral position - vectors are aligned
            result.wristFlexionAngle = 0;
            result.wristExtensionAngle = 0;
            console.log(`Wrist neutral: ${angleDegrees.toFixed(1)}° deviation from alignment`);
          }
        }

        console.log(`Elbow-referenced calculation (${handType}): ${Math.abs(forearmToHandAngle - 180).toFixed(1)}° deviation from neutral (${forearmToHandAngle.toFixed(1)}° raw angle)`);
      }
    }
  }

  // Disable fallback hand-only calculation to prevent unrealistic angles
  // Only use elbow-referenced calculations for accuracy

  return result;
}

export function calculateMaxElbowWristAngles(
  motionFrames: Array<{
    landmarks: HandLandmark[];
    poseLandmarks?: PoseLandmark[];
  }>
): ElbowWristAngles {
  let maxResult: ElbowWristAngles = {
    forearmToHandAngle: 0,
    wristFlexionAngle: 0,
    wristExtensionAngle: 0,
    elbowDetected: false,
    handType: 'UNKNOWN',
    confidence: 0
  };

  for (const frame of motionFrames) {
    const frameResult = calculateElbowReferencedWristAngle(frame.landmarks, frame.poseLandmarks);
    
    if (frameResult.confidence > maxResult.confidence) {
      maxResult.handType = frameResult.handType;
      maxResult.elbowDetected = frameResult.elbowDetected;
      maxResult.confidence = frameResult.confidence;
    }

    maxResult.wristFlexionAngle = Math.max(maxResult.wristFlexionAngle, frameResult.wristFlexionAngle);
    maxResult.wristExtensionAngle = Math.max(maxResult.wristExtensionAngle, frameResult.wristExtensionAngle);
    maxResult.forearmToHandAngle = Math.max(maxResult.forearmToHandAngle, frameResult.forearmToHandAngle);
  }

  return maxResult;
}