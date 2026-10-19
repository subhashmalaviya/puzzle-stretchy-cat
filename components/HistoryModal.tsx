/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { ScoreHistoryEntry } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ScoreHistoryEntry[];
  bestScore: number;
  onClearHistory: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  bestScore,
  onClearHistory,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const gradientBorderStyle = {
    background: 'conic-gradient(from 270deg at 50% 50.12%, #4285F4 142.87deg, #BB55A1 175.78deg, #EA4335 194.23deg, #FBBC04 246.99deg, #B9D84C 268.68deg, #38A852 305.11deg, #38A852 330.36deg, #4285F4 353.77deg)'
  };

  const totalGames = history.length;
  const highestStage = history.reduce((max, item) => Math.max(max, item.stage), 1);
  const avgScore = totalGames > 0 ? Math.round(history.reduce((sum, item) => sum + item.score, 0) / totalGames) : 0;

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReasonBadge = (reason: ScoreHistoryEntry['reason']) => {
    switch (reason) {
      case 'timeout':
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
            Time Up
          </span>
        );
      case 'reset':
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Reset
          </span>
        );
      case 'stage_cleared':
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Stage Cleared
          </span>
        );
      case 'victory':
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Victory!
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="p-[1.5px] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
        style={gradientBorderStyle}
      >
        <div className="bg-[#121316] text-white rounded-3xl p-5 md:p-6 flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">📜</span>
              <div>
                <h2 className="text-[20px] md:text-[22px] font-bold text-white leading-tight">
                  Score History
                </h2>
                <p className="text-white/60 text-[13px]">
                  Track your previous runs and best records
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-2 my-4">
            <div className="bg-white/5 rounded-2xl p-2.5 flex flex-col items-center justify-center border border-white/5">
              <span className="text-amber-400 text-lg">🏆</span>
              <span className="text-white font-bold text-[15px] tabular-nums mt-0.5">
                {bestScore.toLocaleString()}
              </span>
              <span className="text-white/50 text-[10px] uppercase font-medium tracking-wider">
                Best
              </span>
            </div>

            <div className="bg-white/5 rounded-2xl p-2.5 flex flex-col items-center justify-center border border-white/5">
              <span className="text-sky-400 text-lg">🎮</span>
              <span className="text-white font-bold text-[15px] tabular-nums mt-0.5">
                {totalGames}
              </span>
              <span className="text-white/50 text-[10px] uppercase font-medium tracking-wider">
                Games
              </span>
            </div>

            <div className="bg-white/5 rounded-2xl p-2.5 flex flex-col items-center justify-center border border-white/5">
              <span className="text-purple-400 text-lg">🚩</span>
              <span className="text-white font-bold text-[15px] tabular-nums mt-0.5">
                Stage {highestStage}
              </span>
              <span className="text-white/50 text-[10px] uppercase font-medium tracking-wider">
                Highest
              </span>
            </div>

            <div className="bg-white/5 rounded-2xl p-2.5 flex flex-col items-center justify-center border border-white/5">
              <span className="text-emerald-400 text-lg">📊</span>
              <span className="text-white font-bold text-[15px] tabular-nums mt-0.5">
                {avgScore.toLocaleString()}
              </span>
              <span className="text-white/50 text-[10px] uppercase font-medium tracking-wider">
                Avg
              </span>
            </div>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[160px] max-h-[360px]">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-10 text-center text-white/50">
                <span className="text-4xl mb-2 opacity-60">🐱</span>
                <p className="text-[15px] font-medium text-white/70">No games recorded yet</p>
                <p className="text-[12px] mt-1 max-w-[260px]">
                  Play and stretch your cat! When time completes or you click reset, your scores will appear here.
                </p>
              </div>
            ) : (
              history.map((entry, index) => {
                const isBest = entry.score === bestScore && bestScore > 0;
                return (
                  <div
                    key={entry.id || index}
                    className={`p-3 rounded-2xl border transition-colors flex items-center justify-between ${
                      isBest 
                        ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(251,188,4,0.15)]' 
                        : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[12px] font-bold text-white/80 tabular-nums">
                        #{history.length - index}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-[17px] tabular-nums">
                            {entry.score.toLocaleString()}
                          </span>
                          <span className="text-white/50 text-[12px]">pts</span>
                          {isBest && (
                            <span className="bg-amber-400 text-black text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                              ★ Best
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-white/60 flex items-center gap-2 mt-0.5">
                          <span>Stage {entry.stage} • Level {entry.level}</span>
                          <span>•</span>
                          <span>{formatDate(entry.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {getReasonBadge(entry.reason)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 mt-2 border-t border-white/10 flex items-center justify-between">
            {history.length > 0 ? (
              confirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-red-400">Clear all history?</span>
                  <button
                    onClick={() => {
                      onClearHistory();
                      setConfirmClear(false);
                    }}
                    className="px-2.5 py-1 text-[12px] bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Yes, clear
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2.5 py-1 text-[12px] bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-[12px] text-white/40 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Clear History
                </button>
              )
            ) : <div />}

            <button
              onClick={onClose}
              className="px-5 py-2 bg-white text-black hover:bg-white/90 font-medium text-[14px] rounded-full transition-all active:scale-95 ml-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
