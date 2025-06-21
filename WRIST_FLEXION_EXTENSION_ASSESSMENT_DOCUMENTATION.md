# Wrist Flexion/Extension Assessment Documentation

## Overview
The wrist flexion/extension assessment uses MediaPipe's hand and pose landmark detection combined with elbow-referenced vector calculations to measure precise wrist range of motion in both directions.

## Technical Implementation

### 1. Data Collection Process

**Landmark Detection:**
- **Hand Landmarks**: 21 points including wrist (0) and middle finger MCP (9)
- **Pose Landmarks**: 33 points including left/right elbows (13/14) and shoulders (11/12)
- **Quality Requirements**: Minimum 90% visibility threshold for accurate calculations

**Recording Parameters:**
- Duration: 10 seconds per assessment
- Frame Rate: 30 FPS (approximately 300 frames)
- Hand Type Detection: Automatic with session locking to prevent switching

### 2. Mathematical Calculation Method

**Vector Construction:**
```typescript
// Reference vector: Elbow to wrist (forearm baseline)
const referenceVector = {
  x: handWrist.x - elbow.x,
  y: handWrist.y - elbow.y, 
  z: handWrist.z - elbow.z
};

// Measurement vector: Wrist to middle finger MCP
const measurementVector = {
  x: middleMcp.x - handWrist.x,
  y: middleMcp.y - handWrist.y,
  z: middleMcp.z - handWrist.z
};
```

**Angle Calculation:**
```typescript
// Calculate 3D angle between vectors
const dotProduct = referenceNorm.x * measurementNorm.x + 
                  referenceNorm.y * measurementNorm.y + 
                  referenceNorm.z * measurementNorm.z;
const angleRadians = Math.acos(clampedDotProduct);
const angleDegrees = angleRadians * (180 / Math.PI);
```

**Direction Classification:**
```typescript
// Cross product determines movement direction
const crossProduct = {
  x: referenceNorm.y * measurementNorm.z - referenceNorm.z * measurementNorm.y,
  y: referenceNorm.z * measurementNorm.x - referenceNorm.x * measurementNorm.z,
  z: referenceNorm.x * measurementNorm.y - referenceNorm.y * measurementNorm.x
};

// Hand-specific direction logic
const isExtension = handType === 'LEFT' ? crossProduct.y > 0 : crossProduct.y < 0;
```

### 3. Assessment Processing Pipeline

**Frame-by-Frame Analysis:**
1. Extract hand and pose landmarks from each frame
2. Validate landmark visibility and quality
3. Calculate elbow-referenced wrist angle
4. Classify as flexion or extension based on cross product
5. Store maximum angles for each direction

**Session Maximum Detection:**
```typescript
const allFlexionAngles = frames.map(frame => frame.wristFlexionAngle)
                             .filter(angle => !isNaN(angle) && angle >= 0);
const allExtensionAngles = frames.map(frame => frame.wristExtensionAngle)
                               .filter(angle => !isNaN(angle) && angle >= 0);

const maxFlexion = Math.max(...allFlexionAngles);
const maxExtension = Math.max(...allExtensionAngles);
```

### 4. Display Components

**Assessment Results Page:**
- **Maximum Flexion**: Displays highest forward bending angle achieved
- **Maximum Extension**: Displays highest backward bending angle achieved  
- **Total ROM**: Sum of maximum flexion and extension angles
- **Clinical Assessment**: Categorized based on normal functional ranges

**Motion Replay Analysis:**
- **Real-time Visualization**: Shows hand landmarks with elbow reference lines
- **Current Frame Data**: Displays instant angle calculations during playback
- **Session Maximums**: Tracks and displays peak angles achieved
- **Quality Indicators**: Shows confidence scores and landmark detection status

### 5. Clinical Interpretation

**Normal Range Guidelines:**
- **Flexion**: 0-80° (excellent ≥60°, moderate 40-59°)
- **Extension**: 0-70° (excellent ≥50°, moderate 30-49°)
- **Total ROM**: 120-150° typical functional range

**Assessment Categories:**
- **Excellent**: Flexion ≥60° AND Extension ≥50°
- **Moderate**: Flexion ≥40° OR Extension ≥30°
- **Limited**: Below moderate thresholds

### 6. Data Storage Structure

**Database Fields:**
```typescript
{
  maxWristFlexion: number,      // Peak flexion angle
  maxWristExtension: number,    // Peak extension angle  
  wristFlexionAngle: number,    // Final recorded flexion
  wristExtensionAngle: number,  // Final recorded extension
  repetitionData: [{
    motionData: [FrameData],    // Complete motion capture
    qualityScore: number,       // Assessment quality rating
    duration: number            // Recording duration
  }]
}
```

### 7. Quality Assurance

**Validation Checks:**
- Elbow landmark visibility >95%
- Hand landmark consistency across frames
- Angle range validation (5-90° detection threshold)
- Cross product direction verification

**Error Handling:**
- Fallback calculations when pose landmarks unavailable
- Frame interpolation for missing data points
- Quality score based on landmark confidence
- Session restart for poor detection quality

## Implementation Files

### Core Calculation Module
- **File**: `shared/elbow-wrist-calculator.ts`
- **Function**: `calculateElbowReferencedWristAngle()`
- **Purpose**: Performs vector-based angle calculations with direction classification

### Assessment Results Display
- **File**: `client/src/pages/assessment-results.tsx`
- **Purpose**: Shows calculated maximum flexion/extension angles and clinical assessment

### Motion Replay Component
- **File**: `client/src/components/assessment-replay.tsx`
- **Purpose**: Provides real-time motion analysis with visual landmark display

### Recording Interface
- **File**: `client/src/pages/recording.tsx`
- **Purpose**: Captures motion data during live assessment sessions

## Technical Considerations

### Hand Type Detection
- Uses proximity analysis between hand wrist and pose wrist landmarks
- Locks hand type for session consistency (prevents L/R switching)
- Applies hand-specific cross product logic for direction determination

### Coordinate System Management
- LEFT hand: Positive Y cross product = extension, Negative Y = flexion
- RIGHT hand: Negative Y cross product = extension, Positive Y = flexion
- Accounts for camera coordinate system and hand orientation differences

### Performance Optimization
- Frame-by-frame processing with efficient vector calculations
- Maximum angle tracking to avoid redundant computations
- Quality-based filtering to ensure reliable measurements

This comprehensive system ensures accurate, clinically relevant wrist mobility assessment with detailed motion analysis and reliable measurement consistency across different users and hand orientations.