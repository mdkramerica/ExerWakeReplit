/**
 * Wrist Radial/Ulnar Deviation Results Calculator
 * 
 * Calculates deviation angles using 3D vector mathematics with MediaPipe landmarks
 * Following AMA clinical standards for wrist deviation assessment
 */

import { calculateWristDeviation } from './rom-calculator';

export interface WristDeviationResultsData {
  maxRadialDeviation: number;
  maxUlnarDeviation: number;
  totalDeviationROM: number;
  frameCount: number;
  handType: string;
  averageConfidence: number;
}

/**
 * Calculate wrist deviation results from user assessment data
 * Uses the centralized calculateWristDeviation function for consistency
 */
export function calculateWristDeviationResults(userAssessment: any): WristDeviationResultsData {
  console.log('🎯 DEVIATION CALCULATOR - Processing assessment:', userAssessment?.id);
  
  // Extract stored deviation values as fallback
  const storedRadial = parseFloat(userAssessment?.maxRadialDeviation || '0');
  const storedUlnar = parseFloat(userAssessment?.maxUlnarDeviation || '0');
  
  console.log('📊 STORED DEVIATION VALUES:', {
    radial: storedRadial.toFixed(1),
    ulnar: storedUlnar.toFixed(1)
  });

  // Get motion data from repetitions
  const motionData = userAssessment?.repetitionData?.[0]?.motionData;
  
  if (motionData && Array.isArray(motionData) && motionData.length > 0) {
    console.log(`🎬 PROCESSING ${motionData.length} MOTION FRAMES for deviation analysis`);
    
    let maxRadial = 0;
    let maxUlnar = 0;
    let frameCount = 0;
    let confidenceSum = 0;
    let validFrames = 0;
    
    // Process each frame to find maximum deviations
    motionData.forEach((frame: any, index: number) => {
      if (frame.handLandmarks?.length > 0 && frame.poseLandmarks?.length > 0) {
        const deviationAngle = calculateWristDeviation(
          frame.poseLandmarks,
          frame.handLandmarks,
          userAssessment.handType === 'LEFT'
        );
        
        if (deviationAngle !== 0) {
          frameCount++;
          
          // Calculate confidence from landmark visibility
          const handVisibility = frame.handLandmarks.reduce((sum: number, landmark: any) => 
            sum + (landmark.visibility || 0.7), 0) / frame.handLandmarks.length;
          confidenceSum += handVisibility;
          validFrames++;
          
          // Extract radial (positive) and ulnar (negative) components
          const radialComponent = deviationAngle > 0 ? deviationAngle : 0;
          const ulnarComponent = deviationAngle < 0 ? Math.abs(deviationAngle) : 0;
          
          // Track maximum deviations
          if (radialComponent > maxRadial) {
            maxRadial = radialComponent;
          }
          if (ulnarComponent > maxUlnar) {
            maxUlnar = ulnarComponent;
          }
          
          if (index % 30 === 0) { // Log every 30th frame
            console.log(`Frame ${index}: Angle ${deviationAngle.toFixed(1)}° (Radial: ${radialComponent.toFixed(1)}°, Ulnar: ${ulnarComponent.toFixed(1)}°)`);
          }
        }
      }
    });
    
    const averageConfidence = validFrames > 0 ? confidenceSum / validFrames : 0.7;
    const totalROM = maxRadial + maxUlnar;
    
    console.log('🎯 MOTION DATA RESULTS:', {
      maxRadial: maxRadial.toFixed(1),
      maxUlnar: maxUlnar.toFixed(1),
      totalROM: totalROM.toFixed(1),
      frameCount,
      validFrames,
      averageConfidence: averageConfidence.toFixed(2)
    });
    
    // Use motion data results (authoritative)
    return {
      maxRadialDeviation: maxRadial,
      maxUlnarDeviation: maxUlnar,
      totalDeviationROM: totalROM,
      frameCount,
      handType: userAssessment.handType || 'UNKNOWN',
      averageConfidence
    };
  }
  
  // Fallback to stored values if available
  if (storedRadial > 0 || storedUlnar > 0) {
    console.log('⚠️ USING STORED DEVIATION VALUES AS FALLBACK');
    return {
      maxRadialDeviation: storedRadial,
      maxUlnarDeviation: storedUlnar,
      totalDeviationROM: storedRadial + storedUlnar,
      frameCount: userAssessment?.repetitionData?.[0]?.motionData?.length || 0,
      handType: userAssessment.handType || 'UNKNOWN',
      averageConfidence: 1.0
    };
  }
  
  // Last resort fallback
  console.log('⚠️ NO DEVIATION DATA AVAILABLE - Using fallback values');
  return {
    maxRadialDeviation: 0,
    maxUlnarDeviation: 0,
    totalDeviationROM: 0,
    frameCount: 0,
    handType: 'UNKNOWN',
    averageConfidence: 0
  };
}

/**
 * Get clinical interpretation based on deviation results
 */
export function getDeviationClinicalInterpretation(results: WristDeviationResultsData) {
  const { maxRadialDeviation, maxUlnarDeviation, totalDeviationROM } = results;
  
  // AMA normal ranges: Radial 20°, Ulnar 30°, Total ~50°
  if (maxRadialDeviation >= 18 && maxUlnarDeviation >= 25 && totalDeviationROM >= 45) {
    return { 
      status: "Normal", 
      color: "text-green-600", 
      description: "Excellent wrist deviation mobility" 
    };
  } else if (maxRadialDeviation >= 12 && maxUlnarDeviation >= 18 && totalDeviationROM >= 30) {
    return { 
      status: "Moderate", 
      color: "text-yellow-600", 
      description: "Some deviation limitation present" 
    };
  } else {
    return { 
      status: "Limited", 
      color: "text-red-600", 
      description: "Significant deviation restriction" 
    };
  }
}

/**
 * Calculate percentage of normal range for each deviation direction
 */
export function getDeviationPercentages(results: WristDeviationResultsData) {
  const { maxRadialDeviation, maxUlnarDeviation } = results;
  
  // Normal ranges based on AMA standards
  const normalRadial = 20; // degrees
  const normalUlnar = 30; // degrees
  
  const radialPercentage = (maxRadialDeviation / normalRadial) * 100;
  const ulnarPercentage = (maxUlnarDeviation / normalUlnar) * 100;
  
  return {
    radialPercentage: Math.min(radialPercentage, 150), // Cap at 150% for display
    ulnarPercentage: Math.min(ulnarPercentage, 150),
    normalRadial,
    normalUlnar
  };
}

/**
 * Get deviation quality assessment based on measurement consistency
 */
export function getDeviationQualityScore(results: WristDeviationResultsData): number {
  const { averageConfidence, frameCount, maxRadialDeviation, maxUlnarDeviation } = results;
  
  // Base score from tracking confidence
  let qualityScore = averageConfidence * 60; // 60% weight for confidence
  
  // Frame count quality (more frames = better assessment)
  const frameQuality = Math.min(frameCount / 150, 1) * 20; // 20% weight, target 150+ frames
  qualityScore += frameQuality;
  
  // Range reasonableness (detect tracking errors)
  const rangeQuality = (maxRadialDeviation <= 40 && maxUlnarDeviation <= 50) ? 20 : 10;
  qualityScore += rangeQuality;
  
  return Math.min(Math.round(qualityScore), 100);
}