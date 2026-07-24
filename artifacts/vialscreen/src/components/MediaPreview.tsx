import { MediaCapture } from '@/types';

interface MediaPreviewProps {
  capture: MediaCapture;
  onRetake?: () => void;
  className?: string;
}

const BG_LABELS: Record<string, string> = {
  white: 'White Background',
  black: 'Black Background',
  label: 'Primary Label',
  label2: 'Secondary Detail'
};

export default function MediaPreview({ capture, onRetake, className = '' }: MediaPreviewProps) {
  return (
    <div className={`relative rounded-xl overflow-hidden border border-border bg-black group ${className}`}>
      <img 
        src={capture.dataUrl || capture.thumbDataUrl} 
        alt={BG_LABELS[capture.background]} 
        className="w-full h-auto aspect-[3/4] object-contain object-center"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 flex justify-between items-end">
        <span className="text-white text-xs font-bold drop-shadow-md">
          {BG_LABELS[capture.background]}
        </span>
        {onRetake && (
          <button 
            onClick={onRetake}
            className="text-xs font-bold bg-white/20 hover:bg-white/30 text-white backdrop-blur-md px-3 py-1 rounded-full transition-colors"
          >
            Retake
          </button>
        )}
      </div>
    </div>
  );
}
