/**
 * VialScreen — Camera & Media Capture Utilities
 *
 * Strategy:
 * 1. Prefer getUserMedia (live camera) on supported mobile browsers over HTTPS
 * 2. Fallback: <input type="file" capture="environment"> for reliable cross-device support
 * 3. Final fallback: standard file upload (no capture attribute)
 *
 * All captured images are normalized to base64 data URLs.
 */

export interface CaptureResult {
  dataUrl: string;
  width: number;
  height: number;
  /** Small thumbnail generated at capture-accept time (see generateThumbnail). */
  thumbDataUrl?: string;
}

// ----------------------------------------------------------------
// Check whether getUserMedia is likely available
// ----------------------------------------------------------------
export function isCameraApiAvailable(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// ----------------------------------------------------------------
// Request live camera stream
// Returns a MediaStream or throws on denial/unavailability
// ----------------------------------------------------------------
export async function requestCameraStream(
  facingMode: 'environment' | 'user' = 'environment',
): Promise<MediaStream> {
  if (!isCameraApiAvailable()) {
    throw new Error('Camera API is not available in this browser.');
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode,
      // Request maximum resolution for sharpest vial detail
      width: { ideal: 4096, min: 640 },
      height: { ideal: 3072, min: 480 },
    },
    audio: false,
  });
}

// ----------------------------------------------------------------
// Capture a still frame from a live video element
// ----------------------------------------------------------------
export function captureFrameFromVideo(
  video: HTMLVideoElement,
  maxDim = 2048,
): CaptureResult {
  const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.round(video.videoWidth * scale);
  const height = Math.round(video.videoHeight * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable — cannot capture frame.');
  ctx.drawImage(video, 0, 0, width, height);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width,
    height,
  };
}

// ----------------------------------------------------------------
// Stop all tracks on a MediaStream
// ----------------------------------------------------------------
export function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

// ----------------------------------------------------------------
// Convert a File object to a CaptureResult
// ----------------------------------------------------------------
export function fileToDataUrl(file: File): Promise<CaptureResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        // Normalize size if needed
        const maxDim = 1920;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        if (scale < 1) {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.92), width, height });
        } else {
          resolve({ dataUrl, width, height });
        }
      };
      img.onerror = reject;
      img.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ----------------------------------------------------------------
// Programmatic file input (upload or mobile capture fallback)
// Opens a file picker; on mobile browsers, "capture=environment"
// typically opens the rear camera directly.
// ----------------------------------------------------------------
export function openFilePicker(options: {
  accept?: string;
  capture?: 'environment' | 'user' | boolean;
  multiple?: boolean;
}): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.accept ?? 'image/*';
    if (options.multiple) input.multiple = true;
    if (options.capture !== undefined) {
      if (typeof options.capture === 'boolean') {
        if (options.capture) input.setAttribute('capture', 'environment');
      } else {
        input.setAttribute('capture', options.capture);
      }
    }

    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      if (files.length === 0) {
        reject(new Error('No file selected'));
      } else {
        resolve(files);
      }
    };

    input.oncancel = () => reject(new Error('File picker cancelled'));

    // Firefox requires the element to be in the DOM
    document.body.appendChild(input);
    input.click();
    setTimeout(() => document.body.removeChild(input), 1000);
  });
}

// ----------------------------------------------------------------
// High-level capture helper
// Tries file picker with camera capture attribute as the primary
// path (works reliably on iOS Safari and most Android browsers).
// ----------------------------------------------------------------
export async function captureImage(
  preferCamera = true,
): Promise<CaptureResult | null> {
  try {
    const files = await openFilePicker({
      accept: 'image/*',
      capture: preferCamera ? 'environment' : undefined,
    });
    if (files.length === 0) return null;
    return await fileToDataUrl(files[0]);
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------
// Generate a thumbnail (smaller) version of a data URL
// Used for history list view
// ----------------------------------------------------------------
export function generateThumbnail(dataUrl: string, maxDim = 120): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
