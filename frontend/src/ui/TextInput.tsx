import React, { useState } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';
import { globalTextSource, TextSource } from '../speech/TextSource';

export interface TextInputProps {
  textSource?: TextSource;
  onSubmit?: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const TextInput: React.FC<TextInputProps> = ({
  textSource = globalTextSource,
  onSubmit,
  disabled = false,
  placeholder = 'Type English sentence here (e.g. "Where is the doctor?")...',
  className = '',
}) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    textSource.emitTyped(trimmed);
    onSubmit?.(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`relative flex items-center gap-2 w-full ${className}`}
      aria-label="Typed translation input"
    >
      <div className="relative flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Input text to translate into ASL"
          className="w-full bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-100 placeholder:text-slate-500 text-sm rounded-xl py-3.5 pl-4 pr-16 shadow-inner transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] text-slate-500 font-mono pointer-events-none">
          <CornerDownLeft className="w-3 h-3" />
          <span>Enter</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={!value.trim() || disabled}
        aria-label="Send sentence"
        className="px-5 py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
      >
        <Send className="w-4 h-4" />
        <span className="hidden sm:inline">Send</span>
      </button>
    </form>
  );
};
