# Confidence-Based Tracking System Documentation

## Overview
The confidence-based tracking system filters unreliable finger data during motion capture to ensure accurate range of motion (ROM) calculations. This system prevents erratic tracking jumps from corrupting assessment results.

## Core Logic

### 1. Finger Movement Analysis
The system analyzes movement between consecutive frames for each finger:

```typescript
// Calculate Euclidean distance between current and previous frame
const distance = Math.sqrt(
  Math.pow(current.x - previous.x, 2) + 
  Math.pow(current.y - previous.y, 2) + 
  Math.pow(current.z - previous.z, 2)
);
```

### 2. Movement Thresholds
- **LOW_MOVEMENT_THRESHOLD**: 0.02 (Very stable tracking)
- **HIGH_MOVEMENT_THRESHOLD**: 0.15 (Excessive movement - likely tracking error)

### 3. Confidence Calculation
```typescript
if (averageMovement < LOW_MOVEMENT_THRESHOLD) {
  confidence = 1.0; // 100% confidence
  reason = 'stable_tracking';
} else if (averageMovement < HIGH_MOVEMENT_THRESHOLD) {
  // Linear interpolation between thresholds
  confidence = 1.0 - ((averageMovement - LOW_THRESHOLD) / (HIGH_THRESHOLD - LOW_THRESHOLD));
  reason = 'moderate_movement';
} else {
  confidence = 0.0; // 0% confidence
  reason = 'excessive_movement';
}
```

## Filtering Application

### During Live Recording
- **Location**: `calculateFingerROM()` in `shared/rom-calculator.ts`
- **Threshold**: 70% confidence required
- **Action**: Returns zero angles when confidence < 70%
- **Logging**: Console logs when filtering occurs

```typescript
const CONFIDENCE_THRESHOLD = 0.7; // 70% confidence required
if (confidence && confidence.confidence < CONFIDENCE_THRESHOLD) {
  console.log(`${fingerType} finger tracking unreliable (${Math.round(confidence.confidence * 100)}%): ${confidence.reason}, movement: ${confidence.movement?.toFixed(4)}`);
  return {
    mcpAngle: 0,
    pipAngle: 0,
    dipAngle: 0,
    totalActiveRom: 0
  };
}
```

### Motion Replay Analysis
**Current Status**: Motion replay does NOT apply confidence filtering.

The replay system in `assessment-replay.tsx` displays all recorded motion data without confidence-based filtering. This means:
- All recorded frames are shown in replay
- No data points are excluded from visualization
- Users see the complete captured motion sequence

## Finger-Specific Tracking
Each finger is tracked independently:
- **INDEX**: Landmarks [5, 6, 7, 8]
- **MIDDLE**: Landmarks [9, 10, 11, 12]
- **RING**: Landmarks [13, 14, 15, 16]
- **PINKY**: Landmarks [17, 18, 19, 20]

## Benefits
1. **Data Quality**: Prevents tracking jumps from affecting ROM calculations
2. **Accuracy**: Ensures only reliable measurements contribute to results
3. **Robustness**: Maintains assessment validity during temporary tracking issues
4. **Transparency**: Provides detailed logging for debugging

## Example Filtering Scenarios
- **Frame jumps** (like frames 128-129, 200-201): Filtered out due to excessive movement
- **Occlusion recovery**: Gradual confidence restoration as tracking stabilizes
- **Natural movement**: High confidence maintained for normal finger motion

## Technical Implementation
- **Real-time**: Applied during live recording
- **Per-finger**: Independent confidence scores for each digit
- **Frame-by-frame**: Continuous monitoring between consecutive frames
- **Threshold-based**: Clear cutoff at 70% confidence level