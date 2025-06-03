# Quality Score Documentation for Motion Replay: TAM

## Overview
The "Quality" score displayed in Motion Replay for TAM (Total Active Motion) assessments represents the reliability and accuracy of the hand tracking during the recording session. This score helps clinicians understand how trustworthy the motion analysis data is.

## Quality Score Calculation

### Formula
The quality score is calculated using three key tracking metrics:

```typescript
const calculateQualityScore = () => {
  let score = 0;
  if (landmarksCount === 21) score += 40;  // 40% for complete landmark detection
  if (handDetected) score += 30;          // 30% for hand presence
  if (trackingQuality === "Excellent") score += 30;
  else if (trackingQuality === "Good") score += 20;
  else if (trackingQuality === "Fair") score += 10;
  return Math.min(score, 100);
};
```

### Scoring Components

#### 1. Landmark Detection (40 points maximum)
- **Full Points (40)**: All 21 hand landmarks detected
- **Zero Points (0)**: Incomplete landmark detection

The 21 landmarks include:
- Wrist (1 point)
- Thumb joints (4 points: CMC, MCP, IP, tip)
- Index finger (4 points: MCP, PIP, DIP, tip)
- Middle finger (4 points: MCP, PIP, DIP, tip)
- Ring finger (4 points: MCP, PIP, DIP, tip)
- Pinky finger (4 points: MCP, PIP, DIP, tip)

#### 2. Hand Detection (30 points maximum)
- **Full Points (30)**: Hand consistently detected in frame
- **Zero Points (0)**: Hand not detected or intermittent detection

#### 3. Tracking Quality Assessment (30 points maximum)
Based on MediaPipe's internal confidence and stability metrics:
- **Excellent (30 points)**: High confidence, stable tracking, minimal jitter
- **Good (20 points)**: Moderate confidence, acceptable stability
- **Fair (10 points)**: Lower confidence, some tracking instability
- **Poor (0 points)**: Unreliable tracking, significant issues

## Quality Score Ranges

### Score Interpretation
- **90-100**: Excellent quality - Highly reliable motion data
- **80-89**: Good quality - Reliable motion data with minor issues
- **70-79**: Fair quality - Acceptable data but may have some reliability concerns
- **60-69**: Below average - Data may be less reliable for clinical decisions
- **Below 60**: Poor quality - Data reliability questionable, consider retaking

## Impact on Motion Analysis

### High Quality Scores (80+)
- ROM measurements are highly reliable
- Joint angle calculations are accurate
- Suitable for clinical decision-making
- Confidence-based filtering rarely activates

### Medium Quality Scores (60-79)
- ROM measurements generally reliable
- Some frames may be filtered by confidence system
- Acceptable for most clinical purposes
- May benefit from additional assessment sessions

### Low Quality Scores (Below 60)
- ROM measurements may be unreliable
- Many frames filtered by confidence system
- Consider retaking the assessment
- May indicate environmental or positioning issues

## Factors Affecting Quality Score

### Environmental Factors
- **Lighting**: Poor lighting reduces landmark detection accuracy
- **Background**: Cluttered backgrounds can interfere with hand detection
- **Camera quality**: Higher resolution cameras improve tracking

### User Factors
- **Hand positioning**: Keeping hand fully visible in frame
- **Movement speed**: Smooth, deliberate movements improve tracking
- **Hand occlusion**: Avoiding finger overlap or self-occlusion

### Technical Factors
- **Device performance**: Processing power affects real-time tracking
- **Network connectivity**: CDN loading of MediaPipe models
- **Browser compatibility**: Different browsers have varying MediaPipe support

## Clinical Relevance

### Assessment Validity
Quality scores help clinicians determine:
- Whether ROM measurements are clinically valid
- If additional assessment sessions are needed
- The reliability of progress tracking over time

### Documentation Standards
For clinical documentation:
- Always record quality scores alongside ROM measurements
- Note any environmental factors that may have affected quality
- Consider quality trends across multiple sessions

## Technical Implementation

### Real-time Calculation
Quality scores are calculated in real-time during recording:
1. Each frame's tracking metrics are evaluated
2. Running average maintained throughout session
3. Final score calculated at session completion
4. Score stored with motion data for replay analysis

### Integration with Confidence System
The quality score works alongside the confidence-based tracking system:
- Low quality frames are filtered from ROM calculations
- Only high-confidence data contributes to final measurements
- Quality score reflects the overall session reliability