import { useState, useEffect, useRef } from "react";

/**
 * Core video player hook that manages scene progression and recording lifecycle.
 * DO NOT MODIFY -- the export pipeline depends on this exact implementation.
 */
export function useVideoPlayer(sceneDurations: number[]) {
  const [currentScene, setCurrentScene] = useState(0);
  const sceneStartTimeRef = useRef<number>(Date.now());
  const recordingStartedRef = useRef(false);

  useEffect(() => {
    // Start recording on first mount
    if (!recordingStartedRef.current && typeof window.startRecording === "function") {
      window.startRecording();
      recordingStartedRef.current = true;
    }

    const duration = sceneDurations[currentScene];
    sceneStartTimeRef.current = Date.now();

    const timer = setTimeout(() => {
      const nextScene = (currentScene + 1) % sceneDurations.length;
      
      // Stop recording when loop completes
      if (nextScene === 0 && typeof window.stopRecording === "function") {
        window.stopRecording();
      }
      
      setCurrentScene(nextScene);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentScene, sceneDurations]);

  return { currentScene };
}
