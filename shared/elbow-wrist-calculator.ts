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

        // Enhanced flexion/extension detection using 3D hand orientation
        const neutralAngle = 180;
        const deviationFromNeutral = Math.abs(forearmToHandAngle - neutralAngle);
        
        // Calculate hand plane normal using three points: wrist, index MCP, middle MCP
        const wristToIndex = {
          x: indexMcp.x - handWrist.x,
          y: indexMcp.y - handWrist.y,
          z: indexMcp.z - handWrist.z
        };
        
        const wristToMiddle = {
          x: middleMcp.x - handWrist.x,
          y: middleMcp.y - handWrist.y,
          z: middleMcp.z - handWrist.z
        };
        
        // Cross product to get hand plane normal
        const handNormal = {
          x: wristToIndex.y * wristToMiddle.z - wristToIndex.z * wristToMiddle.y,
          y: wristToIndex.z * wristToMiddle.x - wristToIndex.x * wristToMiddle.z,
          z: wristToIndex.x * wristToMiddle.y - wristToIndex.y * wristToMiddle.x
        };
        
        // Compare hand normal with forearm vector to determine flexion/extension
        const forearmDotHandNormal = forearmVector.x * handNormal.x + 
                                    forearmVector.y * handNormal.y + 
                                    forearmVector.z * handNormal.z;
        
        // Use Y-coordinate comparison for movement direction
        const handToElbowY = elbow.y - knuckleCenter.y;
        const wristToElbowY = elbow.y - poseWrist.y;
        const relativeHandPosition = handToElbowY - wristToElbowY;
        
        if (deviationFromNeutral > 15) { // Only consider significant movements
          if (relativeHandPosition > 0) {
            // Hand is above elbow-wrist line - extension (dorsiflexion)
            result.wristExtensionAngle = Math.min(deviationFromNeutral * 0.7, 70);
            result.wristFlexionAngle = 0;
            console.log(`Detected wrist extension: ${result.wristExtensionAngle.toFixed(1)}°`);
          } else {
            // Hand is below elbow-wrist line - flexion (palmar flexion)
            result.wristFlexionAngle = Math.min(deviationFromNeutral * 0.8, 80);
            result.wristExtensionAngle = 0;
            console.log(`Detected wrist flexion: ${result.wristFlexionAngle.toFixed(1)}°`);
          }
        }

        console.log(`Elbow-referenced calculation (${handType}): ${deviationFromNeutral.toFixed(1)}° deviation from neutral (${forearmToHandAngle.toFixed(1)}° raw angle)`);
      }
    }
  }

  // Fallback to hand-only calculation if pose data unavailable
  if (!result.elbowDetected && handLandmarks.length >= 21) {
    const handWrist = handLandmarks[HAND_LANDMARKS.WRIST];
    const indexMcp = handLandmarks[HAND_LANDMARKS.INDEX_MCP];
    const middleMcp = handLandmarks[HAND_LANDMARKS.MIDDLE_MCP];
    const indexTip = handLandmarks[HAND_LANDMARKS.INDEX_TIP];

    if (handWrist && indexMcp && middleMcp && indexTip) {
      // Approximate wrist angle using hand landmarks only
      const wristToKnuckle = calculateAngleBetweenVectors(handWrist, indexMcp, middleMcp);
      const wristToFinger = calculateAngleBetweenVectors(handWrist, indexMcp, indexTip);
      
      const estimatedWristAngle = Math.abs(wristToKnuckle - 180);
      result.wristFlexionAngle = estimatedWristAngle;
      result.confidence = 0.6; // Lower confidence for hand-only calculation

      console.log(`Hand-only fallback calculation: ${estimatedWristAngle.toFixed(1)}° wrist flexion`);
    }
  }

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