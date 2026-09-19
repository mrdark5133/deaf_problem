import React, { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';

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
    description: 'Toggle Avatar Mirror mode (horizontal perspective flip)',
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
    description: 'Close active modal / overlay dialog',
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white border border-neutral-300 text-neutral-900 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-neutral-800" />
            <h2 id="shortcuts-modal-title" className="text-sm font-bold tracking-wider text-neutral-900 uppercase">
              KEYBOARD SHORTCUTS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-900 rounded transition-colors cursor-pointer"
            aria-label="Close shortcuts dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of shortcuts by category */}
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar text-xs">
          {categories.map((category) => {
            const items = SHORTCUTS.filter((s) => s.category === category);
            return (
              <div key={category} className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-600">
                  // {category}
                </div>
                <div className="space-y-1.5">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded border border-neutral-200 bg-neutral-50"
                    >
                      <span className="text-neutral-800 font-medium">{item.description}</span>
                      <div className="flex items-center gap-1 shrink-0 ml-3">
                        {item.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="px-2 py-0.5 text-[11px] font-mono font-bold bg-white border border-neutral-300 text-neutral-900 rounded shadow-xs"
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
        <div className="px-5 py-3 border-t border-neutral-200 flex items-center justify-end bg-neutral-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-black hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
