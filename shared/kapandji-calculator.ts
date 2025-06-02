export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface KapandjiScore {
  maxScore: number;
  reachedLandmarks: string[];
  details: {
    indexMcp: boolean;
    middleMcp: boolean;
    ringMcp: boolean;
    pinkyMcp: boolean;
    pinkyPip: boolean;
    pinkyDip: boolean;
    pinkyTip: boolean;
    palmCenter: boolean;
    beyondPalm: boolean;
  };
}

function euclideanDistance(a: HandLandmark, b: HandLandmark): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) + 
    Math.pow(a.y - b.y, 2) + 
    Math.pow(a.z - b.z, 2)
  );
}

function averageLandmarks(indices: number[], landmarks: HandLandmark[]): HandLandmark {
  const x = indices.reduce((sum, i) => sum + landmarks[i].x, 0) / indices.length;
  const y = indices.reduce((sum, i) => sum + landmarks[i].y, 0) / indices.length;
  const z = indices.reduce((sum, i) => sum + landmarks[i].z, 0) / indices.length;
  return { x, y, z };
}

export function calculateKapandjiScore(landmarks: HandLandmark[]): KapandjiScore {
  if (landmarks.length !== 21) {
    throw new Error('MediaPipe hand landmarks must contain exactly 21 points');
  }

  const thumbTip = landmarks[4];
  
  // Define anatomical targets with their Kapandji scores
  // Using a distance threshold of 0.05 (normalized coordinates)
  const THRESHOLD = 0.05;
  
  const targets = [
    { landmark: landmarks[5], score: 1, name: 'Index MCP', key: 'indexMcp' },
    { landmark: landmarks[9], score: 2, name: 'Middle MCP', key: 'middleMcp' },
    { landmark: landmarks[13], score: 3, name: 'Ring MCP', key: 'ringMcp' },
    { landmark: landmarks[17], score: 4, name: 'Pinky MCP', key: 'pinkyMcp' },
    { landmark: landmarks[18], score: 6, name: 'Pinky PIP', key: 'pinkyPip' },
    { landmark: landmarks[19], score: 7, name: 'Pinky DIP', key: 'pinkyDip' },
    { landmark: landmarks[20], score: 8, name: 'Pinky Tip', key: 'pinkyTip' },
  ];

  // Calculate palm center
  const palmCenter = averageLandmarks([0, 1, 5, 9, 13, 17], landmarks);
  targets.push({ landmark: palmCenter, score: 9, name: 'Palm Center', key: 'palmCenter' });

  let maxScore = 0;
  const reachedLandmarks: string[] = [];
  const details = {
    indexMcp: false,
    middleMcp: false,
    ringMcp: false,
    pinkyMcp: false,
    pinkyPip: false,
    pinkyDip: false,
    pinkyTip: false,
    palmCenter: false,
    beyondPalm: false
  };

  // Check each target in order
  for (const target of targets) {
    const distance = euclideanDistance(thumbTip, target.landmark);
    if (distance < THRESHOLD) {
      maxScore = Math.max(maxScore, target.score);
      reachedLandmarks.push(target.name);
      (details as any)[target.key] = true;
    }
  }

  // Special case: Check if thumb reaches beyond palm (score 10)
  // Use a more accurate palm boundary detection
  const pinkyTip = landmarks[20];
  const wrist = landmarks[0];
  const pinkyMcp = landmarks[17];
  
  // Determine handedness by comparing thumb base to wrist
  const isRightHand = landmarks[1].x > wrist.x;
  
  // Calculate palm boundary more accurately using pinky MCP and wrist
  const palmBoundaryX = isRightHand ? 
    Math.max(pinkyMcp.x, pinkyTip.x) : 
    Math.min(pinkyMcp.x, pinkyTip.x);
  
  // Require thumb to be significantly beyond the palm boundary
  const BEYOND_PALM_THRESHOLD = 0.06; // Increased threshold for more accuracy
  
  const reachesBeyondPalm = isRightHand ? 
    (thumbTip.x > palmBoundaryX + BEYOND_PALM_THRESHOLD) : 
    (thumbTip.x < palmBoundaryX - BEYOND_PALM_THRESHOLD);

  // Debug logging
  console.log('Kapandji Beyond Palm Debug:', {
    isRightHand,
    thumbTipX: thumbTip.x,
    palmBoundaryX,
    threshold: BEYOND_PALM_THRESHOLD,
    requiredX: isRightHand ? palmBoundaryX + BEYOND_PALM_THRESHOLD : palmBoundaryX - BEYOND_PALM_THRESHOLD,
    reachesBeyondPalm
  });

  if (reachesBeyondPalm) {
    maxScore = Math.max(maxScore, 10);
    reachedLandmarks.push('Beyond Palm');
    details.beyondPalm = true;
  }

  return {
    maxScore,
    reachedLandmarks,
    details
  };
}

export function calculateMaxKapandjiScore(motionFrames: Array<{landmarks: HandLandmark[]}>): KapandjiScore {
  let bestScore: KapandjiScore = {
    maxScore: 0,
    reachedLandmarks: [],
    details: {
      indexMcp: false,
      middleMcp: false,
      ringMcp: false,
      pinkyMcp: false,
      pinkyPip: false,
      pinkyDip: false,
      pinkyTip: false,
      palmCenter: false,
      beyondPalm: false
    }
  };

  for (const frame of motionFrames) {
    if (frame.landmarks && frame.landmarks.length === 21) {
      const frameScore = calculateKapandjiScore(frame.landmarks);
      if (frameScore.maxScore > bestScore.maxScore) {
        bestScore = frameScore;
      }
    }
  }

  return bestScore;
}