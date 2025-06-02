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
  
  // Define anatomical targets with their Kapandji scores based on correct scoring system
  const THRESHOLD = 0.04; // Slightly tighter threshold for more precise scoring
  
  // Calculate specific anatomical landmarks for accurate Kapandji scoring
  const indexSide = landmarks[6]; // Lateral side of index finger (PIP joint)
  const palmBase = averageLandmarks([0, 1, 17], landmarks); // Base of little finger area
  const midPalm = averageLandmarks([0, 17, 18], landmarks); // Mid-palm below little finger
  const distalCrease = averageLandmarks([13, 17, 18], landmarks); // Distal palmar crease
  const proximalCrease = averageLandmarks([0, 9, 13], landmarks); // Proximal palmar crease
  
  const targets = [
    { landmark: indexSide, score: 1, name: 'Lateral Index', key: 'indexMcp' },
    { landmark: landmarks[8], score: 2, name: 'Index Tip', key: 'middleMcp' },
    { landmark: landmarks[12], score: 3, name: 'Middle Tip', key: 'ringMcp' },
    { landmark: landmarks[16], score: 4, name: 'Ring Tip', key: 'pinkyMcp' },
    { landmark: landmarks[20], score: 5, name: 'Little Tip', key: 'pinkyPip' },
    { landmark: palmBase, score: 6, name: 'Little Base', key: 'pinkyDip' },
    { landmark: midPalm, score: 7, name: 'Mid-Palm', key: 'pinkyTip' },
    { landmark: distalCrease, score: 8, name: 'Distal Crease', key: 'palmCenter' },
    { landmark: proximalCrease, score: 9, name: 'Proximal Crease', key: 'beyondPalm' },
  ];

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

  // Score 10: Full opposition across palm to radial side (under pinky metacarpal)
  const wrist = landmarks[0];
  const pinkyMcp = landmarks[17];
  const isRightHand = landmarks[1].x > wrist.x;
  
  // For score 10, thumb must reach the radial side under the pinky metacarpal
  const radialTarget = {
    x: isRightHand ? pinkyMcp.x + 0.08 : pinkyMcp.x - 0.08,
    y: pinkyMcp.y + 0.02,
    z: pinkyMcp.z
  };
  
  const distanceToRadial = euclideanDistance(thumbTip, radialTarget);
  if (distanceToRadial < THRESHOLD * 1.5) { // Slightly more lenient for score 10
    maxScore = Math.max(maxScore, 10);
    reachedLandmarks.push('Full Opposition');
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