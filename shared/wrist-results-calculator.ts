// Centralized wrist results calculation - SINGLE SOURCE OF TRUTH
// This module ensures consistent wrist angle calculations across all pages

import { calculateWristAngleByHandType } from './elbow-wrist-calculator';

export interface WristResultsData {
  maxFlexion: number;
  maxExtension: number;
  totalROM: number;
  frameCount: number;
  handType: 'LEFT' | 'RIGHT' | 'UNKNOWN';
  averageConfidence: number;
}

/**
 * Calculate wrist results using the EXACT same methodology as /wrist-results page
 * This is the authoritative calculation method used throughout the application
 */
export function calculateWristResults(userAssessment: any): WristResultsData {
  console.log('🔍 AUTHORITATIVE WRIST CALCULATION - Single source of truth');
  
  // Enhanced field checking for wrist angle data - EXACT same as wrist-results.tsx
  const maxFlexion = Number(
    userAssessment.maxWristFlexion || 
    userAssessment.wristFlexionAngle ||
    (userAssessment.repetitionData && userAssessment.repetitionData[0]?.maxWristFlexion) ||
    0
  );
  
  const maxExtension = Number(
    userAssessment.maxWristExtension || 
    userAssessment.wristExtensionAngle ||
    (userAssessment.repetitionData && userAssessment.repetitionData[0]?.maxWristExtension) ||
    0
  );

  // Always calculate from motion data first for accuracy - stored values may be incorrect
  if (userAssessment.repetitionData && userAssessment.repetitionData[0]?.motionData && userAssessment.repetitionData[0].motionData.length > 0) {
    console.log('🔄 CALCULATING FROM MOTION DATA - Primary calculation method');
    
    const motionData = userAssessment.repetitionData[0].motionData;
    
    // Calculate wrist angles for all frames
    const wristAnglesAllFrames = motionData.map((frame: any) => {
      if (frame.landmarks && frame.poseLandmarks) {
        return calculateWristAngleByHandType(frame.landmarks, frame.poseLandmarks);
      }
      return null;
    }).filter(Boolean);
    
    if (wristAnglesAllFrames.length > 0) {
      // Extract maximum values with debug logging
      const allFlexionAngles = wristAnglesAllFrames.map((w: any) => w.wristFlexionAngle).filter((angle: number) => !isNaN(angle) && angle >= 0);
      const allExtensionAngles = wristAnglesAllFrames.map((w: any) => w.wristExtensionAngle).filter((angle: number) => !isNaN(angle) && angle >= 0);
      
      const calculatedMaxFlexion = allFlexionAngles.length > 0 ? Math.max(...allFlexionAngles) : 0;
      const calculatedMaxExtension = allExtensionAngles.length > 0 ? Math.max(...allExtensionAngles) : 0;
      
      console.log(`✅ CALCULATED VALUES - Flexion: ${calculatedMaxFlexion.toFixed(1)}° (from ${allFlexionAngles.length} flexion frames), Extension: ${calculatedMaxExtension.toFixed(1)}° (from ${allExtensionAngles.length} extension frames)`);
      console.log(`📊 Sample flexion angles: [${allFlexionAngles.slice(0, 5).map((a: number) => a.toFixed(1)).join(', ')}${allFlexionAngles.length > 5 ? '...' : ''}]`);
      console.log(`📊 Sample extension angles: [${allExtensionAngles.slice(0, 5).map((a: number) => a.toFixed(1)).join(', ')}${allExtensionAngles.length > 5 ? '...' : ''}]`);
      
      return {
        maxFlexion: calculatedMaxFlexion,
        maxExtension: calculatedMaxExtension,
        totalROM: calculatedMaxFlexion + calculatedMaxExtension,
        frameCount: motionData.length,
        handType: wristAnglesAllFrames[0]?.handType || 'UNKNOWN',
        averageConfidence: wristAnglesAllFrames.reduce((sum: number, w: any) => sum + w.confidence, 0) / wristAnglesAllFrames.length
      };
    }
  }

  // If we have stored values and no motion data, use them as fallback
  if (maxFlexion > 0 || maxExtension > 0) {
    console.log(`⚠️ USING STORED VALUES AS FALLBACK - Flexion: ${maxFlexion.toFixed(1)}°, Extension: ${maxExtension.toFixed(1)}° (no motion data available)`);
    return {
      maxFlexion,
      maxExtension,
      totalROM: maxFlexion + maxExtension,
      frameCount: userAssessment?.repetitionData?.[0]?.motionData?.length || 0,
      handType: userAssessment.handType || 'UNKNOWN',
      averageConfidence: 1.0
    };
  }



  // Last resort fallback
  console.log('⚠️ NO DATA AVAILABLE - Using fallback values');
  return {
    maxFlexion: 0,
    maxExtension: 0,
    totalROM: 0,
    frameCount: 0,
    handType: 'UNKNOWN',
    averageConfidence: 0
  };
}

/**
 * Get clinical interpretation based on calculated results
 */
export function getWristClinicalInterpretation(results: WristResultsData) {
  const { maxFlexion, maxExtension } = results;
  
  if (maxFlexion >= 60 && maxExtension >= 50) {
    return { status: "Normal", color: "text-green-600", description: "Excellent wrist mobility" };
  } else if (maxFlexion >= 40 || maxExtension >= 30) {
    return { status: "Moderate", color: "text-yellow-600", description: "Some limitation present" };
  } else {
    return { status: "Limited", color: "text-red-600", description: "Significant mobility restriction" };
  }
}

/**
 * Get percentage values for progress bars
 */
export function getWristPercentages(results: WristResultsData) {
  const flexionPercentage = Math.min((results.maxFlexion / 80) * 100, 100);
  const extensionPercentage = Math.min((results.maxExtension / 70) * 100, 100);
  
  return { flexionPercentage, extensionPercentage };
}