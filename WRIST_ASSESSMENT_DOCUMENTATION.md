# Wrist Flexion/Extension Assessment System Documentation

## Overview
The wrist flexion/extension assessment system provides precise biomechanical analysis of wrist range of motion using MediaPipe Holistic for real-time motion tracking. The system combines hand landmark detection with pose estimation to calculate anatomically accurate wrist angles referenced to the elbow position.

## Technical Architecture

### Core Components

#### 1. MediaPipe Holistic Integration (`client/src/components/holistic-tracker.tsx`)
- **Purpose**: Real-time hand and pose landmark detection
- **Technology**: MediaPipe Holistic with comprehensive body tracking
- **Configuration**:
  ```typescript
  holisticInstance.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    refineFaceLandmarks: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  ```

#### 2. Elbow-Referenced Wrist Angle Calculation (`shared/elbow-wrist-calculator.ts`)
- **Core Algorithm**: Uses elbow-to-wrist as reference line and wrist-to-middle-finger-MCP as measurement line
- **Anatomical Accuracy**: Provides true forearm-to-hand angle measurement
- **Hand Type Detection**: Automatically determines LEFT/RIGHT hand based on pose landmark proximity

### Data Flow

#### Recording Phase
1. **Initialization**:
   ```typescript
   // Reset hand type tracking for new session
   lastHandTypeRef.current = 'UNKNOWN';
   handTypeConfidenceRef.current = 0;
   setSessionHandType('UNKNOWN');
   ```

2. **Hand Type Locking**:
   ```typescript
   // Permanent hand type locking - once detected, never changes
   if (currentDetection.handType !== 'UNKNOWN' && lastHandTypeRef.current === 'UNKNOWN') {
     lastHandTypeRef.current = currentDetection.handType;
     handTypeConfidenceRef.current = 1;
     console.log(`🔒 PERMANENTLY LOCKED onto ${currentDetection.handType} hand for this entire session`);
   }
   ```

3. **Motion Data Capture**:
   ```typescript
   const motionFrame = {
     timestamp: currentTime,
     landmarks: data.landmarks.map(landmark => ({
       x: parseFloat(landmark.x) || 0,
       y: parseFloat(landmark.y) || 0,
       z: parseFloat(landmark.z) || 0
     })),
     poseLandmarks: data.poseLandmarks || [],
     wristAngles: frameWristAngles || data.wristAngles || null,
     handedness: sessionHandType !== 'UNKNOWN' ? sessionHandType : (data.handType || "Right"),
     sessionHandType: sessionHandType,
     quality: data.trackingQuality === "Excellent" ? 90 : data.trackingQuality === "Good" ? 70 : 50
   };
   ```

#### Calculation Logic

##### Elbow-Referenced Angle Calculation
```typescript
export function calculateElbowReferencedWristAngle(
  handLandmarks: HandLandmark[],
  poseLandmarks?: PoseLandmark[]
): ElbowWristAngles {
  // 1. Determine hand type (LEFT/RIGHT) based on pose landmark proximity
  const handType = determineHandType(handLandmarks, poseLandmarks);
  
  // 2. Select appropriate elbow and wrist landmarks
  const elbowIndex = handType === 'LEFT' ? POSE_LANDMARKS.LEFT_ELBOW : POSE_LANDMARKS.RIGHT_ELBOW;
  const wristIndex = handType === 'LEFT' ? POSE_LANDMARKS.LEFT_WRIST : POSE_LANDMARKS.RIGHT_WRIST;
  
  // 3. Calculate reference vector (elbow to wrist base)
  const referenceVector = {
    x: handWrist.x - elbow.x,
    y: handWrist.y - elbow.y,
    z: handWrist.z - elbow.z
  };
  
  // 4. Calculate measurement vector (wrist base to middle finger MCP)
  const measurementVector = {
    x: middleMcp.x - handWrist.x,
    y: middleMcp.y - handWrist.y,
    z: middleMcp.z - handWrist.z
  };
  
  // 5. Calculate angle between vectors
  const angleDegrees = calculateAngleBetweenVectors(elbowPoint, wristPoint, mcpPoint);
  
  // 6. Determine flexion vs extension using cross product
  const crossProduct = {
    x: referenceNorm.y * measurementNorm.z - referenceNorm.z * measurementNorm.y,
    y: referenceNorm.z * measurementNorm.x - referenceNorm.x * measurementNorm.z,
    z: referenceNorm.x * measurementNorm.y - referenceNorm.y * measurementNorm.x
  };
  
  // 7. Hand-specific flexion/extension classification
  const isExtension = handType === 'LEFT' ? crossProduct.y > 0 : crossProduct.y < 0;
}
```

