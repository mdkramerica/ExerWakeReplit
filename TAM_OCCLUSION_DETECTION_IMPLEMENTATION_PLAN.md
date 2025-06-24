# TAM Finger Occlusion Detection Implementation Plan

## Overview
Comprehensive plan for implementing finger occlusion detection specifically for Total Active Motion (TAM) assessments to prevent overestimation of finger ROM when fingers are occluded during tracking.

## Problem Statement
Index finger ROM is being overestimated when occluded by other fingers during TAM assessments. MediaPipe continues tracking but with reduced accuracy, leading to inflated joint angle calculations that don't reflect actual finger movement.

## Core Strategy
Focus on **TAM-specific finger tracking improvements** using a layered detection approach that combines confidence filtering, geometric analysis, and anatomical constraints.

## Implementation Phases

### Phase 1: Immediate Confidence & Geometric Filtering
**Target**: Eliminate obvious tracking errors from occluded fingers

#### 1.1 Per-Landmark Confidence Validation
- Implement visibility threshold of 0.8 for TAM (higher than general 0.7)
- Add finger-specific confidence tracking in motion frames
- Reject entire finger calculations if any joint has low confidence

```typescript
const TAM_CONFIDENCE_THRESHOLD = 0.8;

interface FingerConfidence {
  fingerType: 'INDEX' | 'MIDDLE' | 'RING' | 'PINKY';
  confidence: number;
  isOccluded: boolean;
  reason: string;
}
```

#### 1.2 Z-Depth Occlusion Detection
- Compare finger tip z-coordinates to detect depth ordering
- Flag fingers as occluded when z-difference > 0.05 threshold
- Prioritize visible fingers over occluded ones in ROM calculations

```typescript
const Z_DEPTH_THRESHOLD = 0.05;

function detectDepthOcclusion(landmarks: HandLandmark[]): FingerOcclusion[] {
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  
  if (indexTip.z > middleTip.z + Z_DEPTH_THRESHOLD) {
    return [{
      fingerType: 'INDEX',
      isOccluded: true,
      occludedBy: 'MIDDLE',
      confidence: 0.3
    }];
  }
  return [];
}
```

#### 1.3 Geometric Overlap Analysis
- Calculate 2D bounding boxes for each finger
- Detect when index finger box overlaps with middle/ring finger boxes
- Use depth analysis to confirm which finger is behind

```typescript
function getFingerBoundingBox(landmarks: HandLandmark[], fingerIndices: number[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  fingerIndices.forEach(idx => {
    const lm = landmarks[idx];
    minX = Math.min(minX, lm.x);
    minY = Math.min(minY, lm.y);
    maxX = Math.max(maxX, lm.x);
    maxY = Math.max(maxY, lm.y);
  });
  
  return { minX, minY, maxX, maxY };
}
```

### Phase 2: TAM-Specific Motion Validation
**Target**: Prevent sudden ROM spikes from tracking errors

#### 2.1 Anatomical Joint Constraints
- Enforce maximum joint angle limits (MCP: 90°, PIP: 110°, DIP: 90°)
- Reject calculations exceeding physiological ranges
- Apply stricter limits during rapid movements

```typescript
const ANATOMICAL_LIMITS = {
  MCP: { min: 0, max: 90 },
  PIP: { min: 0, max: 110 },
  DIP: { min: 0, max: 90 }
};

function validateAnatomicalLimits(angles: JointAngles): boolean {
  return angles.mcpAngle <= ANATOMICAL_LIMITS.MCP.max &&
         angles.pipAngle <= ANATOMICAL_LIMITS.PIP.max &&
         angles.dipAngle <= ANATOMICAL_LIMITS.DIP.max;
}
```

#### 2.2 Temporal Consistency Checking
- Track ROM changes between frames (flag >30° sudden changes)
- Require 3+ consistent frames before accepting high ROM values
- Use moving average for landmark smoothing (5-frame window)

