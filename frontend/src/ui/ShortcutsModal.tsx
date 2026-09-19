import React, { useEffect, useRef } from 'react';
import { X, Keyboard, Command } from 'lucide-react';

export interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'General' | 'Translation & Speech' | 'Display & Views';
}

const SHORTCUTS: ShortcutItem[] = [
  {
    keys: ['Space'],
    description: 'Toggle Speech Recognition (when outside text input)',
    category: 'Translation & Speech',
  },
  {
    keys: ['Enter'],
    description: 'Send typed text for immediate ASL translation',
    category: 'Translation & Speech',
  },
  {
    keys: ['C'],
    description: 'Clear live captions and reset avatar sign queue',
    category: 'Translation & Speech',
  },
  {
    keys: ['M'],
    description: 'Toggle Avatar Mirror mode (horizontal flip)',
    category: 'Display & Views',
  },
  {
    keys: ['D'],
    description: 'Toggle real-time Debug & Latency Metrics overlay',
    category: 'Display & Views',
  },
  {
    keys: ['1', '2', '3'],
    description: 'Switch views: [1] Main App  [2] CV Studio  [3] Player Studio',
    category: 'Display & Views',
  },
  {
    keys: ['?'],
    description: 'Open this Keyboard Shortcuts cheat sheet',
    category: 'General',
  },
  {
    keys: ['Esc'],
    description: 'Close active modal / overlay',
    category: 'General',
  },
  {
    keys: ['Tab'],
    description: 'Navigate accessible focus elements in logical order',
    category: 'General',
  },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = ['Translation & Speech', 'Display & Views', 'General'] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="shortcuts-modal-title" className="text-lg font-bold text-white tracking-tight">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-slate-400">Full keyboard-only control for accessibility</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of shortcuts by category */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {categories.map((category) => {
            const items = SHORTCUTS.filter((s) => s.category === category);
            return (
              <div key={category} className="space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Command className="w-3.5 h-3.5 text-indigo-400" />
                  {category}
                </div>
                <div className="space-y-1.5">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-800/80 hover:bg-slate-800/70 transition-colors"
                    >
                      <span className="text-xs text-slate-300 font-medium">{item.description}</span>
                      <div className="flex items-center gap-1 shrink-0 ml-3">
                        {item.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="px-2 py-1 text-[11px] font-mono font-bold bg-slate-800 border border-slate-700 text-indigo-300 rounded-lg shadow-sm"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex items-center justify-end bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
