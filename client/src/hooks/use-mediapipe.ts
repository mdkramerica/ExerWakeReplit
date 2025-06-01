import { useState, useCallback, useRef } from "react";
import { SimpleHandTracker, type SimpleHandLandmark } from "@/lib/simple-hand-tracker";

export const useMediaPipe = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [landmarks, setLandmarks] = useState<SimpleHandLandmark[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const trackerRef = useRef<SimpleHandTracker | null>(null);

  const initializeMediaPipe = useCallback(async () => {
    try {
      if (!trackerRef.current) {
        trackerRef.current = new SimpleHandTracker();
      }

      setIsInitialized(true);
      setError(null);
      console.log("Hand tracker initialized successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize hand tracker";
      setError(errorMessage);
      console.error("Hand tracker initialization error:", err);
    }
  }, []);

  const processFrame = useCallback(async (video: HTMLVideoElement) => {
    if (!trackerRef.current || !isInitialized) return;

    try {
      const result = trackerRef.current.processFrame(video);
      setHandDetected(result.handDetected);
      setLandmarks(result.landmarks);
    } catch (err) {
      console.error("Error processing frame:", err);
    }
  }, [isInitialized]);

  const cleanup = useCallback(() => {
    if (trackerRef.current) {
      trackerRef.current.cleanup();
      trackerRef.current = null;
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
