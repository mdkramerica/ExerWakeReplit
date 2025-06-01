import { useState, useCallback, useRef } from "react";
import { MediaPipeManager, type HandLandmark } from "@/lib/mediapipe";

export const useMediaPipe = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [landmarks, setLandmarks] = useState<HandLandmark[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const mediaPipeRef = useRef<MediaPipeManager | null>(null);

  const initializeMediaPipe = useCallback(async () => {
    try {
      if (!mediaPipeRef.current) {
        mediaPipeRef.current = new (await import("@/lib/mediapipe")).MediaPipeManager();
      }

      await mediaPipeRef.current.initialize();
      
      mediaPipeRef.current.setOnResults((results: any) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          setHandDetected(true);
          setLandmarks(results.multiHandLandmarks[0]);
        } else {
          setHandDetected(false);
          setLandmarks([]);
        }
      });

      setIsInitialized(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize MediaPipe";
      setError(errorMessage);
      console.error("MediaPipe initialization error:", err);
    }
  }, []);

  const processFrame = useCallback(async (canvas: HTMLCanvasElement) => {
    if (!mediaPipeRef.current || !isInitialized) return;

    try {
      await mediaPipeRef.current.processFrame(canvas);
    } catch (err) {
      console.error("Error processing frame:", err);
    }
  }, [isInitialized]);

  const cleanup = useCallback(() => {
    if (mediaPipeRef.current) {
      mediaPipeRef.current.cleanup();
      mediaPipeRef.current = null;
    }
    setIsInitialized(false);
    setHandDetected(false);
    setLandmarks([]);
    setError(null);
  }, []);

  return {
    isInitialized,
    handDetected,
    landmarks,
    error,
    initializeMediaPipe,
    processFrame,
    cleanup
  };
};
