/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect } from 'react';

interface SoloStartOverlayProps {
  stage: number;
  stageName: string;
  initialTime: number;
  totalLevels: number;
  bestScore: number;
  onStart: () => void;
  onOpenMultiplayer: () => void;
}

const SoloStartOverlay: React.FC<SoloStartOverlayProps> = ({
  stage,
  stageName,
  initialTime,
  totalLevels,
  bestScore,
  onStart,
  onOpenMultiplayer,
}) => {
  const gradientBorderStyle = {
    background: 'conic-gradient(from 270deg at 50% 50.12%, #4285F4 142.87deg, #BB55A1 175.78deg, #EA4335 194.23deg, #FBBC04 246.99deg, #B9D84C 268.68deg, #38A852 305.11deg, #38A852 330.36deg, #4285F4 353.77deg)'
  };

  // Keyboard shortcut: Space or Enter to start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div 
        className="p-[1.5px] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
        style={gradientBorderStyle}
      >
        <div className="bg-[#101114] text-white rounded-3xl p-6 md:p-7 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl mb-3 shadow-inner">
            🐱
          </div>

          <h2 className="text-[24px] md:text-[28px] font-extrabold text-white leading-tight">
            Ready to Stretch?
          </h2>
          <p className="text-white/60 text-[13px] mt-1">
            Stage {stage}: {stageName} ({totalLevels} Levels)
          </p>

          <div className="my-5 w-full bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5 text-[13px] text-left">
            <div className="flex items-start gap-2.5">
              <span className="text-lg leading-none shrink-0">⏱️</span>
              <div>
                <span className="font-bold text-white">Continuous Clock: </span>
                <span className="text-white/70">Timer starts when you hit Start and keeps running between rooms!</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="text-lg leading-none shrink-0">🐟</span>
              <div>
                <span className="font-bold text-white">Fish Treats: </span>
                <span className="text-white/70">Collect fish for precious bonus seconds.</span>
              </div>
            </div>

            {bestScore > 0 && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[12px]">
                <span className="text-white/50">High Score</span>
                <span className="font-bold text-amber-400 tabular-nums">🏆 {bestScore.toLocaleString()} pts</span>
              </div>
            )}
          </div>

          <button
            onClick={onStart}
            className="w-full py-4 bg-white text-black hover:bg-white/90 font-black text-[17px] rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl cursor-pointer flex items-center justify-center gap-2"
          >
            Start Game 🚀
          </button>
          <span className="text-[11px] text-white/40 mt-1.5 font-medium">Press Space or Enter to start</span>

          <button
            onClick={onOpenMultiplayer}
            className="mt-4 text-[12px] text-white/60 hover:text-[#4285F4] transition-colors flex items-center gap-1.5"
          >
            <span>👥</span> Race with friends? Open Multiplayer Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default SoloStartOverlay;
