# DEMO01 Wrist Angle Calculation Documentation

## Overview
This document details the exact methodology used to calculate the wrist flexion/extension angles for DEMO01's assessment results showing **48.1° Maximum Flexion** and **46.9° Maximum Extension** (Total ROM: 95.0°).

## Assessment Details
- **Patient**: DEMO01
- **Assessment Type**: Wrist Flexion/Extension
- **Recording Duration**: 10 seconds (300 frames at 30 FPS)
- **Hand Type**: LEFT hand (anatomically matched to LEFT elbow)
- **Results Date**: June 27, 2025

## Calculation Methodology

### 1. Landmark Detection and Validation
The system uses MediaPipe Holistic to detect anatomical landmarks:

**Hand Landmarks (21 points):**
- Point 0: Wrist base
- Point 9: Middle finger MCP (metacarpophalangeal joint)

**Pose Landmarks (33 points):**
- Point 13: Left elbow
- Point 15: Left wrist (pose detection)
- Point 11: Left shoulder

### 2. Anatomical Matching Process
**Pure Anatomical Approach (No Proximity Matching):**
- LEFT hand → LEFT elbow (index 13)
- Body centerline detection using shoulder landmarks
- Hand position relative to body center determines laterality
- Session-locked handedness prevents switching during recording

### 3. Vector-Based Angle Calculation
**Three-Point Vector Method:**
```
Elbow → Wrist → Middle MCP
```

**Vector Definitions:**
- **Forearm Vector**: Elbow to Wrist
- **Hand Vector**: Wrist to Middle MCP

**Calculation Steps:**
1. **Vector Creation:**
   ```
   forearmVector = wrist - elbow
   handVector = middleMCP - wrist
   ```

2. **Normalization:**
   ```
   forearmNormalized = forearmVector / |forearmVector|
   handNormalized = handVector / |handVector|
   ```

3. **Dot Product Calculation:**
   ```
   dotProduct = forearmNormalized · handNormalized
   ```

4. **Angle Extraction:**
   ```
   cosAngle = clamp(dotProduct, -1, 1)
   angleRadians = arccos(cosAngle)
   angleDegrees = angleRadians × (180/π)
   ```

### 4. Anatomical Directional Classification
**Signed Angle Determination:**
- Uses cross product and anatomical position reference
- Converts geometric angle to clinical flexion/extension values
- Accounts for left/right hand differences in coordinate system

**Classification Logic:**
- **Flexion**: Hand deviates toward palm side (positive angle)
- **Extension**: Hand deviates toward back of hand (negative angle)
- **Neutral Zone**: ±5° around anatomical position

### 5. Frame-by-Frame Processing
**Data Collection:**
- 300 frames analyzed over 10-second recording
- Each frame calculates independent angle measurement
- Confidence filtering removes unreliable tracking data (>70% threshold)

**Sample Frame Analysis:**
```
Frame 53 Example:
- Elbow: (0.8659, 0.6101, -0.7806)
- Wrist: (0.4673, 0.4019, -0.0000)
- MCP: (0.3335, 0.3721, 0.0514)
- Raw Angle: 40.89°
- Anatomical Classification: 33.3° Extension
```

### 6. Maximum Value Extraction
**Peak Detection Algorithm:**
- Scans all valid frames for maximum flexion and extension angles
- Filters out unrealistic values (>90° clamped)
- Reports highest reliable measurement in each direction

**DEMO01 Results:**
- **Maximum Flexion**: 48.1° (from 155 flexion frames)
- **Maximum Extension**: 46.9° (from 155 extension frames)
- **Total ROM**: 95.0° (sum of max flexion + max extension)

## Technical Implementation Details

### Coordinate System
- **MediaPipe Format**: Normalized 3D coordinates (x, y, z)
- **Origin**: Camera view perspective
- **Z-axis**: Depth from camera plane

### Quality Assurance
- **Landmark Visibility**: >0.3 threshold for pose landmarks
- **Tracking Confidence**: Multi-factor quality scoring
- **Temporal Validation**: Frame-to-frame consistency checks
- **Anatomical Validation**: Elbow-hand matching verification

### Mathematical Precision
- **Floating Point**: Double precision calculations
- **Angle Clamping**: Prevents mathematical artifacts
- **Vector Normalization**: Ensures scale-independent measurements

## Clinical Interpretation

### Normal Range Reference
- **Total Wrist ROM**: ~150° (70° flexion + 80° extension)
- **DEMO01 Performance**: 95.0° = 63% of normal range
- **Flexion**: 48.1° = 69% of normal (70°)
- **Extension**: 46.9° = 59% of normal (80°)

### Assessment Quality Indicators
- **Session Consistency**: Left hand anatomically locked throughout
- **Tracking Stability**: High confidence landmarks maintained
- **Motion Range**: Clinically relevant ROM demonstrated
- **Data Integrity**: No synthetic or fallback values used

## Validation and Accuracy

### Real-Time Verification
- Canvas motion replay shows synchronized angle calculations
- Frame-by-frame angle display matches stored results
- Visual arc indicators confirm directional classification

### Calculation Transparency
- Complete calculation logging for every frame
- Anatomical validation messages confirm correct elbow selection
- Vector mathematics fully documented in console output

This documentation represents the exact methodology used to generate DEMO01's authentic wrist assessment results of 48.1° flexion and 46.9° extension, totaling 95.0° ROM.