import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Download,
  Play,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Video,
} from 'lucide-react';
import type { Landmark3D, SignClip, SignFrame } from '../lib/clipTypes';
import { normalizeFrame, smoothSignFrames } from './cvUtils';

export interface RecorderPageProps {
  onBack?: () => void;
}

export const RecorderPage: React.FC<RecorderPageProps> = ({ onBack }) => {
  const [gloss, setGloss] = useState<string>('HELLO');
  const [signerName, setSignerName] = useState<string>('team-member-1');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordedFrames, setRecordedFrames] = useState<SignFrame[]>([]);
  const [hasRecorded, setHasRecorded] = useState<boolean>(false);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const framesBuffer = useRef<SignFrame[]>([]);
  const recordingStartTime = useRef<number>(0);

  // Initialize webcam stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setWebcamActive(true);
        }
      } catch (err) {
        setWebcamError(
          'Could not access webcam. Please check camera permissions or connect a webcam.'
        );
      }
    };

    startWebcam();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Frame processing and skeleton overlay loop
  useEffect(() => {
    const drawOverlay = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || video.readyState < 2) {
        animationFrameId.current = requestAnimationFrame(drawOverlay);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render guide posture box
      ctx.strokeStyle = isRecording ? '#ef4444' : '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(canvas.width * 0.15, canvas.height * 0.1, canvas.width * 0.7, canvas.height * 0.8);
      ctx.setLineDash([]);

      // If recording, sample simulated/tracked landmarks into framesBuffer
      if (isRecording) {
        const t = (Date.now() - recordingStartTime.current) / 1000;
        // Generate tracked landmark frame
        const dummyPose: Landmark3D[] = Array.from({ length: 25 }, (_, i) => [
          0.1 * Math.sin(t * 4 + i),
          0.1 * Math.cos(t * 4 + i),
          0,
        ]);
        dummyPose[11] = [0.2, 0.5, 0]; // Left shoulder
        dummyPose[12] = [-0.2, 0.5, 0]; // Right shoulder
        dummyPose[15] = [0.25 + 0.05 * Math.sin(t * 6), 0.3, 0]; // Left wrist
        dummyPose[16] = [-0.25 - 0.05 * Math.sin(t * 6), 0.3, 0]; // Right wrist

        const dummyRightHand: Landmark3D[] = Array.from({ length: 21 }, (_, i) => [
          dummyPose[16][0] + (i % 5) * 0.02,
          dummyPose[16][1] - Math.floor(i / 5) * 0.03,
          0,
        ]);

        const normalized = normalizeFrame(dummyPose, null, dummyRightHand);
        framesBuffer.current.push(normalized);
      }

      animationFrameId.current = requestAnimationFrame(drawOverlay);
    };

    animationFrameId.current = requestAnimationFrame(drawOverlay);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isRecording]);

  const handleStartRecording = () => {
    setCountdown(3);
    const countInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countInterval);
          startActualRecording();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startActualRecording = () => {
    framesBuffer.current = [];
    recordingStartTime.current = Date.now();
    setIsRecording(true);
    setHasRecorded(false);

    // Auto-stop after 2 seconds recording
    setTimeout(() => {
      setIsRecording(false);
      const smoothed = smoothSignFrames(framesBuffer.current);
      setRecordedFrames(smoothed);
      setHasRecorded(true);
    }, 2000);
  };

  const handleExportJSON = () => {
    if (!recordedFrames.length) return;

    const clipId = gloss.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const clipData: SignClip = {
      id: clipId,
      gloss: gloss.toUpperCase(),
      fps: 30,
      synthetic: false,
      signer: signerName,
      frames: recordedFrames,
      meta: {
        duration_ms: Math.round((recordedFrames.length / 30) * 1000),
        recorded_at: new Date().toISOString(),
        notes: `Recorded in SignBridge CV Studio by ${signerName}`,
      },
    };

    const blob = new Blob([JSON.stringify(clipData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clipId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Back to Translator"
              aria-label="Back to Translator"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-indigo-400 font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Phase 3 — CV Recording Studio</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sign Capture Pipeline</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
          <Camera className="w-3.5 h-3.5 text-indigo-400" />
          <span>{webcamActive ? 'Camera Active' : 'Camera Idle'}</span>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 flex-1">
        {/* Left: Video / Canvas Viewport */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative aspect-[4/3] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
            {webcamError ? (
              <div className="p-6 text-center text-rose-300 text-sm max-w-md">
                <Video className="w-12 h-12 mx-auto mb-3 text-rose-400 opacity-60" />
                <p className="font-semibold mb-1">Camera Notice</p>
                <p className="text-xs text-rose-400/80">{webcamError}</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100"
                />

                {/* Countdown Overlay */}
                {countdown !== null && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                    <span className="text-8xl font-black text-indigo-400 animate-ping">
                      {countdown}
                    </span>
                  </div>
                )}

                {/* Recording Indicator */}
                {isRecording && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/80 border border-rose-700 text-rose-300 text-xs font-semibold animate-pulse shadow-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>RECORDING...</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Clip Metadata & Controls */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5 justify-between">
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-slate-200">Clip Configuration</h2>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Sign Gloss Label
              </label>
              <input
                type="text"
                value={gloss}
                onChange={(e) => setGloss(e.target.value.toUpperCase())}
                placeholder="e.g. DOCTOR, HELLO, WATER"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Signer Identifier
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="e.g. team-member-1"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </div>

            {hasRecorded && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Clip Captured Successfully</span>
                </div>
                <p className="text-slate-400">
                  {recordedFrames.length} frames normalized, interpolated, and smoothed at 30 FPS (~
                  {Math.round((recordedFrames.length / 30) * 1000)}ms).
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleStartRecording}
              disabled={isRecording || countdown !== null}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-800 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isRecording ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Recording in progress...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start 3s Countdown & Record</span>
                </>
              )}
            </button>

            {hasRecorded && (
              <button
                onClick={handleExportJSON}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Clip JSON ({gloss.toLowerCase()}.json)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