##### Hand Type Determination with Temporal Consistency
```typescript
function determineHandType(
  handLandmarks: HandLandmark[],
  poseLandmarks: PoseLandmark[]
): 'LEFT' | 'RIGHT' | 'UNKNOWN' {
  // Distance-based detection with visibility thresholds
  const distanceToLeft = euclideanDistance3D(handWrist, leftPoseWrist);
  const distanceToRight = euclideanDistance3D(handWrist, rightPoseWrist);
  
  // Confidence checks to prevent false detections
  const isLeftCloser = distanceToLeft < distanceToRight;
  
  if (isLeftCloser) {
    if (leftWristVisibility > 0.5 && leftElbowVisibility > 0.5) {
      const distanceRatio = distanceToRight / distanceToLeft;
      if (distanceRatio > 1.2) return 'LEFT';
    }
  } else {
    if (rightWristVisibility > 0.5 && rightElbowVisibility > 0.5) {
      const distanceRatio = distanceToLeft / distanceToRight;
      if (distanceRatio > 1.2) return 'RIGHT';
    }
  }
  
  // Fallback detection
  if ((isLeftCloser && leftWristVisibility > 0.3) || (!isLeftCloser && rightWristVisibility > 0.3)) {
    return isLeftCloser ? 'LEFT' : 'RIGHT';
  }
  
  return 'UNKNOWN';
}
```

### Data Storage

#### Motion Data Structure
```typescript
interface MotionFrame {
  timestamp: number;
  landmarks: Array<{x: number, y: number, z: number}>;
  poseLandmarks: Array<{x: number, y: number, z: number, visibility: number}>;
  wristAngles: {
    forearmToHandAngle: number;
    wristFlexionAngle: number;
    wristExtensionAngle: number;
    elbowDetected: boolean;
    handType: 'LEFT' | 'RIGHT' | 'UNKNOWN';
    confidence: number;
  } | null;
  handedness: string;
  sessionHandType: 'LEFT' | 'RIGHT' | 'UNKNOWN';
  quality: number;
}
```

#### Database Schema (PostgreSQL)
```sql
-- User assessments table stores completion data
CREATE TABLE user_assessments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  assessment_id INTEGER REFERENCES assessments(id),
  wrist_flexion_angle DECIMAL,
  wrist_extension_angle DECIMAL,
  max_wrist_flexion DECIMAL,
  max_wrist_extension DECIMAL,
  motion_data JSONB, -- Stores complete motion tracking data
  completed_at TIMESTAMP DEFAULT NOW()
);
```

### Visualization System

#### Real-time Visualization (`client/src/components/holistic-tracker.tsx`)
- **Blue Line**: Connects elbow to base of hand (anatomically correct reference)
- **Infinite Dashed Yellow Line**: Shows elbow-wrist baseline extended across canvas
- **Hand Landmarks**: 21-point hand skeleton overlay
- **Pose Landmarks**: Elbow and wrist position indicators

#### Replay Visualization (`client/src/components/assessment-replay.tsx`)
```typescript
// Consistent elbow tracking throughout replay
const sessionHandType = frame.sessionHandType || frame.handedness || currentWristAngles.handType;
const elbowIndex = sessionHandType === 'LEFT' ? 13 : 14; // Left elbow: 13, Right elbow: 14
const poseWristIndex = sessionHandType === 'LEFT' ? 15 : 16; // Left wrist: 15, Right wrist: 16

// Draw infinite reference line
const referenceVector = { x: wristX - elbowX, y: wristY - elbowY };
const normalizedRef = {
  x: referenceVector.x / referenceLength,
  y: referenceVector.y / referenceLength
};

// Extend line across entire canvas
const extensionLength = Math.max(canvas.width, canvas.height) * 2;
ctx.strokeStyle = '#fbbf24'; // Yellow
ctx.lineWidth = 2;
ctx.setLineDash([8, 4]); // Dashed pattern
```

### Results Processing

#### Maximum Angle Extraction
```typescript
export function calculateMaxElbowWristAngles(
  motionFrames: Array<{wristAngles: ElbowWristAngles}>
): ElbowWristAngles {
  let maxResult: ElbowWristAngles = {
    forearmToHandAngle: 0,
    wristFlexionAngle: 0,
    wristExtensionAngle: 0,
    elbowDetected: false,
    handType: 'UNKNOWN',
    confidence: 0
  };

  motionFrames.forEach(frame => {
    if (frame.wristAngles && frame.wristAngles.elbowDetected) {
      if (frame.wristAngles.wristFlexionAngle > maxResult.wristFlexionAngle) {
        maxResult.wristFlexionAngle = frame.wristAngles.wristFlexionAngle;
      }
      if (frame.wristAngles.wristExtensionAngle > maxResult.wristExtensionAngle) {
        maxResult.wristExtensionAngle = frame.wristAngles.wristExtensionAngle;
      }
    }
  });

  return maxResult;
}
```

