// Video recording lifecycle hooks (injected by export tooling)
declare global {
  interface Window {
    startRecording?: () => void;
    stopRecording?: () => void;
  }
}

export {};
