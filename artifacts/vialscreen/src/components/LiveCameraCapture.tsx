/**
 * VialScreen — Live Camera Viewfinder
 *
 * Full-screen camera overlay with:
 * - Live getUserMedia video feed
 * - Framing guide overlay
 * - Best-of-3 burst capture (auto-selects sharpest frame)
 * - 1.5 s countdown ring after shutter tap (lets tap-shake settle)
 * - DeviceMotion stability ring — auto-fires when phone held steady for 1.5 s
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
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  requestCameraStream,
  captureFrameFromVideo,
  stopStream,
  openFilePicker,
  fileToDataUrl,
  isCameraApiAvailable,
  generateThumbnail,
  type CaptureResult,
} from '@/utils/camera';
import { hapticLight } from '@/utils/haptics';
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

type InternalState = 'requesting' | 'streaming' | 'countdown' | 'capturing' | 'preview' | 'error';

const BG_LABELS: Record<CaptureBackground, string> = {
  white: 'White Background',
  black: 'Black Background',
  label: 'Label Capture',
  label2: 'Label Detail',
};

// SVG ring constants — 96×96 viewBox, r=44
const RING_R = 44;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R; // ≈ 276.5

// Motion stability thresholds
const STABLE_VARIANCE_THRESHOLD = 0.12; // (m/s²)² — variance below this = steady
const STABLE_DURATION_MS = 1500;        // ms held steady before auto-fire
const MOTION_HISTORY_SIZE = 12;         // samples used for rolling variance

export default function LiveCameraCapture({
  isOpen,
  onCapture,
  onClose,
  background = 'white',
}: LiveCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownRingRef = useRef<SVGCircleElement>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stableStartRef = useRef<number | null>(null);
  const motionHistoryRef = useRef<number[]>([]);
  const stateRef = useRef<InternalState>('requesting');

  const [state, setState] = useState<InternalState>('requesting');
  const [capturedResult, setCapturedResult] = useState<CaptureResult | null>(null);
  const [quality, setQuality] = useState<QualityFeedback | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [stableProgress, setStableProgress] = useState(0); // 0–100
  const [isStable, setIsStable] = useState(false);
  const [motionAvailable, setMotionAvailable] = useState(false);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);

  // Zoom state
  const [zoom, setZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 5 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef(1);

  // Keep stateRef in sync so motion/timer callbacks can read it without stale closure
  const setStateSync = useCallback((s: InternalState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  // ── File picker fallback ─────────────────────────────────────
  const handleFileFallback = useCallback(async () => {
    try {
      const files = await openFilePicker({ accept: 'image/*', capture: 'environment' });
      if (files.length > 0) {
        const result = await fileToDataUrl(files[0]);
        const thumbDataUrl = await generateThumbnail(result.dataUrl, 144).catch(() => undefined);
        onCapture({ ...result, thumbDataUrl });
      }
    } catch {
      // User cancelled — just close silently
    }
    onClose();
  }, [onCapture, onClose]);

  // ── Camera stream lifecycle ──────────────────────────────────
  // Generation counter guards against a race: startStream is async, so a
  // rapid close/reopen while getUserMedia is pending would otherwise leak
  // a live camera stream that nothing ever stops.
  const streamGenRef = useRef(0);
  const startStream = useCallback(async () => {
    const gen = ++streamGenRef.current;
    setStateSync('requesting');
    if (!isCameraApiAvailable()) {
      await handleFileFallback();
      return;
    }
    try {
      const stream = await requestCameraStream('environment');
      if (gen !== streamGenRef.current) {
        // Overlay closed (or restarted) while the camera was initializing —
        // stop the stale stream instead of leaking it.
        stopStream(stream);
        return;
      }
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Detect torch + zoom support
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const caps = (track as MediaStreamTrack & {
            getCapabilities?: () => Record<string, { min?: number; max?: number }>;
          }).getCapabilities?.();
          if (caps) {
            setTorchSupported('torch' in caps);
            if ('zoom' in caps && caps.zoom) {
              const zoomCaps = caps.zoom as { min?: number; max?: number };
              setZoomSupported(true);
              setZoomRange({
                min: zoomCaps.min ?? 1,
                max: Math.min(zoomCaps.max ?? 5, 8),
              });
            }
            // Auto-enable torch for white/black captures
            if ('torch' in caps && background !== 'label' && background !== 'label2') {
              try {
                await (track as MediaStreamTrack & {
                  applyConstraints: (c: object) => Promise<void>;
                }).applyConstraints({ advanced: [{ torch: true }] });
                setTorchOn(true);
              } catch { /* torch auto-enable failed, that's fine */ }
            }
          }
        } catch {
          setTorchSupported(false);
        }
      }

      setStateSync('streaming');
    } catch {
      await handleFileFallback();
    }
  }, [handleFileFallback, setStateSync]);

  // Mount / open / close
  useEffect(() => {
    if (!isOpen) {
      streamGenRef.current++; // invalidate any in-flight camera request
      if (streamRef.current) {
        stopStream(streamRef.current);
        streamRef.current = null;
      }
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
      setStateSync('requesting');
      setCapturedResult(null);
      setQuality(null);
      setTorchOn(false);
      setStableProgress(0);
      setIsStable(false);
      stableStartRef.current = null;
      motionHistoryRef.current = [];
      return;
    }
    startStream();
    return () => {
      streamGenRef.current++; // invalidate any in-flight camera request
      if (streamRef.current) {
        stopStream(streamRef.current);
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Burst capture (shared by tap and auto-fire) ─────────────
  const runBurst = useCallback(async () => {
    const video = videoRef.current;
    if (!video || stateRef.current === 'capturing' || stateRef.current === 'preview') return;
    setStateSync('capturing');
    void hapticLight(); // shutter feedback on device (no-op on web)

    try {
      // 400 ms AF settle before grabbing first frame
      await new Promise<void>((r) => setTimeout(r, 400));

      // Best-of-5 burst — more candidates = better chance of a perfect frame.
      // 1600px max dimension: the analysis engine works at 512px, so anything
      // beyond 1600 only slows the burst and bloats memory with no accuracy gain.
      const candidates: Array<CaptureResult & { sharpness: number }> = [];
      for (let i = 0; i < 5; i++) {
        if (i > 0) await new Promise<void>((r) => setTimeout(r, 220));
        const frame = captureFrameFromVideo(video, 1600);
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
      setStateSync('preview');
    } catch {
      setStateSync('streaming');
    }
  }, [setStateSync]);

  // Keep runBurst accessible to motion effect without triggering re-subscribe
  const runBurstRef = useRef(runBurst);
  runBurstRef.current = runBurst;

  // ── DeviceMotion stability detection ────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const hasMotion = typeof DeviceMotionEvent !== 'undefined';
    if (!hasMotion) return;

    let cancelled = false;

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || (acc.x === null && acc.y === null && acc.z === null)) return;

      // Mark motion as available only once a REAL event with data arrives —
      // desktop browsers expose the DeviceMotionEvent type but never fire,
      // which previously showed a misleading "Move less to auto-fire" hint.
      setMotionAvailable(true);

      if (stateRef.current !== 'streaming') {
        stableStartRef.current = null;
        return;
      }

      const mag = Math.sqrt((acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2);

      const history = motionHistoryRef.current;
      history.push(mag);
      if (history.length > MOTION_HISTORY_SIZE) history.shift();
      if (history.length < 5) return;

      const mean = history.reduce((a, b) => a + b, 0) / history.length;
      const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length;

      const stable = variance < STABLE_VARIANCE_THRESHOLD;
      setIsStable(stable);

      if (!stable) {
        stableStartRef.current = null;
        setStableProgress(0);
      } else if (stableStartRef.current === null) {
        stableStartRef.current = Date.now();
      }
    };

    // Separate interval to update stableProgress (avoids flooding setState in motion handler)
    const intervalId = setInterval(() => {
      if (stateRef.current !== 'streaming' || stableStartRef.current === null) return;
      const elapsed = Date.now() - stableStartRef.current;
      const progress = Math.min(100, (elapsed / STABLE_DURATION_MS) * 100);
      setStableProgress(progress);
      // Ring stays full at 100% as a "steady — tap to capture" indicator. No auto-fire.
      if (progress >= 100) stableStartRef.current = null;
    }, 50);

    // iOS 13+ requires explicit permission before motion events fire.
    // If previously granted this resolves silently; if a prompt is needed
    // outside a user gesture it rejects — the manual shutter still works.
    const dme = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof dme.requestPermission === 'function') {
      dme.requestPermission()
        .then((res) => {
          if (!cancelled && res === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
          }
        })
        .catch(() => { /* permission unavailable — manual capture only */ });
    } else {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('devicemotion', handleMotion);
      clearInterval(intervalId);
    };
  }, [isOpen]);

  // ── Visible 3-2-1 countdown number ──────────────────────────
  useEffect(() => {
    if (state !== 'countdown') { setCountdownNum(null); return; }
    setCountdownNum(3);
    const t1 = setTimeout(() => setCountdownNum(2), STABLE_DURATION_MS / 3);
    const t2 = setTimeout(() => setCountdownNum(1), (STABLE_DURATION_MS * 2) / 3);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [state]);

  // ── Countdown ring animation trigger ────────────────────────
  useEffect(() => {
    if (state !== 'countdown') return;

    const ring = countdownRingRef.current;
    if (ring) {
      // Start with full offset (empty ring), then animate to 0 (full ring)
      ring.style.transition = 'none';
      ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE);
      // Next frame: start the transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ring.style.transition = `stroke-dashoffset ${STABLE_DURATION_MS}ms linear`;
          ring.style.strokeDashoffset = '0';
        });
      });
    }

    countdownTimerRef.current = setTimeout(() => {
      runBurstRef.current();
    }, STABLE_DURATION_MS);

    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [state]);

  // ── Shutter tap handler ──────────────────────────────────────
  const handleShutterTap = useCallback(() => {
    if (stateRef.current !== 'streaming') return;
    stableStartRef.current = null;
    setStableProgress(0);
    setStateSync('countdown');
  }, [setStateSync]);

  const handleRetake = () => {
    setCapturedResult(null);
    setQuality(null);
    stableStartRef.current = null;
    setStableProgress(0);
    setIsStable(false);
    motionHistoryRef.current = [];
    setStateSync('streaming');
  };

  const handleAccept = async () => {
    if (!capturedResult) return;
    // Attach a small thumbnail at accept time — history storage must never
    // hold full-resolution captures (they exhaust the localStorage quota).
    const thumbDataUrl = await generateThumbnail(capturedResult.dataUrl, 144).catch(() => undefined);
    onCapture({ ...capturedResult, thumbDataUrl });
    onClose();
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

  // ── Zoom helpers ─────────────────────────────────────────────
  const applyZoom = useCallback(async (value: number) => {
    if (!streamRef.current || !zoomSupported) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    const clamped = Math.max(zoomRange.min, Math.min(zoomRange.max, value));
    try {
      await (track as MediaStreamTrack & {
        applyConstraints: (c: object) => Promise<void>;
      }).applyConstraints({ advanced: [{ zoom: clamped }] });
      setZoom(clamped);
    } catch { /* zoom apply failed */ }
  }, [zoomSupported, zoomRange]);

  const handleZoomIn  = () => applyZoom(Math.min(zoom + 0.5, zoomRange.max));
  const handleZoomOut = () => applyZoom(Math.max(zoom - 0.5, zoomRange.min));

  // Pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.sqrt(dx * dx + dy * dy);
      pinchStartZoomRef.current = zoom;
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / pinchStartDistRef.current;
      applyZoom(pinchStartZoomRef.current * scale);
    }
  }, [applyZoom]);

  const handleTouchEnd = useCallback(() => {
    pinchStartDistRef.current = null;
  }, []);

  if (!isOpen) return null;

  const isLabelBackground = background === 'label' || background === 'label2';
  const isStreaming = state === 'streaming';
  const isCountingDown = state === 'countdown';

  const qualityColors = {
    good: 'bg-green-500/90',
    acceptable: 'bg-yellow-500/90',
    poor: 'bg-red-500/90',
  };

  // Stability ring stroke offset (streaming state only)
  const stabilityOffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * stableProgress) / 100;
  const stabilityColor = isStable ? '#34d399' : 'rgba(255,255,255,0.25)';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* ── Video / Preview area ─────────────────────────────── */}
      <div
        className="relative flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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

        {/* ── Guide overlay ────────────────────────────────── */}
        {(isStreaming || isCountingDown) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`relative ${
                isLabelBackground ? 'w-[78%] aspect-[5/3]' : 'w-[58%] aspect-[1/2.6]'
              }`}
            >
              <div className={`absolute inset-0 rounded-xl border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.42)] transition-colors duration-300 ${
                isCountingDown ? 'border-white/90' : 'border-white/70'
              }`} />
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

        {/* Guide hint / countdown hint */}
        {(isStreaming || isCountingDown) && (
          <div className="absolute bottom-[24%] left-0 right-0 flex justify-center pointer-events-none">
            <span className={`text-white/90 text-xs font-semibold bg-black/50 px-3 py-1 rounded-full transition-all duration-200 ${
              isCountingDown ? 'scale-105' : ''
            }`}>
              {isCountingDown
                ? '📸 Get ready — photo in ' + (countdownNum ?? 1) + '…'
                : isLabelBackground
                  ? 'Center label in frame'
                  : 'Center vial in frame'}
            </span>
          </div>
        )}

        {/* ── 3-2-1 countdown overlay ──────────────────────── */}
        {isCountingDown && countdownNum !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="text-white font-black leading-none select-none"
              style={{ fontSize: 160, textShadow: '0 6px 40px rgba(0,0,0,0.9)', opacity: 0.88 }}
            >
              {countdownNum}
            </span>
          </div>
        )}

        {/* ── Capturing spinner ────────────────────────────── */}
        {state === 'capturing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55">
            <div className="w-14 h-14 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-white font-semibold text-sm">Selecting sharpest frame…</p>
            <p className="text-white/60 text-xs mt-1">Taking 5 quick shots</p>
          </div>
        )}

        {/* ── Quality feedback badge (preview) ─────────────── */}
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

        {/* ── Top bar ──────────────────────────────────────── */}
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

          {torchSupported && isStreaming ? (
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

        {/* ── Zoom controls ────────────────────────────────── */}
        {isStreaming && zoomSupported && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
            <button
              onClick={handleZoomIn}
              disabled={zoom >= zoomRange.max}
              className="w-10 h-10 rounded-full bg-black/55 border border-white/20 flex items-center justify-center active:scale-95 disabled:opacity-30"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4 text-white" />
            </button>
            <div className="text-center text-white text-[10px] font-bold bg-black/40 rounded-full py-0.5">
              {zoom.toFixed(1)}×
            </div>
            <button
              onClick={handleZoomOut}
              disabled={zoom <= zoomRange.min}
              className="w-10 h-10 rounded-full bg-black/55 border border-white/20 flex items-center justify-center active:scale-95 disabled:opacity-30"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* ── Steadiness badge — appears when phone is stable ── */}
        {isStreaming && motionAvailable && isStable && (
          <div className="absolute bottom-[30%] left-0 right-0 flex justify-center pointer-events-none">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full text-emerald-300 bg-black/40">
              ● Steady — tap to capture
            </span>
          </div>
        )}
      </div>

      {/* ── Bottom controls ──────────────────────────────────── */}
      <div className="bg-black px-6 pt-5 pb-10 flex items-center justify-center min-h-[130px]">

        {/* Streaming — shutter button with stability ring */}
        {isStreaming && (
          <div className="relative w-24 h-24 flex items-center justify-center">
            {/* Stability / auto-fire ring */}
            <svg
              className="absolute inset-0 -rotate-90"
              viewBox="0 0 96 96"
              aria-hidden="true"
            >
              {/* Track */}
              <circle
                cx="48" cy="48" r={RING_R}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="3"
              />
              {/* Progress */}
              <circle
                cx="48" cy="48" r={RING_R}
                fill="none"
                stroke={stabilityColor}
                strokeWidth="3"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={stabilityOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 80ms linear, stroke 300ms ease' }}
              />
            </svg>
            <button
              onClick={handleShutterTap}
              className="w-20 h-20 rounded-full border-4 border-white/40 bg-white/10 flex items-center justify-center active:scale-95 transition-transform shadow-lg"
              aria-label="Capture photo"
            >
              <div className="w-14 h-14 rounded-full bg-white" />
            </button>
          </div>
        )}

        {/* Countdown — animated ring, frozen button */}
        {isCountingDown && (
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg
              className="absolute inset-0 -rotate-90"
              viewBox="0 0 96 96"
              aria-hidden="true"
            >
              {/* Track */}
              <circle
                cx="48" cy="48" r={RING_R}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="3.5"
              />
              {/* Countdown fill */}
              <circle
                ref={countdownRingRef}
                cx="48" cy="48" r={RING_R}
                fill="none"
                stroke="white"
                strokeWidth="3.5"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE}
                strokeLinecap="round"
              />
            </svg>
            {/* Frozen shutter disc */}
            <div className="w-20 h-20 rounded-full border-4 border-white/20 bg-white/5 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/30" />
            </div>
          </div>
        )}

        {/* Capturing — disabled spinner */}
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
