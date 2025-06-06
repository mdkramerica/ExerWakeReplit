# Wrist Angle Calculation Analysis & Documentation

## Problem Statement
Large angle measurement inconsistencies observed between visually similar frames:
- Frame 135: 44.0° flexion → Frame 138: 79.3° flexion (35° jump for similar visual position)
- Frame 119 → Frame 120: Significant angle changes without corresponding visual movement

## Current Calculation Method

### Raw Data Sources
The wrist angle calculation uses three key landmarks from MediaPipe:

1. **Pose Landmarks (Body):**
   - Elbow position: `poseLandmarks[13]` (LEFT) or `poseLandmarks[14]` (RIGHT)
   - Pose wrist: `poseLandmarks[15]` (LEFT) or `poseLandmarks[16]` (RIGHT)

2. **Hand Landmarks:**
   - Hand wrist: `handLandmarks[0]` (base of hand)
   - Middle MCP: `handLandmarks[9]` (middle finger base)

### Vector Calculation Process

#### Step 1: Vector Construction
```javascript
// Forearm vector: from elbow TO wrist (blue line on canvas)
const forearmVector = {
  x: wrist.x - elbow.x,
  y: wrist.y - elbow.y,
  z: wrist.z - elbow.z
};

// Hand vector: from wrist TO middle MCP (orange line on canvas)
const handVector = {
  x: middleMcp.x - wrist.x,
  y: middleMcp.y - wrist.y,
  z: middleMcp.z - wrist.z
};
```

#### Step 2: Vector Normalization
```javascript
const forearmLength = sqrt(forearmVector.x² + forearmVector.y² + forearmVector.z²);
const handLength = sqrt(handVector.x² + handVector.y² + handVector.z²);

const normalizedForearm = forearmVector / forearmLength;
const normalizedHand = handVector / handLength;
```

#### Step 3: Angle Calculation
```javascript
const dotProduct = normalizedForearm • normalizedHand;
const cosAngle = dotProduct;
const angleRadians = arccos(clampedCosAngle);
const angleDegrees = angleRadians * (180 / π);
```

## Identified Issues

### 1. Landmark Coordinate Instability
MediaPipe landmarks can fluctuate between frames due to:
- Detection confidence variations
- Subpixel coordinate changes
- Elbow/wrist landmark switching

### 2. Elbow Selection Inconsistency
Current proximity-based elbow selection may switch between LEFT/RIGHT elbows mid-session:
```javascript
// This logic can cause elbow switching frame-to-frame
const distToLeftElbow = distance(handWrist, leftElbow);
const distToRightElbow = distance(handWrist, rightElbow);
const useLeftElbow = distToLeftElbow < distToRightElbow;
```

### 3. Vector Sensitivity
Small coordinate changes amplified through:
- 3D vector calculations
- Arctangent/arccosine functions
- Cross-product operations for flexion/extension classification

### 4. Coordinate System Confusion
Mismatch between:
- MediaPipe coordinate system
- Canvas display coordinates
- Anatomical reference frames

## Raw Data Analysis Framework

### Required Logging for Diagnosis
For each problematic frame, document:

1. **Landmark Coordinates (4 decimal places):**
   ```
   Elbow: (x, y, z, visibility)
   Hand Wrist: (x, y, z)
   Middle MCP: (x, y, z)
   ```

2. **Vector Components:**
   ```
   Forearm Vector: (x, y, z)
   Hand Vector: (x, y, z)
   Vector Lengths: forearm_length, hand_length
   ```

3. **Calculation Steps:**
   ```
   Dot Product: value
   Cos(Angle): value
   Angle (radians): value
   Angle (degrees): value
   ```

4. **Context Information:**
   ```
   Frame Number: N
   Hand Type: LEFT/RIGHT
   Elbow Index Used: 13 or 14
   Quality Score: percentage
   ```

## Proposed Solutions

### 1. Session-Locked Elbow Selection
```javascript
// Determine elbow once at session start, maintain throughout
const sessionElbowIndex = determineElbowOnce(firstValidFrame);
// Use same elbow for entire assessment
```

### 2. Temporal Smoothing
```javascript
// Prevent unrealistic angle jumps
if (abs(currentAngle - previousAngle) > 20°) {
  smoothedAngle = (currentAngle + previousAngle) / 2;
}
```

### 3. Landmark Validation
```javascript
// Require minimum confidence and stability
if (landmark.visibility < 0.8 || landmarkJumpDistance > threshold) {
  useLastValidLandmark();
}
```

### 4. Alternative Calculation Methods
Consider implementing:
- 2D projection calculations (ignore Z-axis instability)
- Joint-based angle measurement (elbow-wrist-mcp)
- Weighted averaging across multiple frames

## Visual Validation Requirements
Every calculated angle must pass visual validation:
- 0-20°: Minimal deviation (near neutral)
- 20-40°: Moderate flexion/extension
- 40-60°: Significant flexion/extension
- 60°+: Maximum range motion

Angles exceeding 80° require verification against visual representation.

## Next Steps
1. Implement comprehensive raw data logging
2. Analyze specific problematic frame sequences
3. Compare calculated vs. visual angles systematically
4. Implement most stable calculation method
5. Add real-time validation against visual geometry