import { useState } from 'react';
import { Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { captureImage, CaptureResult } from '@/utils/camera';

interface CaptureButtonProps {
  onCapture: (result: CaptureResult) => void;
  captured?: boolean;
  label?: string;
  preferCamera?: boolean;
}

export default function CaptureButton({ 
  onCapture, 
  captured = false, 
  label = "Capture",
  preferCamera = true 
}: CaptureButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const handleCapture = async () => {
    setIsCapturing(true);
    setCaptureError(null);
    try {
      const result = await captureImage(preferCamera);
      if (result) {
        onCapture(result);
      }
      // null means the user cancelled the file picker — no error needed
    } catch (e) {
      setCaptureError(
        'Could not open the camera or gallery. Try tapping again, or check that the app has camera access in your device settings.'
      );
      console.warn('[VialScreen] captureImage error:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleCapture}
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
        <span>{isCapturing ? 'Opening Camera…' : captured ? 'Retake' : label}</span>
      </button>

      {captureError && (
        <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-xs rounded-lg p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{captureError}</span>
        </div>
      )}
    </div>
  );
}
