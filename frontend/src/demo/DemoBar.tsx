import React from 'react';
import {
  Square,
  Sparkles,
  Stethoscope,
  GraduationCap,
  HelpCircle,
} from 'lucide-react';
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
  const getIcon = (name: DemoScenario['iconName']) => {
    switch (name) {
      case 'stethoscope':
        return <Stethoscope className="w-3.5 h-3.5 text-blue-400" />;
      case 'graduation-cap':
        return <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />;
      case 'help-circle':
        return <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <section
      aria-label="Demo Mode Scenarios"
      className="bg-slate-900/90 border-b border-indigo-950/80 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner"
    >
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 font-semibold uppercase tracking-wider text-[11px] text-indigo-400 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          Demo Mode
        </span>
        <span className="hidden md:inline text-slate-500">•</span>
        <span className="hidden md:inline text-slate-400 text-[11px]">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {getIcon(scenario.iconName)}
              <span>{scenario.title}</span>
              {isActive && isPlaying && (
                <span className="ml-1 text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">
                  {currentSentenceIdx + 1}/{scenario.sentences.length}
                </span>
              )}
            </button>
          );
        })}

        {activeScenario && (
          <button
            onClick={onStopScenario}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-300 hover:bg-rose-900 text-xs font-medium transition-colors cursor-pointer"
            title="Stop Demo"
            aria-label="Stop active demo scenario"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop</span>
          </button>
        )}
      </div>
    </section>
  );
};
