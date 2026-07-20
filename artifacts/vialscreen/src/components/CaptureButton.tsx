import { useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
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

  const handleCapture = async () => {
    setIsCapturing(true);
    try {
      const result = await captureImage(preferCamera);
      if (result) {
        onCapture(result);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <button
      onClick={handleCapture}
      disabled={isCapturing}
      className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold shadow-sm transition-transform active:scale-[0.98] ${
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
      <span>{isCapturing ? 'Opening Camera...' : captured ? 'Retake' : label}</span>
    </button>
  );
}