#### Database Storage Processing
```typescript
// Server-side processing (server/routes.ts)
const repetitionWristAngles = calculateMaxElbowWristAngles(motionData);

await storage.updateUserAssessment(userAssessmentId, {
  wristFlexionAngle: repetitionWristAngles.wristFlexionAngle,
  wristExtensionAngle: repetitionWristAngles.wristExtensionAngle,
  maxWristFlexion: repetitionWristAngles.wristFlexionAngle,
  maxWristExtension: repetitionWristAngles.wristExtensionAngle,
  motionData: JSON.stringify(motionData)
});
```

### Landmark Reference Points

#### Hand Landmarks (MediaPipe Hand)
```typescript
const HAND_LANDMARKS = {
  WRIST: 0,           // Base of hand
  MIDDLE_MCP: 9,      // Middle finger metacarpophalangeal joint
  INDEX_TIP: 8,       // Index finger tip
  MIDDLE_TIP: 12,     // Middle finger tip
  RING_TIP: 16,       // Ring finger tip
  PINKY_TIP: 20       // Pinky finger tip
};
```

#### Pose Landmarks (MediaPipe Pose)
```typescript
const POSE_LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16
};
```

### Temporal Consistency Implementation

#### Session-Wide Hand Type Persistence
```typescript
// Recording component state
const [sessionHandType, setSessionHandType] = useState<'LEFT' | 'RIGHT' | 'UNKNOWN'>('UNKNOWN');

// Hand type locking in holistic tracker
const lastHandTypeRef = useRef<'LEFT' | 'RIGHT' | 'UNKNOWN'>('UNKNOWN');
const handTypeConfidenceRef = useRef(0);

// Reset mechanism for new recordings
useEffect(() => {
  if (isRecording) {
    lastHandTypeRef.current = 'UNKNOWN';
    handTypeConfidenceRef.current = 0;
    setSessionHandType('UNKNOWN');
    console.log('🔄 Reset session hand type for new recording');
  }
}, [isRecording]);
```

### Error Handling and Edge Cases

#### Visibility Thresholds
- Minimum elbow visibility: 0.5
- Minimum wrist visibility: 0.5
- Fallback visibility threshold: 0.3

#### Distance Validation
- Minimum distance ratio for hand type confidence: 1.2
- Prevents false hand type switching due to pose ambiguity

#### Angle Validation
- Neutral position threshold: 160° (vectors nearly aligned)
- Maximum flexion cap: 80°
- Maximum extension cap: 70°

### Performance Optimizations

#### Real-time Processing
- 30 FPS processing rate
- Landmark smoothing enabled
- Minimal computational overhead for real-time feedback

#### Memory Management
- Motion data captured only during recording (10-second window)
- Efficient landmark coordinate storage
- JSON compression for database storage

### Integration Points

#### Frontend Routes
- `/assessment/28/record` - Recording interface
- `/wrist-results/{userCode}/{userAssessmentId}` - Results visualization
- `/assessment-results/{userCode}/{userAssessmentId}/replay` - Motion replay

#### API Endpoints
- `POST /api/users/{userId}/assessments/{assessmentId}/start` - Initialize recording
- `POST /api/users/{userId}/assessments/{assessmentId}/complete` - Save results
- `GET /api/user-assessments/{userAssessmentId}/details` - Retrieve results
- `GET /api/user-assessments/{userAssessmentId}/motion-data` - Retrieve motion data

### Clinical Accuracy Features

#### Anatomically Correct Measurements
- Uses actual forearm bone (elbow-to-wrist) as reference
- Measures hand deviation from neutral forearm position
- Accounts for individual anatomical variations

#### Bilateral Hand Support
- Automatic left/right hand detection
- Hand-specific flexion/extension classification
- Consistent tracking throughout assessment

#### Quality Assurance
- Real-time tracking quality indicators
- Confidence scoring for each measurement
- Elbow detection validation before angle calculation

## Implementation Checklist

To replicate this system:

1. **Install Dependencies**:
   ```bash
   npm install @mediapipe/holistic @mediapipe/drawing_utils @mediapipe/camera_utils
   ```

2. **Setup MediaPipe Holistic**:
   - Configure holistic instance with pose and hand detection
   - Implement processHolisticResults callback
   - Setup camera and canvas for real-time visualization

3. **Implement Angle Calculation**:
   - Create elbow-wrist-calculator.ts with vector math
   - Implement hand type determination logic
   - Add temporal consistency mechanisms

4. **Database Integration**:
   - Setup PostgreSQL with motion data storage
   - Implement JSONB storage for complex motion data
   - Create API endpoints for data persistence

5. **Visualization Components**:
   - Real-time landmark overlay
   - Motion replay with consistent elbow tracking
   - Reference line visualization

6. **Quality Control**:
   - Implement visibility thresholds
   - Add confidence scoring
   - Create session-wide consistency mechanisms

This system provides clinical-grade wrist range of motion assessment with precise biomechanical accuracy and comprehensive motion tracking capabilities.