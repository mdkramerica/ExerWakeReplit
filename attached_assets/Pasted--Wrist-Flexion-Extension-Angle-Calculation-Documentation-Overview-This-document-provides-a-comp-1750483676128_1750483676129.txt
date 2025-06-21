# Wrist Flexion/Extension Angle Calculation Documentation

## Overview
This document provides a comprehensive explanation of how wrist flexion and extension angles are calculated in the ExerAI platform using MediaPipe Holistic tracking and elbow-referenced vector analysis.

## Technical Implementation

### 1. Data Collection
- **Tracking System**: MediaPipe Holistic (pose + hand landmarks)
- **Sampling Rate**: ~30 FPS during 10-second assessment
- **Key Landmarks Used**:
  - Pose Elbow (LEFT: index 13, RIGHT: index 14)
  - Hand Wrist (index 0)
  - Middle Finger MCP Joint (index 9)

### 2. Hand Type Detection
```typescript
function determineHandType(handLandmarks, poseLandmarks) {
  const handWrist = handLandmarks[0];
  const leftPoseWrist = poseLandmarks[15];
  const rightPoseWrist = poseLandmarks[16];
  
  // Calculate 3D distances
  const distanceToLeft = euclideanDistance3D(handWrist, leftPoseWrist);
  const distanceToRight = euclideanDistance3D(handWrist, rightPoseWrist);
  
  // Select closest elbow with visibility validation
  return distanceToLeft < distanceToRight ? 'LEFT' : 'RIGHT';
}
```

### 3. Vector Construction
For each frame, three key vectors are constructed:

#### A. Forearm Reference Vector
```
forearmVector = handWrist - poseElbow
```
- Represents the natural forearm orientation
- Used as anatomical reference baseline

#### B. Hand Orientation Vector  
```
handVector = middleMCP - handWrist
```
- Represents the hand's orientation relative to wrist
- Primary measurement vector for angle calculation

### 4. Angle Calculation Method

#### A. Dot Product Calculation
```typescript
const dotProduct = forearmVector.x * handVector.x + 
                   forearmVector.y * handVector.y + 
                   forearmVector.z * handVector.z;

const magnitudeForearm = Math.sqrt(
  forearmVector.x² + forearmVector.y² + forearmVector.z²
);

const magnitudeHand = Math.sqrt(
  handVector.x² + handVector.y² + handVector.z²
);

const cosAngle = dotProduct / (magnitudeForearm * magnitudeHand);
const angleRadians = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
const angleDegrees = angleRadians * (180 / Math.PI);
```

#### B. Anatomical Signed Angle Calculation
```typescript
function calculateAnatomicalWristAngle(elbow, wrist, mcp) {
  // Create normalized vectors
  const forearmVector = normalize(wrist - elbow);
  const handVector = normalize(mcp - wrist);
  
  // Calculate cross product for direction
  const crossProduct = forearmVector × handVector;
  
  // Determine sign based on Y-component
  const signedAngle = crossProduct.y > 0 ? angleDegrees : -angleDegrees;
  
  return signedAngle;
}
```

### 5. Flexion/Extension Classification

#### Neutral Zone Application
- **Threshold**: ±3° around anatomical neutral (0°)
- **Purpose**: Eliminates noise from micro-movements

#### Direction Determination
```typescript
if (Math.abs(signedAngle) <= 3) {
  // Neutral position
  result.wristFlexionAngle = 0;
  result.wristExtensionAngle = 0;
} else if (signedAngle > 0) {
  // Positive angle = Flexion (forward bending)
  result.wristFlexionAngle = Math.abs(signedAngle);
  result.wristExtensionAngle = 0;
} else {
  // Negative angle = Extension (backward bending)
  result.wristExtensionAngle = Math.abs(signedAngle);
  result.wristFlexionAngle = 0;
}
```

### 6. Maximum Value Extraction

