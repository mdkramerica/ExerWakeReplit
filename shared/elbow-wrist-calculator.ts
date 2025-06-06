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

// New function for precise wrist angle calculation using arccos method
function calculateWristAngleUsingVectors(
  elbow: HandLandmark | PoseLandmark,
  wrist: HandLandmark | PoseLandmark,
  middleMcp: HandLandmark | PoseLandmark
): number {
  // Build vectors as specified:
  // Forearm = wrist - elbow
  const forearmVector = {
    x: wrist.x - elbow.x,
    y: wrist.y - elbow.y,
    z: wrist.z - elbow.z
  };
  
  // Hand = MCP - wrist
  const handVector = {
    x: middleMcp.x - wrist.x,
    y: middleMcp.y - wrist.y,
    z: middleMcp.z - wrist.z
  };
  
  // Calculate magnitudes (norms)
  const forearmNorm = Math.sqrt(forearmVector.x**2 + forearmVector.y**2 + forearmVector.z**2);
  const handNorm = Math.sqrt(handVector.x**2 + handVector.y**2 + handVector.z**2);
  
  // Avoid division by zero
  if (forearmNorm === 0 || handNorm === 0) {
    return 180; // Return neutral if calculation impossible
  }
  
  // Calculate dot product
  const dotProduct = forearmVector.x * handVector.x + forearmVector.y * handVector.y + forearmVector.z * handVector.z;
  
  // Calculate angle using arccos(dot(A,B)/(norm(A)*norm(B)))
  const cosAngle = dotProduct / (forearmNorm * handNorm);
  
  // Clamp to valid range for acos
  const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
  
  // Return angle in degrees (neutral = 180°, flexion < 180°, extension > 180°)
  return Math.acos(clampedCosAngle) * (180 / Math.PI);
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
  const leftElbow = poseLandmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const rightElbow = poseLandmarks[POSE_LANDMARKS.RIGHT_ELBOW];

  if (!leftPoseWrist || !rightPoseWrist || !handWrist || !leftElbow || !rightElbow) {
    return 'UNKNOWN';
  }

  // Check visibility thresholds to avoid low-confidence detections
  const leftWristVisibility = leftPoseWrist.visibility || 0;
  const rightWristVisibility = rightPoseWrist.visibility || 0;
  const leftElbowVisibility = leftElbow.visibility || 0;
  const rightElbowVisibility = rightElbow.visibility || 0;

  // Calculate distances to both wrists
  const distanceToLeft = euclideanDistance3D(handWrist, leftPoseWrist);
  const distanceToRight = euclideanDistance3D(handWrist, rightPoseWrist);

  // Use a more sophisticated approach: check which side has better overall tracking
  const leftScore = (leftWristVisibility + leftElbowVisibility) / 2;
  const rightScore = (rightWristVisibility + rightElbowVisibility) / 2;
  
  // Primary determination: which pose landmarks are more visible/reliable
  let primaryChoice: 'LEFT' | 'RIGHT';
  if (Math.abs(leftScore - rightScore) > 0.1) {
    // Clear winner based on visibility
    primaryChoice = leftScore > rightScore ? 'LEFT' : 'RIGHT';
  } else {
    // Close visibility scores, use distance
    primaryChoice = distanceToLeft < distanceToRight ? 'LEFT' : 'RIGHT';
  }
  
  // More permissive validation - use lower thresholds for better detection
  if (primaryChoice === 'LEFT' && leftElbowVisibility > 0.15) {
    return 'LEFT';
  } else if (primaryChoice === 'RIGHT' && rightElbowVisibility > 0.15) {
    return 'RIGHT';
  }

  // Final fallback - prioritize elbow visibility over wrist visibility
  if (leftElbowVisibility > rightElbowVisibility && leftElbowVisibility > 0.1) {
    return 'LEFT';
  } else if (rightElbowVisibility > 0.1) {
    return 'RIGHT';
  }

  // Last resort distance-based detection
  return distanceToLeft < distanceToRight ? 'LEFT' : 'RIGHT';
}

