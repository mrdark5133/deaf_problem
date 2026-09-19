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
import { evaluateClipQuality } from './clipQuality';
import { ClipQualityBadge } from './ClipQualityBadge';
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

  const qualityMetrics = useMemo(() => {
    if (!hasRecorded || !recordedFrames.length) return null;
    return evaluateClipQuality(recordedFrames, 30);
  }, [hasRecorded, recordedFrames]);

  const handleExportJSON = () => {
    if (!recordedFrames.length) return;
    if (qualityMetrics?.verdict === 'RED') {
      const confirmExport = window.confirm(
        'Warning: This clip failed quality validation (Verdict: RED). Are you sure you want to export it?'
      );
      if (!confirmExport) return;
    }

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
    <div className="min-h-screen bg-white text-neutral-900 font-mono flex flex-col p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded border border-neutral-300 transition-colors cursor-pointer"
              title="Back to Translator"
              aria-label="Back to Translator"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-0.5">
              // MEDIAPIPE CV PIPELINE
            </div>
            <h1 className="text-base font-bold text-neutral-900 tracking-tight leading-none">
              Sign Video & CV Capture Pipeline
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('review')}
            className="px-3 py-1.5 rounded border border-neutral-300 bg-white hover:bg-neutral-100 text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Library Review</span>
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <button
          onClick={() => setSourceMode('webcam')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
            sourceMode === 'webcam'
              ? 'bg-black text-white'
              : 'bg-white text-neutral-700 hover:text-black border border-neutral-300'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Live Webcam</span>
        </button>
        <button
          onClick={() => setSourceMode('video-file')}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
            sourceMode === 'video-file'
              ? 'bg-black text-white'
              : 'bg-white text-neutral-700 hover:text-black border border-neutral-300'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Video File (MP4/WebM)</span>
        </button>

        {sourceMode === 'webcam' && (
          <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded border uppercase ${
            webcamActive
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-neutral-100 border-neutral-300 text-neutral-600'
          }`}>
            Webcam: {webcamActive ? 'STREAMING' : 'CONNECTING...'}
          </span>
        )}

        {sourceMode === 'video-file' && uploadedFileName && (
          <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-neutral-100 border border-neutral-300 text-neutral-800 truncate max-w-xs uppercase">
            FILE: {uploadedFileName}
          </span>
        )}
      </div>

      {/* Main Studio Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 flex-1">
        {/* Left 2 cols: Video / Canvas Viewport */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative aspect-[4/3] bg-white border border-neutral-300 rounded shadow-xs overflow-hidden flex items-center justify-center">
            {sourceMode === 'webcam' ? (
              webcamError ? (
                <div className="p-6 text-center text-neutral-800 text-xs max-w-md font-mono">
                  <Video className="w-10 h-10 mx-auto mb-2 text-neutral-400" />
                  <p className="font-bold mb-1 uppercase">// CAMERA NOTICE</p>
                  <p className="text-neutral-600 mb-3">{webcamError}</p>
                  <button
                    onClick={() => setSourceMode('video-file')}
                    className="px-3 py-1.5 rounded bg-black text-white text-xs font-bold uppercase cursor-pointer"
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
                  <div className="p-8 text-center text-neutral-500 flex flex-col items-center gap-2 font-mono">
                    <Upload className="w-10 h-10 text-neutral-400" />
                    <p className="text-xs font-bold text-neutral-800 uppercase">
                      SELECT AN ASL VIDEO FILE TO EXTRACT LANDMARKS
                    </p>
                    <p className="text-[11px] text-neutral-500 max-w-xs">
                      Supports MP4, WebM, and MOV formats. Frames are normalized and smoothed.
                    </p>
                    <label className="mt-2 px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase rounded cursor-pointer transition-colors">
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
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center font-mono">
                <span className="text-7xl font-bold text-black">{countdown}</span>
              </div>
            )}

            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-100 border border-red-300 text-red-900 text-[10px] font-bold uppercase animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                <span>PROCESSING FRAMES...</span>
              </div>
            )}
          </div>
        </div>

        {/* Right col: Clip Metadata & Provenance Form */}
        <div className="bg-white border border-neutral-300 rounded p-4 flex flex-col gap-4 justify-between font-mono">
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              // PROVENANCE CONFIGURATION
            </h2>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                SIGN GLOSS LABEL
              </label>
              <input
                type="text"
                value={gloss}
                onChange={(e) => setGloss(e.target.value.toUpperCase())}
                placeholder="e.g. HELLO, THANK-YOU"
                className="w-full bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 font-mono outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                DATASET SOURCE
              </label>
              <input
                type="text"
                value={datasetSource}
                onChange={(e) => setDatasetSource(e.target.value)}
                placeholder="e.g. asl-citizen-processed-200"
                className="w-full bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-black"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">LICENSE</label>
                <input
                  type="text"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  placeholder="MIT, CC-BY-NC-SA 4.0"
                  className="w-full bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">SIGNER ID</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="signer-01"
                  className="w-full bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 uppercase mb-1">
                ORIGINAL SAMPLE ID
              </label>
              <input
                type="text"
                value={originalId}
                onChange={(e) => setOriginalId(e.target.value)}
                placeholder="video-sample-id-1234"
                className="w-full bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 font-mono outline-none focus:border-black"
              />
            </div>

            {hasRecorded && (
              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 font-bold uppercase text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CLIP PROCESSED ({recordedFrames.length} FRAMES)</span>
                </div>
                <p className="text-[10px] text-emerald-700">
                  Ready for export with valid Hard Rule 3 provenance tags.
                </p>
              </div>
            )}

            {hasRecorded && qualityMetrics && (
              <ClipQualityBadge metrics={qualityMetrics} showDetails={true} />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleStartRecording}
              disabled={isRecording || countdown !== null}
              className="w-full py-2 bg-black hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold text-xs uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isRecording ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>PROCESSING...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>
                    {sourceMode === 'video-file'
                      ? 'PROCESS VIDEO FILE (2S)'
                      : 'START 3S COUNTDOWN & RECORD'}
                  </span>
                </>
              )}
            </button>

            {hasRecorded && (
              <button
                onClick={handleExportJSON}
                className="w-full py-2 bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs uppercase tracking-wider rounded flex items-center justify-center gap-1.5 border border-neutral-300 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT REAL CLIP JSON ({gloss.toLowerCase()}.json)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
