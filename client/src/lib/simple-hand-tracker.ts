// Simple hand tracking implementation using basic computer vision
export interface SimpleHandLandmark {
  x: number;
  y: number;
  z: number;
}

export class SimpleHandTracker {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastFrameData: ImageData | null = null;
  private motionThreshold = 30;
  private handDetected = false;
  private landmarks: SimpleHandLandmark[] = [];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  processFrame(video: HTMLVideoElement): { handDetected: boolean; landmarks: SimpleHandLandmark[] } {
    if (!video || video.readyState < 2) {
      return { handDetected: false, landmarks: [] };
    }

    this.canvas.width = video.videoWidth || 640;
    this.canvas.height = video.videoHeight || 480;
    
    // Draw video frame to canvas
    this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
    
    // Get current frame data
    const currentFrameData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // Simple motion detection
    if (this.lastFrameData) {
      const motionLevel = this.calculateMotion(currentFrameData, this.lastFrameData);
      this.handDetected = motionLevel > this.motionThreshold;
      
      if (this.handDetected) {
        // Generate mock landmarks for demonstration
        this.landmarks = this.generateMockLandmarks();
      } else {
        this.landmarks = [];
      }
    }
    
    this.lastFrameData = currentFrameData;
    
    return {
      handDetected: this.handDetected,
      landmarks: this.landmarks
    };
  }

  private calculateMotion(current: ImageData, previous: ImageData): number {
    let motionLevel = 0;
    const data1 = current.data;
    const data2 = previous.data;
    
    // Sample pixels for motion detection (every 10th pixel for performance)
    for (let i = 0; i < data1.length; i += 40) {
      const diff = Math.abs(data1[i] - data2[i]) + 
                   Math.abs(data1[i + 1] - data2[i + 1]) + 
                   Math.abs(data1[i + 2] - data2[i + 2]);
      motionLevel += diff;
    }
    
    return motionLevel / (data1.length / 40);
  }

  private generateMockLandmarks(): SimpleHandLandmark[] {
    // Generate 21 landmarks representing a hand
    const landmarks: SimpleHandLandmark[] = [];
    const centerX = 0.5 + (Math.random() - 0.5) * 0.2;
    const centerY = 0.5 + (Math.random() - 0.5) * 0.2;
    
    // Wrist
    landmarks.push({ x: centerX, y: centerY + 0.1, z: 0 });
    
    // Thumb (4 points)
    for (let i = 0; i < 4; i++) {
      landmarks.push({
        x: centerX - 0.05 - i * 0.02,
        y: centerY + 0.05 - i * 0.03,
        z: 0
      });
    }
    
    // Index finger (4 points)
    for (let i = 0; i < 4; i++) {
      landmarks.push({
        x: centerX - 0.02 + i * 0.005,
        y: centerY - 0.02 - i * 0.04,
        z: 0
      });
    }
    
    // Middle finger (4 points)
    for (let i = 0; i < 4; i++) {
      landmarks.push({
        x: centerX + 0.01 + i * 0.002,
        y: centerY - 0.03 - i * 0.045,
        z: 0
      });
    }
    
    // Ring finger (4 points)
    for (let i = 0; i < 4; i++) {
      landmarks.push({
        x: centerX + 0.04 + i * 0.002,
        y: centerY - 0.02 - i * 0.04,
        z: 0
      });
    }
    
    // Pinky (4 points)
    for (let i = 0; i < 4; i++) {
      landmarks.push({
        x: centerX + 0.07 + i * 0.002,
        y: centerY - 0.01 - i * 0.035,
        z: 0
      });
    }
    
    return landmarks;
  }

  cleanup() {
    this.lastFrameData = null;
    this.handDetected = false;
    this.landmarks = [];
  }
}