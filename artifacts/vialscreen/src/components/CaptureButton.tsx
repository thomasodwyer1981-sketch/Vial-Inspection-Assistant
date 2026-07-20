import { useState } from 'react';
import { Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { captureImage, isCameraApiAvailable, type CaptureResult } from '@/utils/camera';
import LiveCameraCapture from '@/components/LiveCameraCapture';
import type { CaptureBackground } from '@/types';

interface CaptureButtonProps {
  onCapture: (result: CaptureResult) => void;
  captured?: boolean;
  label?: string;
  background?: CaptureBackground;
}

export default function CaptureButton({
  onCapture,
  captured = false,
  label = 'Capture',
  background = 'white',
}: CaptureButtonProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const handleTap = async () => {
    setCaptureError(null);

    if (isCameraApiAvailable()) {
      // Open live camera viewfinder
      setShowCamera(true);
      return;
    }

    // No getUserMedia available — fall back to file picker directly
    setIsCapturing(true);
    try {
      const result = await captureImage(true);
      if (result) onCapture(result);
    } catch {
      setCaptureError(
        'Could not open the camera. Tap again or check that camera access is allowed in your device settings.',
      );
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <>
      {/* Live camera overlay */}
      <LiveCameraCapture
        isOpen={showCamera}
        background={background}
        onCapture={(result) => {
          onCapture(result);
          setShowCamera(false);
        }}
        onClose={() => setShowCamera(false)}
      />

      <div className="space-y-2">
        <button
          onClick={handleTap}
          disabled={isCapturing}
          className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60 ${
            captured
              ? 'bg-secondary text-secondary-foreground border border-border'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          {isCapturing ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : captured ? (
            <RefreshCw className="w-5 h-5" />
          ) : (
            <Camera className="w-5 h-5" />
          )}
          <span>
            {isCapturing ? 'Opening Camera…' : captured ? 'Retake' : label}
          </span>
        </button>

        {captureError && (
          <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-xs rounded-lg p-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{captureError}</span>
          </div>
        )}
      </div>
    </>
  );
}
