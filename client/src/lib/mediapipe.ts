import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

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

export class MediaPipeManager {
  private hands: Hands | null = null;
  private camera: Camera | null = null;
  private isLoaded = false;
  private onResults: ((results: Results) => void) | null = null;

  async initialize() {
    if (this.isLoaded) return;

    try {
      // Initialize MediaPipe Hands with local file handling
      this.hands = new Hands({
        locateFile: (file: string) => {
          // Use jsdelivr CDN with specific version for better reliability
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
        }
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      this.hands.onResults((results: Results) => {
        if (this.onResults) {
          this.onResults(results);
        }
      });

      this.isLoaded = true;
      console.log("MediaPipe initialized successfully");
    } catch (error) {
      console.error("Failed to initialize MediaPipe:", error);
      throw error;
    }
  }

  setOnResults(callback: (results: Results) => void) {
    this.onResults = callback;
  }

  async processFrame(imageElement: HTMLCanvasElement | HTMLVideoElement) {
    if (!this.hands || !this.isLoaded) {
      console.warn("MediaPipe not initialized, skipping frame");
      return;
    }

    try {
      await this.hands.send({ image: imageElement });
    } catch (error) {
      console.error("Error processing frame:", error);
    }
  }

  startCamera(videoElement: HTMLVideoElement) {
    if (!this.isLoaded || !this.hands) {
      throw new Error("MediaPipe not initialized");
    }

    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        if (this.hands) {
          await this.hands.send({ image: videoElement });
        }
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
    if (this.hands) {
      this.hands.close();
    }
    this.hands = null;
    this.camera = null;
    this.isLoaded = false;
    this.onResults = null;
  }
}

export const createMediaPipeManager = () => new MediaPipeManager();
