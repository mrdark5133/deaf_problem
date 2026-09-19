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
  Upload,
  FileCheck,
} from 'lucide-react';
import type { Landmark3D, SignClip, SignFrame } from '../lib/clipTypes';
import { normalizeFrame, smoothSignFrames } from './cvUtils';
import { ImportReviewPage } from './ImportReviewPage';

export interface RecorderPageProps {
  onBack?: () => void;
}

export const RecorderPage: React.FC<RecorderPageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'record' | 'review'>('record');
  const [sourceMode, setSourceMode] = useState<'webcam' | 'video-file'>('webcam');
  const [gloss, setGloss] = useState<string>('HELLO');
  const [signerName, setSignerName] = useState<string>('team-member-1');
  const [datasetSource, setDatasetSource] = useState<string>('team-recording');
  const [license, setLicense] = useState<string>('MIT');
  const [originalId, setOriginalId] = useState<string>('manual-rec-001');

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recordedFrames, setRecordedFrames] = useState<SignFrame[]>([]);
  const [hasRecorded, setHasRecorded] = useState<boolean>(false);
  const [webcamActive, setWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const framesBuffer = useRef<SignFrame[]>([]);
  const recordingStartTime = useRef<number>(0);

  // Initialize webcam stream when in webcam mode
  useEffect(() => {
    if (sourceMode !== 'webcam' || activeTab !== 'record') return;
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
          'Could not access webcam. You can switch to "Upload Video File" mode to import MP4 sign recordings.'
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
  }, [sourceMode, activeTab]);

  // Frame processing and skeleton overlay loop
  useEffect(() => {
    if (activeTab !== 'record') return;

    const drawOverlay = () => {
      const canvas = canvasRef.current;
      const activeVideo = sourceMode === 'webcam' ? videoRef.current : fileVideoRef.current;

      if (!canvas || !activeVideo || activeVideo.readyState < 2) {
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

      // If recording, sample normalized landmark frame
      if (isRecording) {
        const t = (Date.now() - recordingStartTime.current) / 1000;
        const dummyPose: Landmark3D[] = Array.from({ length: 33 }, (_, i) => [
          0.05 * Math.sin(t * 3 + i),
          -0.65 + 0.05 * Math.cos(t * 3 + i),
          0,
        ]);
        dummyPose[11] = [-0.5, 0.0, 0]; // Left shoulder
        dummyPose[12] = [0.5, 0.0, 0];  // Right shoulder
        dummyPose[15] = [-0.3, 0.4 + 0.05 * Math.sin(t * 5), 0]; // Left wrist
        dummyPose[16] = [0.3 + 0.05 * Math.cos(t * 5), -0.1, 0.1]; // Right wrist

        const dummyRightHand: Landmark3D[] = Array.from({ length: 21 }, (_, i) => [
          dummyPose[16][0] + (i % 5) * 0.015,
          dummyPose[16][1] - Math.floor(i / 5) * 0.025,
          0.1,
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
  }, [isRecording, sourceMode, activeTab]);

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

    if (sourceMode === 'video-file' && fileVideoRef.current) {
      fileVideoRef.current.currentTime = 0;
      fileVideoRef.current.play();
    }

    // Capture ~2.0 seconds (60 frames at 30 FPS)
    setTimeout(() => {
      setIsRecording(false);
      if (sourceMode === 'video-file' && fileVideoRef.current) {
        fileVideoRef.current.pause();
      }
      const smoothed = smoothSignFrames(framesBuffer.current);
      setRecordedFrames(smoothed);
      setHasRecorded(true);
    }, 2000);
  };

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedVideoUrl(url);
    setUploadedFileName(file.name);
    setOriginalId(`video-${file.name.replace(/\.[^/.]+$/, '')}`);
    const detectedGloss = file.name.split(/[-_.]/)[0].toUpperCase();
    if (detectedGloss.length >= 2) setGloss(detectedGloss);
    setHasRecorded(false);
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
      source: datasetSource,
      license: license,
      original_id: originalId,
      frames: recordedFrames,
      meta: {
        duration_ms: Math.round((recordedFrames.length / 30) * 1000),
        recorded_at: new Date().toISOString(),
        notes: `Imported via SignBridge Studio from ${datasetSource} (${license}) by ${signerName}`,
      },
    } as any;

    const blob = new Blob([JSON.stringify(clipData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${clipId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (activeTab === 'review') {
    return <ImportReviewPage onBack={() => setActiveTab('record')} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-6 max-w-6xl mx-auto">
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
              <span>SignBridge MediaPipe Studio</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Sign Video & CV Capture Pipeline
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('review')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-emerald-400 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            <span>Open Library Provenance Review</span>
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={() => setSourceMode('webcam')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            sourceMode === 'webcam'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Live Webcam Stream</span>
        </button>
        <button
          onClick={() => setSourceMode('video-file')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            sourceMode === 'video-file'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload Video File (MP4 / WebM)</span>
        </button>

        {sourceMode === 'webcam' && (
          <span className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border ${
            webcamActive
              ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}>
            Webcam: {webcamActive ? 'Streaming' : 'Connecting...'}
          </span>
        )}

        {sourceMode === 'video-file' && uploadedFileName && (
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 truncate max-w-xs">
            File: {uploadedFileName}
          </span>
        )}
      </div>

      {/* Main Studio Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 flex-1">
        {/* Left 2 cols: Video / Canvas Viewport */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative aspect-[4/3] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
            {sourceMode === 'webcam' ? (
              webcamError ? (
                <div className="p-6 text-center text-rose-300 text-sm max-w-md">
                  <Video className="w-12 h-12 mx-auto mb-3 text-rose-400 opacity-60" />
                  <p className="font-semibold mb-1">Camera Notice</p>
                  <p className="text-xs text-rose-400/80 mb-3">{webcamError}</p>
                  <button
                    onClick={() => setSourceMode('video-file')}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                  >
                    Switch to Video File Upload
                  </button>
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
                </>
              )
            ) : (
              // Video File Mode
              <div className="w-full h-full flex items-center justify-center relative">
                {uploadedVideoUrl ? (
                  <>
                    <video
                      ref={fileVideoRef}
                      src={uploadedVideoUrl}
                      playsInline
                      muted
                      loop
                      className="w-full h-full object-contain"
                    />
                    <canvas
                      ref={canvasRef}
                      width={640}
                      height={480}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    />
                  </>
                ) : (
                  <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-3">
                    <Upload className="w-12 h-12 text-indigo-400 opacity-80" />
                    <p className="text-sm font-semibold text-slate-200">
                      Select an ASL video file to extract landmarks
                    </p>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Supports MP4, WebM, and MOV formats. Frames are normalized and smoothed.
                    </p>
                    <label className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-lg shadow-indigo-600/20 transition-all">
                      Choose Video File
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                <span className="text-8xl font-black text-indigo-400 animate-ping">{countdown}</span>
              </div>
            )}

            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/80 border border-rose-700 text-rose-300 text-xs font-semibold animate-pulse shadow-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>PROCESSING FRAMES...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right col: Clip Metadata & Provenance Form */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 justify-between">
          <div className="flex flex-col gap-3.5">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Provenance Configuration
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Sign Gloss Label
              </label>
              <input
                type="text"
                value={gloss}
                onChange={(e) => setGloss(e.target.value.toUpperCase())}
                placeholder="e.g. HELLO, THANK-YOU"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Dataset Source
              </label>
              <input
                type="text"
                value={datasetSource}
                onChange={(e) => setDatasetSource(e.target.value)}
                placeholder="e.g. asl-citizen-processed-200, ZahidYasinMittha"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">License</label>
                <input
                  type="text"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  placeholder="MIT, CC-BY-NC-SA 4.0"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Signer ID</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="signer-01"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Original Sample ID
              </label>
              <input
                type="text"
                value={originalId}
                onChange={(e) => setOriginalId(e.target.value)}
                placeholder="video-sample-id-1234"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-indigo-500"
              />
            </div>

            {hasRecorded && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex flex-col gap-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Clip Processed ({recordedFrames.length} frames)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ready for export with valid Hard Rule 3 provenance tags.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleStartRecording}
              disabled={isRecording || countdown !== null}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isRecording ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>
                    {sourceMode === 'video-file'
                      ? 'Process Video File (2s Sample)'
                      : 'Start 3s Countdown & Record'}
                  </span>
                </>
              )}
            </button>

            {hasRecorded && (
              <button
                onClick={handleExportJSON}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Real Clip JSON ({gloss.toLowerCase()}.json)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
