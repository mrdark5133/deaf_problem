import React, { useState } from 'react';
import { CornerDownLeft, ArrowUpRight } from 'lucide-react';
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
  placeholder = 'Type English sentence (e.g. "Where is the doctor?")...',
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
      className={`relative flex items-center gap-2 w-full font-mono ${className}`}
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
          className="w-full bg-white border border-neutral-300 focus:border-black text-neutral-900 placeholder:text-neutral-400 text-xs rounded-md py-3 pl-3.5 pr-16 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-neutral-400 font-mono pointer-events-none">
          <CornerDownLeft className="w-3 h-3" />
          <span>ENTER</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={!value.trim() || disabled}
        aria-label="Send sentence"
        className="px-4 py-3 bg-neutral-900 hover:bg-black active:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
      >
        <span>TRANSLATE</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </form>
  );
};
