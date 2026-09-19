import React from 'react';
import { Mic, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import type { SpeechStatus } from '../speech/types';

export interface MicButtonProps {
  status: SpeechStatus;
  isListening: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

export const MicButton: React.FC<MicButtonProps> = ({
  status,
  isListening,
  onToggle,
  disabled = false,
  className = '',
}) => {
  const getButtonContent = () => {
    switch (status) {
      case 'listening':
        return {
          icon: <Mic className="w-6 h-6 text-rose-300 animate-pulse" />,
          label: 'Listening (Click to Stop)',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          btnBg: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30',
        };
      case 'denied':
        return {
          icon: <ShieldAlert className="w-6 h-6 text-amber-300" />,
          label: 'Microphone Blocked',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          btnBg: 'bg-amber-700 hover:bg-amber-600 shadow-amber-700/30',
        };
      case 'unsupported':
        return {
          icon: <AlertCircle className="w-6 h-6 text-slate-400" />,
          label: 'Browser Unsupported',
          badgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
          btnBg: 'bg-slate-800 hover:bg-slate-700 shadow-none',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-6 h-6 text-rose-300" />,
          label: 'Microphone Error',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          btnBg: 'bg-rose-700 hover:bg-rose-600 shadow-rose-700/30',
        };
      case 'idle':
      default:
        return {
          icon: <Mic className="w-6 h-6 text-white" />,
          label: 'Start Listening',
          badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          btnBg: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30',
        };
    }
  };

  const { icon, label, btnBg } = getButtonContent();

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Pulsing visual rings during active listening */}
        {isListening && (
          <>
            <span className="absolute -inset-2 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
            <span className="absolute -inset-4 rounded-full bg-rose-500/10 animate-pulse pointer-events-none" />
          </>
        )}

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled || status === 'unsupported'}
          aria-label={label}
          title={label}
          data-testid="mic-button"
          data-status={status}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${btnBg}`}
        >
          {icon}
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        {isListening ? (
          <span className="flex items-center gap-1 text-rose-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            Listening...
          </span>
        ) : status === 'denied' ? (
          <span className="text-amber-400">Mic permission denied</span>
        ) : status === 'unsupported' ? (
          <span className="text-slate-500">Chrome/Edge required for mic</span>
        ) : (
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-400" />
            Press to speak
          </span>
        )}
      </div>
    </div>
  );
};