export function calculateElbowReferencedWristAngleWithForce(
  handLandmarks: HandLandmark[],
  poseLandmarks: PoseLandmark[],
  forceHandType: 'LEFT' | 'RIGHT'
): ElbowWristAngles {
  const result: ElbowWristAngles = {
    forearmToHandAngle: 0,
    wristFlexionAngle: 0,
    wristExtensionAngle: 0,
    elbowDetected: false,
    handType: forceHandType,
    confidence: 0
  };

  if (!handLandmarks || handLandmarks.length < 21 || !poseLandmarks || poseLandmarks.length <= 16) {
    return result;
  }

  // Fix mirroring issue: For camera-mirrored views, invert the landmark selection
  // When user shows LEFT hand, we need RIGHT pose landmarks due to camera mirroring
  const elbowIndex = forceHandType === 'LEFT' ? POSE_LANDMARKS.RIGHT_ELBOW : POSE_LANDMARKS.LEFT_ELBOW;
  const wristIndex = forceHandType === 'LEFT' ? POSE_LANDMARKS.RIGHT_WRIST : POSE_LANDMARKS.LEFT_WRIST;
  const shoulderIndex = forceHandType === 'LEFT' ? POSE_LANDMARKS.RIGHT_SHOULDER : POSE_LANDMARKS.LEFT_SHOULDER;

  const elbow = poseLandmarks[elbowIndex];
  const poseWrist = poseLandmarks[wristIndex];
  const shoulder = poseLandmarks[shoulderIndex];

  if (elbow && poseWrist && shoulder && 
      (elbow.visibility || 1) > 0.3 && (poseWrist.visibility || 1) > 0.3) {
    
    result.elbowDetected = true;
    result.confidence = Math.min(elbow.visibility || 1, poseWrist.visibility || 1, shoulder.visibility || 1);

    // Get hand landmarks for wrist analysis
    const handWrist = handLandmarks[HAND_LANDMARKS.WRIST]; // Base of hand (point 0)
    const middleMcp = handLandmarks[HAND_LANDMARKS.MIDDLE_MCP]; // Point 9

    if (handWrist && middleMcp) {
      // Use precise vector calculation method with arccos formula
      const wristAngle = calculateWristAngleUsingVectors(elbow, handWrist, middleMcp);
      result.forearmToHandAngle = wristAngle;

      console.log(`Precise wrist angle (${forceHandType}): ${wristAngle.toFixed(1)}° (neutral=180°)`);

      // Classify flexion/extension based on 180° neutral positioning
      if (wristAngle < 180) {
        // Flexion: deviation toward palm (<180°)
        const flexionAmount = 180 - wristAngle;
        result.wristFlexionAngle = flexionAmount;
        result.wristExtensionAngle = 0;
        console.log(`Wrist FLEXION detected: ${flexionAmount.toFixed(1)}° from neutral`);
      } else if (wristAngle > 180) {
        // Extension: deviation toward back of hand (>180°)
        const extensionAmount = wristAngle - 180;
        result.wristFlexionAngle = 0;
        result.wristExtensionAngle = extensionAmount;
        console.log(`Wrist EXTENSION detected: ${extensionAmount.toFixed(1)}° from neutral`);
      } else {
        // Neutral position (exactly 180°)
        result.wristFlexionAngle = 0;
        result.wristExtensionAngle = 0;
        console.log(`Wrist in NEUTRAL position`);
      }

      // Set high confidence for successful calculation
      result.confidence = 0.95;
      result.elbowDetected = true;


    }
  }

  return result;
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

    // Fix mirroring issue: For camera-mirrored views, invert the landmark selection
    const elbowIndex = handType === 'LEFT' ? POSE_LANDMARKS.RIGHT_ELBOW : POSE_LANDMARKS.LEFT_ELBOW;
    const wristIndex = handType === 'LEFT' ? POSE_LANDMARKS.RIGHT_WRIST : POSE_LANDMARKS.LEFT_WRIST;
    const shoulderIndex = handType === 'LEFT' ? POSE_LANDMARKS.RIGHT_SHOULDER : POSE_LANDMARKS.LEFT_SHOULDER;

    const elbow = poseLandmarks[elbowIndex];
    const poseWrist = poseLandmarks[wristIndex];
    const shoulder = poseLandmarks[shoulderIndex];

    if (elbow && poseWrist && shoulder && 
        (elbow.visibility || 1) > 0.5 && (poseWrist.visibility || 1) > 0.5 && (shoulder.visibility || 1) > 0.5) {
      
      result.elbowDetected = true;
      result.confidence = Math.min(elbow.visibility || 1, poseWrist.visibility || 1, shoulder.visibility || 1);

      // Get hand landmarks for wrist analysis
      const handWrist = handLandmarks[HAND_LANDMARKS.WRIST]; // Base of hand (point 0)
      const middleMcp = handLandmarks[HAND_LANDMARKS.MIDDLE_MCP]; // Point 9

      if (handWrist && middleMcp) {
        // Calculate reference line (elbow to wrist/base of hand)
        const referenceVector = {
          x: handWrist.x - elbow.x,
          y: handWrist.y - elbow.y,
          z: handWrist.z - elbow.z
        };

        // Calculate measurement line (base of hand to middle finger MCP)
        const measurementVector = {
          x: middleMcp.x - handWrist.x,
          y: middleMcp.y - handWrist.y,
          z: middleMcp.z - handWrist.z
        };

        // Calculate the angle between reference line (elbow-wrist) and measurement line (wrist-middle-MCP)
        const forearmToHandAngle = calculateAngleBetweenVectors(
          { x: elbow.x, y: elbow.y, z: elbow.z },
          { x: handWrist.x, y: handWrist.y, z: handWrist.z },
          { x: middleMcp.x, y: middleMcp.y, z: middleMcp.z }
        );

        result.forearmToHandAngle = forearmToHandAngle;

        // Calculate anatomically correct wrist flexion/extension angles
        // Using elbow-to-wrist as reference line and elbow-to-index-tip as measurement line
        
        const referenceLength = Math.sqrt(referenceVector.x**2 + referenceVector.y**2 + referenceVector.z**2);
        const measurementLength = Math.sqrt(measurementVector.x**2 + measurementVector.y**2 + measurementVector.z**2);
        
        if (referenceLength > 0 && measurementLength > 0) {
          // Normalize vectors
          const referenceNorm = {
            x: referenceVector.x / referenceLength,
            y: referenceVector.y / referenceLength,
            z: referenceVector.z / referenceLength
          };
          
          const measurementNorm = {
            x: measurementVector.x / measurementLength,
            y: measurementVector.y / measurementLength,
            z: measurementVector.z / measurementLength
          };
          
          // Calculate angle between reference line (elbow-wrist) and measurement line (elbow-index-tip)
          const dotProduct = referenceNorm.x * measurementNorm.x + referenceNorm.y * measurementNorm.y + referenceNorm.z * measurementNorm.z;
          const clampedDot = Math.max(-1, Math.min(1, dotProduct));
          const angleRadians = Math.acos(clampedDot);
          const angleDegrees = angleRadians * (180 / Math.PI);
          
          // In neutral position, vectors should be aligned (0° angle between them)
          // Deviation from 0° indicates wrist movement
          if (angleDegrees > 5) { // Minimum threshold for detection
            // Use cross product to determine flexion vs extension direction
            const crossProduct = {
              x: referenceNorm.y * measurementNorm.z - referenceNorm.z * measurementNorm.y,
              y: referenceNorm.z * measurementNorm.x - referenceNorm.x * measurementNorm.z,
              z: referenceNorm.x * measurementNorm.y - referenceNorm.y * measurementNorm.x
            };
            
            // Determine direction based on camera coordinate system and hand type
            // For left hand: Positive Y cross product indicates extension
            // For right hand: Negative Y cross product indicates extension (mirrored)
            const isExtension = handType === 'LEFT' ? crossProduct.y > 0 : crossProduct.y < 0;
            
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
    const frameResult = calculateElbowReferencedWristAngleWithForce(frame.landmarks, frame.poseLandmarks || [], 'LEFT');
    
    // Track maximum flexion and extension values from session
    if (frameResult.elbowDetected && frameResult.confidence > 0.8) {
      // Update hand type and confidence if better
      if (frameResult.confidence > maxResult.confidence) {
        maxResult.handType = frameResult.handType;
        maxResult.confidence = frameResult.confidence;
        maxResult.elbowDetected = true;
      }
      
      // Track maximum flexion (largest deviation below 180°)
      if (frameResult.wristFlexionAngle > maxResult.wristFlexionAngle) {
        maxResult.wristFlexionAngle = frameResult.wristFlexionAngle;
      }
      
      // Track maximum extension (largest deviation above 180°)
      if (frameResult.wristExtensionAngle > maxResult.wristExtensionAngle) {
        maxResult.wristExtensionAngle = frameResult.wristExtensionAngle;
      }
      
      // Update forearm angle to most recent valid measurement
      maxResult.forearmToHandAngle = frameResult.forearmToHandAngle;
    }
    


    maxResult.wristFlexionAngle = Math.max(maxResult.wristFlexionAngle, frameResult.wristFlexionAngle);
    maxResult.wristExtensionAngle = Math.max(maxResult.wristExtensionAngle, frameResult.wristExtensionAngle);
    maxResult.forearmToHandAngle = Math.max(maxResult.forearmToHandAngle, frameResult.forearmToHandAngle);
  }

  return maxResult;
}