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
  console.log('🔍 Vector calculation input landmarks:', {
    elbow: { x: elbow.x.toFixed(3), y: elbow.y.toFixed(3), z: elbow.z.toFixed(3) },
    wrist: { x: wrist.x.toFixed(3), y: wrist.y.toFixed(3), z: wrist.z.toFixed(3) },
    middleMcp: { x: middleMcp.x.toFixed(3), y: middleMcp.y.toFixed(3), z: middleMcp.z.toFixed(3) }
  });

  // CORRECTED VECTORS: Use pose elbow to hand wrist for forearm vector
  // Forearm vector: from pose elbow TO hand wrist (handLandmark[0])
  const forearmVector = {
    x: wrist.x - elbow.x,
    y: wrist.y - elbow.y,
    z: wrist.z - elbow.z
  };
  
  // Hand vector: from hand wrist TO middle MCP (handLandmark[9])
  const handVector = {
    x: middleMcp.x - wrist.x,
    y: middleMcp.y - wrist.y,
    z: middleMcp.z - wrist.z
  };
  
  // CRITICAL: Normalize vectors first to ensure accurate angle calculation
  const forearmLength = Math.sqrt(forearmVector.x**2 + forearmVector.y**2 + forearmVector.z**2);
  const handLength = Math.sqrt(handVector.x**2 + handVector.y**2 + handVector.z**2);
  
  if (forearmLength === 0 || handLength === 0) {
    console.log('⚠️ Zero length vector, returning 0°');
    return 0;
  }
  
  // Normalize the vectors
  const normalizedForearm = {
    x: forearmVector.x / forearmLength,
    y: forearmVector.y / forearmLength,
    z: forearmVector.z / forearmLength
  };
  
  const normalizedHand = {
    x: handVector.x / handLength,
    y: handVector.y / handLength,
    z: handVector.z / handLength
  };
  
  // Calculate dot product using normalized vectors
  const dotProduct = normalizedForearm.x * normalizedHand.x + normalizedForearm.y * normalizedHand.y + normalizedForearm.z * normalizedHand.z;
  
  console.log('🔍 Normalized vectors:', {
    forearmNormalized: { x: normalizedForearm.x.toFixed(3), y: normalizedForearm.y.toFixed(3), z: normalizedForearm.z.toFixed(3) },
    handNormalized: { x: normalizedHand.x.toFixed(3), y: normalizedHand.y.toFixed(3), z: normalizedHand.z.toFixed(3) }
  });
  
  // For normalized vectors, cosAngle = dotProduct directly
  const cosAngle = dotProduct;
  
  // Clamp to valid range for acos
  const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
  
  console.log('🔍 Angle calculation:', {
    dotProduct: dotProduct.toFixed(3),
    cosAngle: cosAngle.toFixed(3),
    clampedCosAngle: clampedCosAngle.toFixed(3)
  });
  
  // Calculate the angle between vectors (0-180 degrees)
  const angleRadians = Math.acos(clampedCosAngle);
  let angleDegrees = angleRadians * (180 / Math.PI);
  
  // The calculated angle represents the acute angle between forearm and hand vectors
  // This should match exactly what we see visually on the canvas
  console.log('🔍 DETAILED VECTOR ANALYSIS:');
  console.log(`   Forearm Length: ${forearmLength.toFixed(4)}`);
  console.log(`   Hand Length: ${handLength.toFixed(4)}`);
  console.log(`   Dot Product: ${dotProduct.toFixed(6)}`);
  console.log(`   Cos(Angle): ${cosAngle.toFixed(6)}`);
  console.log(`   Angle (rad): ${angleRadians.toFixed(6)}`);
  console.log(`   Angle (deg): ${angleDegrees.toFixed(2)}`);
  console.log(`   Expected Visual: 30-50° for visible flexion`);
  
  // Validate angle against expected physiological range and apply smoothing
  let finalAngle = angleDegrees;
  
  if (finalAngle > 90) {
    console.log(`⚠️ UNREALISTIC ANGLE DETECTED: ${finalAngle.toFixed(1)}° - clamping to 90°`);
    finalAngle = 90; // Maximum physiological wrist flexion/extension
  }
  
  // Apply temporal smoothing for stability
  if ((global as any).lastWristAngle !== undefined) {
    const angleDiff = Math.abs(finalAngle - (global as any).lastWristAngle);
    if (angleDiff > 25) {
      console.log(`⚠️ LARGE ANGLE JUMP: ${(global as any).lastWristAngle.toFixed(1)}° → ${finalAngle.toFixed(1)}° (${angleDiff.toFixed(1)}° change)`);
      // Use weighted average for extreme jumps
      const weight = 0.3; // 30% new value, 70% previous value
      finalAngle = (global as any).lastWristAngle * (1 - weight) + finalAngle * weight;
      console.log(`   Applied smoothing: ${finalAngle.toFixed(1)}°`);
    }
  }
  
  (global as any).lastWristAngle = finalAngle;
  return finalAngle;
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

  console.log(`🔍 Starting calculation - handLandmarks: ${handLandmarks?.length || 0}, poseLandmarks: ${poseLandmarks?.length || 0}, forceHandType: ${forceHandType}`);

  if (!handLandmarks || handLandmarks.length < 21 || !poseLandmarks || poseLandmarks.length <= 16) {
    console.log('❌ Insufficient landmarks for calculation');
    return result;
  }

  // PROXIMITY-BASED STABLE SELECTION: Use closest elbow and lock for session consistency
  let elbowIndex: number;
  let wristIndex: number;
  let shoulderIndex: number;
  
  // Store session elbow selection to prevent mid-assessment switching
  if (!(global as any).sessionElbowLocked) {
    if (poseLandmarks[13] && poseLandmarks[14] && handLandmarks[0]) {
      const distToLeftElbow = euclideanDistance3D(handLandmarks[0], poseLandmarks[13]);
      const distToRightElbow = euclideanDistance3D(handLandmarks[0], poseLandmarks[14]);
      
      const useLeftElbow = distToLeftElbow < distToRightElbow;
      (global as any).sessionElbowIndex = useLeftElbow ? 13 : 14;
      (global as any).sessionWristIndex = useLeftElbow ? 15 : 16;
      (global as any).sessionShoulderIndex = useLeftElbow ? 11 : 12;
      (global as any).sessionElbowLocked = true;
      
      console.log(`🔒 SESSION ELBOW LOCKED: Using ${useLeftElbow ? 'LEFT' : 'RIGHT'} elbow (dist diff: ${Math.abs(distToLeftElbow - distToRightElbow).toFixed(3)})`);
    } else {
      // Fallback to hand type if proximity fails
      const useLeftElbow = forceHandType === 'LEFT';
      (global as any).sessionElbowIndex = useLeftElbow ? 13 : 14;
      (global as any).sessionWristIndex = useLeftElbow ? 15 : 16;
      (global as any).sessionShoulderIndex = useLeftElbow ? 11 : 12;
      (global as any).sessionElbowLocked = true;
      console.log(`🔒 FALLBACK ELBOW LOCK: Using ${forceHandType} based on hand type`);
    }
  }
  
  // Use locked session selection
  elbowIndex = (global as any).sessionElbowIndex;
  wristIndex = (global as any).sessionWristIndex;
  shoulderIndex = (global as any).sessionShoulderIndex;

  console.log(`🔍 Using landmark indices - elbow: ${elbowIndex}, wrist: ${wristIndex}, shoulder: ${shoulderIndex}`);

  const elbow = poseLandmarks[elbowIndex];
  const poseWrist = poseLandmarks[wristIndex];
  const shoulder = poseLandmarks[shoulderIndex];
  
  // DEBUG: Log all pose landmark positions to understand coordinate system
  console.log(`🔍 COORDINATE DEBUG - Hand Type: ${forceHandType}`);
  console.log(`Left Elbow (13): x=${poseLandmarks[13]?.x?.toFixed(3)}, y=${poseLandmarks[13]?.y?.toFixed(3)}`);
  console.log(`Right Elbow (14): x=${poseLandmarks[14]?.x?.toFixed(3)}, y=${poseLandmarks[14]?.y?.toFixed(3)}`);
  console.log(`Selected Elbow (${elbowIndex}): x=${elbow?.x?.toFixed(3)}, y=${elbow?.y?.toFixed(3)}`);
  console.log(`Hand Wrist (0): x=${handLandmarks[0]?.x?.toFixed(3)}, y=${handLandmarks[0]?.y?.toFixed(3)}`);
  
  // Check if we're selecting the correct elbow based on proximity to hand
  if (poseLandmarks[13] && poseLandmarks[14] && handLandmarks[0]) {
    const distToLeftElbow = euclideanDistance3D(handLandmarks[0], poseLandmarks[13]);
    const distToRightElbow = euclideanDistance3D(handLandmarks[0], poseLandmarks[14]);
    console.log(`🔍 PROXIMITY CHECK - Distance to Left Elbow: ${distToLeftElbow.toFixed(3)}, Right Elbow: ${distToRightElbow.toFixed(3)}`);
    console.log(`🔍 CLOSEST ELBOW: ${distToLeftElbow < distToRightElbow ? 'LEFT (13)' : 'RIGHT (14)'}`);
  }

  console.log(`🔍 Pose landmarks availability:`, {
    elbow: { exists: !!elbow, visibility: elbow?.visibility || 'N/A' },
    poseWrist: { exists: !!poseWrist, visibility: poseWrist?.visibility || 'N/A' },
    shoulder: { exists: !!shoulder, visibility: shoulder?.visibility || 'N/A' }
  });

  if (elbow && poseWrist && shoulder && 
      (elbow.visibility || 1) > 0.3 && (poseWrist.visibility || 1) > 0.3) {
    
    console.log('✅ Pose landmarks passed visibility check');
    
    result.elbowDetected = true;
    result.confidence = Math.min(elbow.visibility || 1, poseWrist.visibility || 1, shoulder.visibility || 1);

    // Get hand landmarks for wrist analysis
    const handWrist = handLandmarks[HAND_LANDMARKS.WRIST]; // Base of hand (point 0)
    const middleMcp = handLandmarks[HAND_LANDMARKS.MIDDLE_MCP]; // Point 9

    if (handWrist && middleMcp) {
      // Use precise vector calculation method with arccos formula
      const wristAngle = calculateWristAngleUsingVectors(elbow, handWrist, middleMcp);
      result.forearmToHandAngle = wristAngle;

      console.log(`🔬 FRAME CALCULATION DETAILS for ${forceHandType} hand:`);
      console.log(`   Elbow: (${elbow.x.toFixed(4)}, ${elbow.y.toFixed(4)}, ${elbow.z.toFixed(4)})`);
      console.log(`   Wrist: (${handWrist.x.toFixed(4)}, ${handWrist.y.toFixed(4)}, ${handWrist.z.toFixed(4)})`);
      console.log(`   MCP: (${middleMcp.x.toFixed(4)}, ${middleMcp.y.toFixed(4)}, ${middleMcp.z.toFixed(4)})`);
      console.log(`   Calculated Angle: ${wristAngle.toFixed(1)}°`);

      // Store the raw angle for display
      result.forearmToHandAngle = wristAngle;

      // Determine flexion vs extension based on hand direction relative to forearm
      // Use the middle finger direction to determine movement type
      const wristToMcp = {
        x: middleMcp.x - handWrist.x,
        y: middleMcp.y - handWrist.y,
        z: middleMcp.z - handWrist.z
      };
      
      const elbowToWrist = {
        x: handWrist.x - elbow.x,
        y: handWrist.y - elbow.y,
        z: handWrist.z - elbow.z
      };
      
      // Use cross product to determine if hand is flexed or extended
      // Flexion = hand bent toward palm side, Extension = hand bent toward back
      const crossProduct = elbowToWrist.x * wristToMcp.y - elbowToWrist.y * wristToMcp.x;
      
      if (wristAngle > 5) { // Only classify if there's meaningful deviation
        if (crossProduct > 0) {
          // Flexion movement
          result.wristFlexionAngle = wristAngle;
          result.wristExtensionAngle = 0;
          console.log(`Wrist FLEXION detected: ${wristAngle.toFixed(1)}° deviation`);
        } else {
          // Extension movement  
          result.wristFlexionAngle = 0;
          result.wristExtensionAngle = wristAngle;
          console.log(`Wrist EXTENSION detected: ${wristAngle.toFixed(1)}° deviation`);
        }
      } else {
        // Near neutral position
        result.wristFlexionAngle = 0;
        result.wristExtensionAngle = 0;
        console.log(`Wrist in NEUTRAL position: ${wristAngle.toFixed(1)}°`);
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

    // Correct hand-elbow matching: LEFT hand should use LEFT elbow landmarks
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