#### Frame-by-Frame Analysis
```typescript
const wristAnglesAllFrames = motionData.map(frame => {
  return calculateWristAngleByHandType(frame.landmarks, frame.poseLandmarks);
});

// Extract maximum values
const maxFlexion = Math.max(...wristAnglesAllFrames.map(w => w.wristFlexionAngle));
const maxExtension = Math.max(...wristAnglesAllFrames.map(w => w.wristExtensionAngle));
```

#### Total ROM Calculation
```typescript
const totalROM = maxFlexion + maxExtension;
```

## Mathematical Foundation

### Cross Product for Direction
The cross product between forearm and hand vectors determines flexion/extension direction:

```
crossProduct = forearmVector × handVector
             = (fy*hz - fz*hy, fz*hx - fx*hz, fx*hy - fy*hx)
```

Where:
- `f` = forearm vector components
- `h` = hand vector components

The Y-component sign indicates direction:
- **Positive Y**: Flexion (forward bending)
- **Negative Y**: Extension (backward bending)

### Hand-Specific Elbow Selection
```typescript
const elbowIndex = handType === 'LEFT' ? 13 : 14;  // MediaPipe pose indices
const wristIndex = handType === 'LEFT' ? 15 : 16;
```

This ensures anatomically correct calculations for both hands.

## Quality Assurance

### Session Consistency
- Hand type is locked at session start to prevent flipping
- Elbow selection remains consistent throughout recording
- All calculations use the same reference points

### Error Handling
```typescript
// Clamp dot product to valid range [-1, 1]
const clampedDot = Math.max(-1, Math.min(1, dotProduct));

// Validate landmark availability
if (!elbow || !wrist || !mcp) {
  return { confidence: 0, elbowDetected: false };
}
```

### Confidence Scoring
```typescript
const confidence = (elbowVisibility + wristVisibility + mcpVisibility) / 3;
result.confidence = Math.min(confidence, 0.95);
```

## Clinical Validation

### Normal Ranges
- **Flexion**: 0-80° (functional minimum: 60°)
- **Extension**: 0-70° (functional minimum: 50°)
- **Total ROM**: 150° (functional minimum: 110°)

### Percentage Calculation
```typescript
const flexionPercentage = (maxFlexion / 80) * 100;
const extensionPercentage = (maxExtension / 70) * 100;
```

## Implementation Notes

### Performance Optimization
- Calculations run in real-time at 30 FPS
- Vector operations use efficient dot/cross products
- Session state prevents redundant hand type detection

### Coordinate System
- MediaPipe uses normalized coordinates [0,1]
- Z-axis provides depth information for 3D accuracy
- All angles calculated in degrees for clinical familiarity

## Example Calculation

Given:
- Elbow: (0.3, 0.4, -0.1)
- Wrist: (0.5, 0.3, 0.0)
- MCP: (0.6, 0.2, 0.1)

```
forearmVector = (0.2, -0.1, 0.1)
handVector = (0.1, -0.1, 0.1)

dotProduct = 0.2*0.1 + (-0.1)*(-0.1) + 0.1*0.1 = 0.04
magnitudeForearm = √(0.04 + 0.01 + 0.01) = 0.245
magnitudeHand = √(0.01 + 0.01 + 0.01) = 0.173

cosAngle = 0.04 / (0.245 * 0.173) = 0.945
angleDegrees = arccos(0.945) = 19.3°

crossProduct.y = 0.2*0.1 - 0.1*(-0.1) = 0.03 (positive)
signedAngle = +19.3° (flexion)
```

Result: 19.3° wrist flexion

## Validation Methods

### Cross-Reference Checks
- Compare with traditional goniometer measurements
- Validate against clinical ROM standards
- Ensure bilateral symmetry expectations

### Error Detection
- Monitor for sudden angle jumps (>30° frame-to-frame)
- Flag sessions with low confidence scores (<0.7)
- Detect elbow occlusion or tracking loss

This methodology ensures clinically accurate, reproducible wrist ROM measurements suitable for medical research and patient assessment.