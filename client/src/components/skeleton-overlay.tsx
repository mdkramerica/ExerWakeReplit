import React, { useEffect, useRef } from 'react';

interface SkeletonOverlayProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  handLandmarks: any[];
  poseLandmarks: any[];
  isVisible: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

export function SkeletonOverlay({ 
  canvasRef, 
  handLandmarks, 
  poseLandmarks, 
  isVisible, 
  canvasWidth, 
  canvasHeight 
}: SkeletonOverlayProps) {
  
  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update canvas dimensions for calculations
    const actualWidth = canvas.width;
    const actualHeight = canvas.height;

    const drawHandSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
      // Hand landmark connections (MediaPipe hand model)
      const connections = [
        // Thumb
        [0, 1], [1, 2], [2, 3], [3, 4],
        // Index finger
        [0, 5], [5, 6], [6, 7], [7, 8],
        // Middle finger
        [0, 9], [9, 10], [10, 11], [11, 12],
        // Ring finger
        [0, 13], [13, 14], [14, 15], [15, 16],
        // Pinky
        [0, 17], [17, 18], [18, 19], [19, 20]
      ];

      // Draw connection lines with ExerAI brand color
      ctx.strokeStyle = '#14B8A6'; // ExerAI teal
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;

      connections.forEach(([startIdx, endIdx]) => {
        const startPoint = landmarks[startIdx];
        const endPoint = landmarks[endIdx];
        if (startPoint && endPoint && 
            startPoint.x !== undefined && startPoint.y !== undefined &&
            endPoint.x !== undefined && endPoint.y !== undefined) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x * actualWidth, startPoint.y * actualHeight);
          ctx.lineTo(endPoint.x * actualWidth, endPoint.y * actualHeight);
          ctx.stroke();
        }
      });

      ctx.globalAlpha = 1.0;

      // Draw landmark dots - ExerAI brand teal
      ctx.fillStyle = '#14B8A6';

      landmarks.forEach((landmark, index) => {
        if (landmark && landmark.x !== undefined && landmark.y !== undefined) {
          const x = landmark.x * actualWidth;
          const y = landmark.y * actualHeight;
          
          // Consistent dot size for all landmarks
          let radius = 5; // Larger, more visible dots
          
          // Draw clean dots without outline
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    };

    const drawPoseSkeleton = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
      // Key pose landmarks for wrist assessments
      const keyPosePoints = [
        11, // Left shoulder
        12, // Right shoulder  
        13, // Left elbow
        14, // Right elbow
        15, // Left wrist
        16  // Right wrist
      ];

      // Draw connection lines between pose points
      ctx.strokeStyle = '#14B8A6'; // ExerAI teal
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;

      const connections = [
        [11, 12], // Shoulders
        [11, 13], // Left shoulder to elbow
        [12, 14], // Right shoulder to elbow
        [13, 15], // Left elbow to wrist
        [14, 16]  // Right elbow to wrist
      ];

      connections.forEach(([startIdx, endIdx]) => {
        const startPoint = landmarks[startIdx];
        const endPoint = landmarks[endIdx];
        if (startPoint && endPoint && 
            startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x * actualWidth, startPoint.y * actualHeight);
          ctx.lineTo(endPoint.x * actualWidth, endPoint.y * actualHeight);
          ctx.stroke();
        }
      });

      ctx.globalAlpha = 1.0;

      // Draw pose landmark dots
      ctx.fillStyle = '#14B8A6'; // ExerAI teal

      keyPosePoints.forEach((index) => {
        const landmark = landmarks[index];
        if (landmark && landmark.visibility > 0.5) {
          const x = landmark.x * actualWidth;
          const y = landmark.y * actualHeight;
          
          // Draw clean pose dots without outline
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    };

    const drawSkeleton = () => {
      // Clear previous drawings
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (handLandmarks.length > 0) {
        drawHandSkeleton(ctx, handLandmarks);
      }

      // Draw pose landmarks (key points for wrist assessments)
      if (poseLandmarks.length > 0) {
        drawPoseSkeleton(ctx, poseLandmarks);
      }
    };

    drawSkeleton();
  }, [handLandmarks, poseLandmarks, isVisible, canvasWidth, canvasHeight]);

  if (!isVisible) return null;

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 10,
        pointerEvents: 'none',
        width: '100%',
        height: '100%'
      }}
    />
  );
}