```typescript
const MAX_ROM_CHANGE_PER_FRAME = 30; // degrees
const CONSISTENCY_FRAME_COUNT = 3;
const SMOOTHING_WINDOW_SIZE = 5;

function validateTemporalConsistency(
  currentROM: number, 
  previousROMs: number[]
): boolean {
  if (previousROMs.length === 0) return true;
  
  const lastROM = previousROMs[previousROMs.length - 1];
  const change = Math.abs(currentROM - lastROM);
  
  return change <= MAX_ROM_CHANGE_PER_FRAME;
}
```

#### 2.3 Inter-Finger Relationship Validation
- Ensure index finger doesn't show higher ROM than middle finger when clearly occluded
- Validate finger separation distances during motion
- Apply cross-finger consistency checks

```typescript
function validateInterFingerRelationships(fingerROMs: {
  index: number;
  middle: number;
  ring: number;
  pinky: number;
}): ValidationResult {
  // Index finger shouldn't exceed middle finger ROM significantly when occluded
  if (fingerROMs.index > fingerROMs.middle * 1.3) {
    return {
      isValid: false,
      reason: 'Index finger ROM suspiciously high compared to middle finger'
    };
  }
  
  return { isValid: true };
}
```

### Phase 3: Enhanced User Feedback
**Target**: Provide real-time guidance for better assessments

#### 3.1 Visual Quality Indicators
- Show per-finger confidence percentages during recording
- Display occlusion warnings in real-time
- Highlight which fingers have reliable tracking

#### 3.2 Assessment Guidance
- Suggest hand repositioning when occlusion detected
- Provide finger separation prompts during TAM execution
- Show optimal hand positioning visualization

## Implementation Priorities

### High Priority (Immediate)
1. Enhanced confidence filtering in ROM calculator
2. Z-depth occlusion detection
3. Anatomical constraint validation

### Medium Priority
1. Temporal consistency checking
2. Geometric overlap detection
3. Motion smoothing implementation

### Low Priority
1. Real-time visual feedback
2. Advanced user guidance system

## Key Technical Changes

### 1. Modify `shared/rom-calculator.ts`
- Add occlusion detection before angle calculations
- Implement anatomical constraints validation
- Enhanced confidence filtering integration

### 2. Update motion processing
- Add frame-to-frame consistency checking
- Implement temporal smoothing filters
- Cross-finger validation logic

### 3. Enhance tracking components
- Real-time confidence display
- Occlusion warning system
- Quality score integration

## Expected Outcomes

### Clinical Benefits
- Eliminate false high ROM readings from occluded index fingers
- Maintain accuracy for properly visible finger movements
- Provide clinical confidence through quality metrics
- Reduce assessment retakes due to tracking errors

### Technical Improvements
- Robust occlusion detection system
- Anatomically-constrained ROM calculations
- Temporal consistency validation
- Enhanced tracking quality metrics

## Validation Strategy

### Testing Approach
1. Test with controlled finger occlusion scenarios
2. Compare ROM calculations before/after implementation
3. Validate against known anatomical movement limits
4. Ensure no degradation in normal (non-occluded) tracking

### Success Metrics
- Reduction in false positive high ROM readings
- Maintained accuracy for visible finger tracking
- Improved clinical confidence in TAM assessments
- Decreased need for assessment retakes

## Research Foundation

Based on MediaPipe hand tracking research suggesting:
- Confidence filtering with temporal analysis reduces errors
- Anatomical constraints improve tracking accuracy
- Z-depth analysis effective for occlusion detection
- Geometric bounding box analysis enhances finger separation detection

## Future Enhancements

### Advanced Occlusion Detection
- Machine learning-based occlusion prediction
- Finger pose estimation validation
- Multi-hand gesture recognition integration

### Clinical Integration
- Assessment quality scoring system
- Automated retake recommendations
- Clinical decision support metrics

---

**Document Created**: June 24, 2025  
**Status**: Implementation Ready  
**Priority**: High - TAM Assessment Accuracy Critical