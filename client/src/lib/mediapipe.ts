// MediaPipe hand tracking utilities
export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandTrackingResult {
  landmarks: HandLandmark[];
  handedness: string;
  score: number;
}

declare global {
  interface Window {
    MediaPipeHands: any;
  }
}

export class MediaPipeManager {
  private hands: any = null;
  private camera: any = null;
  private isLoaded = false;
  private onResults: ((results: any) => void) | null = null;

  async initialize() {
    if (this.isLoaded) return;

    try {
      // Load MediaPipe from CDN
      await this.loadMediaPipeScript();
      
      const { Hands, Camera } = window.MediaPipeHands;
      
      this.hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.hands.onResults((results: any) => {
        if (this.onResults) {
          this.onResults(results);
        }
      });

      this.isLoaded = true;
    } catch (error) {
      console.error("Failed to initialize MediaPipe:", error);
      throw error;
    }
  }

  private async loadMediaPipeScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.MediaPipeHands) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
      script.onload = () => {
        // Wait a bit for the library to fully load
        setTimeout(resolve, 100);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  setOnResults(callback: (results: any) => void) {
    this.onResults = callback;
  }

  async processFrame(imageElement: HTMLCanvasElement | HTMLVideoElement) {
    if (!this.hands || !this.isLoaded) {
      throw new Error("MediaPipe not initialized");
    }

    await this.hands.send({ image: imageElement });
  }

  startCamera(videoElement: HTMLVideoElement) {
    if (!this.isLoaded) {
      throw new Error("MediaPipe not initialized");
    }

    const { Camera } = window.MediaPipeHands;
    
    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        await this.hands.send({ image: videoElement });
      },
      width: 1280,
      height: 720
    });
  }

  async start() {
    if (this.camera) {
      await this.camera.start();
    }
  }

  stop() {
    if (this.camera) {
      this.camera.stop();
    }
  }

  cleanup() {
    this.stop();
    this.hands = null;
    this.camera = null;
    this.isLoaded = false;
    this.onResults = null;
  }
}

export const createMediaPipeManager = () => new MediaPipeManager();
