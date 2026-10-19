/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface TopHeaderProps {
  stage: number;
  stageName: string;
  levelInStage: number;
  totalLevelsInStage: number;
  score: number;
  bestScore: number;
  historyCount: number;
  currentRoomId?: string | null;
  roomPlayerCount?: number;
  onOpenMultiplayer: () => void;
  onOpenHistory: () => void;
  onOpenInfo: () => void;
}

const TopHeader: React.FC<TopHeaderProps> = ({
  stage,
  stageName,
  levelInStage,
  totalLevelsInStage,
  score,
  bestScore,
  historyCount,
  currentRoomId,
  roomPlayerCount = 0,
  onOpenMultiplayer,
  onOpenHistory,
  onOpenInfo,
}) => {
  const gradientBorderStyle = {
    background: 'conic-gradient(from 270deg at 50% 50.12%, #4285F4 142.87deg, #BB55A1 175.78deg, #EA4335 194.23deg, #FBBC04 246.99deg, #B9D84C 268.68deg, #38A852 305.11deg, #38A852 330.36deg, #4285F4 353.77deg)'
  };

  const isNewBest = score > bestScore && bestScore > 0;

  return (
    <header className="fixed top-2 md:top-3.5 left-0 right-0 z-30 flex items-center justify-between px-2.5 md:px-6 pointer-events-none">
      {/* Left: Stage info badge */}
      <div className="pointer-events-auto flex items-center gap-2">
        <div 
          className="p-[1.2px] rounded-full overflow-hidden shadow-lg"
          style={gradientBorderStyle}
        >
          <div className="bg-[#101114]/95 backdrop-blur-md rounded-full px-3 md:px-4 py-1.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-white text-[12px] md:text-[14px] font-semibold whitespace-nowrap">
              Stage {stage} <span className="hidden sm:inline font-normal text-white/70">• {stageName}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Center: Best Score on top */}
      <div className="pointer-events-auto">
        <div 
          className="p-[1.5px] rounded-full overflow-hidden shadow-xl"
          style={gradientBorderStyle}
        >
          <div className="bg-[#000000]/95 backdrop-blur-md rounded-full px-3 md:px-5 py-1.5 flex items-center gap-1.5 md:gap-2.5">
            <span className="text-amber-400 text-[15px] md:text-[18px]">🏆</span>
            <div className="flex items-baseline gap-1 md:gap-1.5">
              <span className="text-white/60 text-[10px] md:text-[12px] uppercase tracking-wider font-semibold">
                Best
              </span>
              <span className="text-white font-extrabold text-[14px] md:text-[18px] tabular-nums tracking-tight">
                {bestScore.toLocaleString()}
              </span>
            </div>
            {isNewBest && (
              <span className="bg-amber-400 text-black text-[9px] md:text-[10px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider animate-bounce">
                New!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Multiplayer, History & Info buttons */}
      <div className="pointer-events-auto flex items-center gap-1.5 md:gap-2">
        {/* Multiplayer Button */}
        <button
          onClick={onOpenMultiplayer}
          className={`flex items-center gap-1.5 rounded-full px-2.5 md:px-3.5 py-1.5 transition-all duration-200 shadow-lg active:scale-95 border ${
            currentRoomId
              ? 'bg-[#4285F4] hover:bg-[#3367D6] text-white border-blue-400 animate-pulse'
              : 'bg-[#18191C]/90 hover:bg-white text-white hover:text-black border-white/20'
          }`}
          title={currentRoomId ? `In Room ${currentRoomId}` : "Multiplayer Battle Room"}
        >
          <span className="text-[13px]">👥</span>
          <span className="text-[12px] md:text-[13px] font-medium hidden sm:inline">
            {currentRoomId ? currentRoomId : 'Multiplayer'}
          </span>
          {currentRoomId && roomPlayerCount > 0 && (
            <span className="bg-white/25 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums">
              {roomPlayerCount}
            </span>
          )}
        </button>

        {/* History Button */}
        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1 bg-[#18191C]/90 hover:bg-white text-white hover:text-black border border-white/20 rounded-full px-2.5 md:px-3.5 py-1.5 transition-all duration-200 shadow-lg active:scale-95 group"
          title="Score History"
        >
          <span className="text-[13px]">📜</span>
          <span className="text-[12px] md:text-[13px] font-medium hidden md:inline">
            History
          </span>
          {historyCount > 0 && (
            <span className="bg-white/20 group-hover:bg-black/20 text-white group-hover:text-black text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums">
              {historyCount}
            </span>
          )}
        </button>

        {/* Info Button */}
        <button
          onClick={onOpenInfo}
          className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#18191C]/90 hover:bg-white text-white hover:text-black border border-white/20 flex items-center justify-center transition-all duration-200 shadow-lg active:scale-95 text-[12px] md:text-[13px] font-bold"
          title="How to play"
        >
          ?
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
