import React from 'react';
import { Mic, AlertCircle, ShieldAlert } from 'lucide-react';
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
  const getButtonState = () => {
    switch (status) {
      case 'listening':
        return {
          icon: <Mic className="w-5 h-5 text-white animate-pulse" />,
          label: 'Stop Listening',
          btnClass: 'bg-red-600 hover:bg-red-700 text-white border-red-700',
          statusText: 'Listening...',
          statusClass: 'text-red-600 font-bold',
        };
      case 'denied':
        return {
          icon: <ShieldAlert className="w-5 h-5 text-neutral-800" />,
          label: 'Microphone Permission Denied',
          btnClass: 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800 border-neutral-300',
          statusText: 'Mic permission denied',
          statusClass: 'text-amber-700',
        };
      case 'unsupported':
        return {
          icon: <AlertCircle className="w-5 h-5 text-neutral-400" />,
          label: 'Browser Unsupported',
          btnClass: 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed',
          statusText: 'Chrome/Edge required for mic',
          statusClass: 'text-neutral-500',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-white" />,
          label: 'Microphone Error',
          btnClass: 'bg-neutral-800 hover:bg-neutral-900 text-white border-neutral-900',
          statusText: 'Mic error',
          statusClass: 'text-red-600',
        };
      case 'idle':
      default:
        return {
          icon: <Mic className="w-5 h-5 text-white" />,
          label: 'Start Listening',
          btnClass: 'bg-neutral-900 hover:bg-black text-white border-neutral-900',
          statusText: 'Press to speak',
          statusClass: 'text-neutral-600',
        };
    }
  };

  const { icon, label, btnClass, statusText, statusClass } = getButtonState();

  return (
    <div className={`flex flex-col items-center gap-1.5 font-mono ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || status === 'unsupported'}
        aria-label={label}
        title={label}
        data-testid="mic-button"
        data-status={status}
        className={`w-14 h-14 rounded-lg border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${btnClass}`}
      >
        {icon}
      </button>

      <span className={`text-[11px] tracking-tight font-medium ${statusClass}`}>
        {statusText}
      </span>
    </div>
  );
};
