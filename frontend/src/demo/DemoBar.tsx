import React from 'react';
import { Square, Play } from 'lucide-react';
import { DEMO_SCENARIOS, type DemoScenario } from './demoScenarios';

export interface DemoBarProps {
  activeScenario: DemoScenario | null;
  currentSentenceIdx: number;
  isPlaying: boolean;
  onStartScenario: (scenario: DemoScenario) => void;
  onStopScenario: () => void;
}

export const DemoBar: React.FC<DemoBarProps> = ({
  activeScenario,
  currentSentenceIdx,
  isPlaying,
  onStartScenario,
  onStopScenario,
}) => {
  return (
    <section
      aria-label="Demo Mode Scenarios"
      className="bg-neutral-50 border-b border-neutral-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
    >
      <div className="flex items-center gap-2">
        <span className="font-bold uppercase tracking-wider text-[11px] text-neutral-900">
          [DEMO PRESETS]
        </span>
        <span className="hidden md:inline text-neutral-300">•</span>
        <span className="hidden md:inline text-neutral-500 text-[11px]">
          Scripted offline scenarios for live judging
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        {DEMO_SCENARIOS.map((scenario) => {
          const isActive = activeScenario?.id === scenario.id;
          return (
            <button
              key={scenario.id}
              onClick={() => onStartScenario(scenario)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                isActive
                  ? 'bg-black border-black text-white'
                  : 'bg-white border-neutral-300 text-neutral-800 hover:border-black hover:bg-neutral-100'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{scenario.title}</span>
              {isActive && isPlaying && (
                <span className="ml-1 text-[10px] bg-neutral-800 text-white px-1.5 py-0.2 rounded font-mono">
                  {currentSentenceIdx + 1}/{scenario.sentences.length}
                </span>
              )}
            </button>
          );
        })}

        {activeScenario && (
          <button
            onClick={onStopScenario}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-red-600 hover:bg-red-700 border border-red-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            title="Stop Demo"
            aria-label="Stop active demo scenario"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>STOP</span>
          </button>
        )}
      </div>
    </section>
  );
};
