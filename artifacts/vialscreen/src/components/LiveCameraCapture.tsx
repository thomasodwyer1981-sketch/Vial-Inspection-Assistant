/**
 * VialScreen — Live Camera Viewfinder
 *
 * Full-screen camera overlay with:
 * - Live getUserMedia video feed
 * - Framing guide overlay
 * - Best-of-3 burst capture (auto-selects sharpest frame)
 * - Immediate quality feedback (blur + exposure check)
 * - Torch/flashlight toggle (where supported)
 * - Graceful fallback to file picker if camera unavailable
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Zap,
  ZapOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  requestCameraStream,
  captureFrameFromVideo,
  stopStream,
  openFilePicker,
  fileToDataUrl,
  isCameraApiAvailable,
  type CaptureResult,
} from '@/utils/camera';
import {
  loadImage,
  drawToCanvas,
  computeBlurMetrics,
  computePixelStats,
} from '@/analysis/imageAnalysis';
import type { CaptureBackground } from '@/types';

interface QualityFeedback {
  label: string;
  detail: string;
  level: 'good' | 'acceptable' | 'poor';
}

interface LiveCameraCaptureProps {
  isOpen: boolean;
  onCapture: (result: CaptureResult) => void;
  onClose: () => void;
  background?: CaptureBackground;
}

type InternalState = 'requesting' | 'streaming' | 'capturing' | 'preview' | 'error';

const BG_LABELS: Record<CaptureBackground, string> = {
  white: 'White Background',
  black: 'Black Background',
  label: 'Label Capture',
  label2: 'Label Detail',
};

export default function LiveCameraCapture({
  isOpen,
  onCapture,
  onClose,
  background = 'white',
}: LiveCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<InternalState>('requesting');
  const [capturedResult, setCapturedResult] = useState<CaptureResult | null>(null);
  const [quality, setQuality] = useState<QualityFeedback | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // ── File picker fallback ────────────────────────────────────
  const handleFileFallback = useCallback(async () => {
    try {
      const files = await openFilePicker({ accept: 'image/*', capture: 'environment' });
      if (files.length > 0) {
        const result = await fileToDataUrl(files[0]);
        onCapture(result);
      }
    } catch {
      // User cancelled — just close silently
    }
    onClose();
  }, [onCapture, onClose]);

  // ── Camera stream lifecycle ─────────────────────────────────
  const startStream = useCallback(async () => {
    setState('requesting');
    if (!isCameraApiAvailable()) {
      await handleFileFallback();
      return;
    }
    try {
      const stream = await requestCameraStream('environment');
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Detect torch support
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const caps = (track as MediaStreamTrack & {
            getCapabilities?: () => Record<string, unknown>;
          }).getCapabilities?.();
          setTorchSupported(!!(caps && 'torch' in caps));
        } catch {
          setTorchSupported(false);
        }
      }

      setState('streaming');
    } catch {
      // Permission denied or no camera — fall back silently to file picker
      await handleFileFallback();
    }
  }, [handleFileFallback]);

  // Mount / open / close
  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        stopStream(streamRef.current);
        streamRef.current = null;
      }
      setState('requesting');
      setCapturedResult(null);
      setQuality(null);
      setTorchOn(false);
      return;
    }
    startStream();
    return () => {
      if (streamRef.current) {
        stopStream(streamRef.current);
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Capture ────────────────────────────────────────────────
  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || state !== 'streaming') return;
    setState('capturing');

    try {
      // 400 ms AF settle before grabbing first frame
      await new Promise<void>((r) => setTimeout(r, 400));

      // Best-of-3 burst
      const candidates: Array<CaptureResult & { sharpness: number }> = [];
      for (let i = 0; i < 3; i++) {
        if (i > 0) await new Promise<void>((r) => setTimeout(r, 280));
        const frame = captureFrameFromVideo(video, 1280);
        // Quick sharpness check on downsampled version
        const img = await loadImage(frame.dataUrl);
        const { ctx, width, height } = drawToCanvas(img, 512);
        const imageData = ctx.getImageData(0, 0, width, height);
        const blur = computeBlurMetrics(imageData);
        candidates.push({ ...frame, sharpness: blur.sharpnessScore });
      }

      // Pick sharpest frame
      const best = candidates.reduce((a, b) => (a.sharpness > b.sharpness ? a : b));

      // Full quality assessment on best frame
      const img = await loadImage(best.dataUrl);
      const { ctx, width, height } = drawToCanvas(img, 512);
      const imageData = ctx.getImageData(0, 0, width, height);
      const stats = computePixelStats(imageData);
      const blur = computeBlurMetrics(imageData);

      let level: QualityFeedback['level'] = 'good';
      let label = 'Good quality';
      let detail = 'Image looks sharp and well-exposed.';

      if (stats.meanBrightness < 25) {
        level = 'poor';
        label = 'Very dark image';
        detail = 'Improve lighting — the vial body may not be visible to the analysis.';
      } else if (stats.overexposedFraction > 0.35) {
        level = 'acceptable';
        label = 'Possibly overexposed';
        detail = 'Move away from direct bright light or flash.';
      } else if (blur.sharpnessScore < 30) {
        level = 'poor';
        label = 'Image may be blurry';
        detail = 'Hold the phone very still and retake for better analysis accuracy.';
      } else if (blur.sharpnessScore < 55) {
        level = 'acceptable';
        label = 'Acceptable — slightly soft';
        detail = 'Holding steady or using a flat surface will improve accuracy.';
      }

      setQuality({ label, detail, level });
      setCapturedResult(best);
      setState('preview');
    } catch {
      // Capture failed — go back to streaming so user can try again
      setState('streaming');
    }
  };

  const handleRetake = () => {
    setCapturedResult(null);
    setQuality(null);
    setState('streaming');
  };

  const handleAccept = () => {
    if (capturedResult) {
      onCapture(capturedResult);
      onClose();
    }
  };

  const handleTorchToggle = async () => {
    if (!streamRef.current || !torchSupported) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      await (track as MediaStreamTrack & {
        applyConstraints: (c: object) => Promise<void>;
      }).applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch {
      setTorchSupported(false);
    }
  };

  if (!isOpen) return null;

  const isLabelBackground = background === 'label' || background === 'label2';

  const qualityColors = {
    good: 'bg-green-500/90',
    acceptable: 'bg-yellow-500/90',
    poor: 'bg-red-500/90',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* ── Video / Preview area ────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        {/* Live camera feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            state === 'preview' ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/* Captured preview */}
        {capturedResult && (
          <img
            src={capturedResult.dataUrl}
            alt="Captured frame"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
              state === 'preview' ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* ── Guide overlay (streaming only) ──────────────── */}
        {state === 'streaming' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`relative ${
                isLabelBackground ? 'w-[78%] aspect-[5/3]' : 'w-[58%] aspect-[1/2.6]'
              }`}
            >
              {/* Semi-transparent surround using box-shadow trick */}
              <div className="absolute inset-0 rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.42)]" />
              {/* Corner marks */}
              {[
                'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl',
                'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl',
                'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl',
                'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl',
              ].map((cls, i) => (
                <div key={i} className={`absolute w-7 h-7 border-white ${cls}`} />
              ))}
            </div>
          </div>
        )}

        {/* Guide hint text */}
        {state === 'streaming' && (
          <div className="absolute bottom-[24%] left-0 right-0 flex justify-center pointer-events-none">
            <span className="text-white/80 text-xs font-medium bg-black/40 px-3 py-1 rounded-full">
              {isLabelBackground ? 'Center label in frame' : 'Center vial in frame'}
            </span>
          </div>
        )}

        {/* ── Capturing spinner ───────────────────────────── */}
        {state === 'capturing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55">
            <div className="w-14 h-14 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-white font-semibold text-sm">Selecting sharpest frame…</p>
            <p className="text-white/60 text-xs mt-1">Taking 3 quick shots</p>
          </div>
        )}

        {/* ── Quality feedback badge (preview) ────────────── */}
        {state === 'preview' && quality && (
          <div className="absolute top-16 left-4 right-4">
            <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${qualityColors[quality.level]}`}>
              {quality.level === 'good' ? (
                <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-white shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-white font-bold text-sm">{quality.label}</p>
                <p className="text-white/90 text-xs mt-0.5 leading-relaxed">{quality.detail}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Top bar ─────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-12">
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-black/50 flex items-center justify-center active:scale-95"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <span className="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full uppercase tracking-wider">
            {BG_LABELS[background]}
          </span>

          {torchSupported && state === 'streaming' ? (
            <button
              onClick={handleTorchToggle}
              className="w-11 h-11 rounded-full bg-black/50 flex items-center justify-center active:scale-95"
            >
              {torchOn ? (
                <Zap className="w-5 h-5 text-yellow-300" />
              ) : (
                <ZapOff className="w-5 h-5 text-white/60" />
              )}
            </button>
          ) : (
            <div className="w-11 h-11" />
          )}
        </div>
      </div>

      {/* ── Bottom controls ─────────────────────────────────── */}
      <div className="bg-black px-6 pt-5 pb-10 flex items-center justify-center min-h-[130px]">
        {/* Shutter button */}
        {state === 'streaming' && (
          <button
            onClick={handleCapture}
            className="w-20 h-20 rounded-full border-4 border-white/40 bg-white/10 flex items-center justify-center active:scale-95 transition-transform shadow-lg"
          >
            <div className="w-14 h-14 rounded-full bg-white" />
          </button>
        )}

        {/* Capturing — disabled shutter */}
        {state === 'capturing' && (
          <div className="w-20 h-20 rounded-full border-4 border-white/20 bg-white/5 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Accept / Retake */}
        {state === 'preview' && (
          <div className="flex gap-4 w-full">
            <button
              onClick={handleRetake}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-bold active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Retake
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-black font-bold active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              Use Photo
            </button>
          </div>
        )}

        {/* Requesting — loading state */}
        {state === 'requesting' && (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            <p className="text-xs">Opening camera…</p>
          </div>
        )}
      </div>
    </div>
  );
}
