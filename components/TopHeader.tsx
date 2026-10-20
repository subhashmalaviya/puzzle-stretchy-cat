/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import bgmService from '../services/bgmService';

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
  const [isMusicMuted, setIsMusicMuted] = useState(bgmService.isMuted());

  useEffect(() => {
    const unsub = bgmService.subscribe((muted) => {
      setIsMusicMuted(muted);
    });
    return () => unsub();
  }, []);

  const gradientBorderStyle = {
    background: 'conic-gradient(from 270deg at 50% 50.12%, #4285F4 142.87deg, #BB55A1 175.78deg, #EA4335 194.23deg, #FBBC04 246.99deg, #B9D84C 268.68deg, #38A852 305.11deg, #38A852 330.36deg, #4285F4 353.77deg)'
  };

  const isNewBest = score > bestScore && bestScore > 0;

  return (
    <header className="fixed top-2 md:top-3.5 left-0 right-0 z-30 flex items-center justify-between px-2 sm:px-4 md:px-6 pointer-events-none gap-1 sm:gap-2">
      {/* Left: Stage info badge */}
      <div className="flex-1 flex items-center justify-start min-w-0 pointer-events-auto">
        <div 
          className="p-[1.2px] rounded-full overflow-hidden shadow-lg shrink-0"
          style={gradientBorderStyle}
        >
          <div className="bg-[#101114]/95 backdrop-blur-md rounded-full px-2 sm:px-3.5 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="text-white text-[10px] sm:text-[12px] md:text-[13px] font-semibold whitespace-nowrap">
              Stage {stage} <span className="hidden sm:inline font-normal text-white/70">• {stageName}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Center: Best Score on top (in normal flex flow with shrink-0, centered between flex-1 sides) */}
      <div className="shrink-0 flex items-center justify-center pointer-events-auto px-0.5 sm:px-1">
        <div 
          className="p-[1.2px] md:p-[1.5px] rounded-full overflow-hidden shadow-xl"
          style={gradientBorderStyle}
        >
          <div className="bg-[#000000]/95 backdrop-blur-md rounded-full px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 flex items-center gap-1 md:gap-1.5">
            <span className="text-amber-400 text-[11px] sm:text-[13px] md:text-[16px]">🏆</span>
            <div className="flex items-baseline gap-0.5 sm:gap-1">
              <span className="text-white/60 text-[8px] sm:text-[9px] md:text-[11px] uppercase tracking-wider font-semibold">
                Best
              </span>
              <span className="text-white font-extrabold text-[11px] sm:text-[13px] md:text-[16px] tabular-nums tracking-tight">
                {bestScore.toLocaleString()}
              </span>
            </div>
            {isNewBest && (
              <span className="bg-amber-400 text-black text-[7px] sm:text-[8px] md:text-[9px] font-extrabold px-1 py-0.2 rounded-full uppercase tracking-wider animate-bounce ml-0.5">
                New!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Multiplayer, History & Info buttons */}
      <div className="flex-1 flex items-center justify-end gap-1 sm:gap-1.5 md:gap-2 pointer-events-auto min-w-0">
        {/* Multiplayer Button */}
        <button
          onClick={onOpenMultiplayer}
          className={`flex items-center gap-1 rounded-full px-1.5 sm:px-2.5 md:px-3 py-1 sm:py-1.5 transition-all duration-200 shadow-lg active:scale-95 border shrink-0 ${
            currentRoomId
              ? 'bg-[#4285F4] hover:bg-[#3367D6] text-white border-blue-400'
              : 'bg-[#18191C]/90 hover:bg-white text-white hover:text-black border-white/20'
          }`}
          title={currentRoomId ? `In Room ${currentRoomId}` : "Multiplayer Battle Room"}
        >
          <span className="text-[11px] sm:text-[13px]">👥</span>
          <span className="text-[11px] sm:text-[12px] font-medium hidden md:inline">
            {currentRoomId ? currentRoomId : 'Multiplayer'}
          </span>
          {currentRoomId && roomPlayerCount > 0 && (
            <span className="bg-white/25 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums">
              {roomPlayerCount}
            </span>
          )}
        </button>

        {/* History Button */}
        <button
          onClick={onOpenHistory}
          className="flex items-center gap-1 bg-[#18191C]/90 hover:bg-white text-white hover:text-black border border-white/20 rounded-full px-1.5 sm:px-2.5 md:px-3 py-1 sm:py-1.5 transition-all duration-200 shadow-lg active:scale-95 shrink-0 group"
          title="Score History"
        >
          <span className="text-[11px] sm:text-[13px]">📜</span>
          <span className="text-[11px] sm:text-[12px] font-medium hidden lg:inline">
            History
          </span>
          {historyCount > 0 && (
            <span className="bg-white/20 group-hover:bg-black/20 text-white group-hover:text-black text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums">
              {historyCount}
            </span>
          )}
        </button>

        {/* Background Music Toggle Button */}
        <button
          onClick={() => bgmService.toggleMute()}
          className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full border flex items-center justify-center transition-all duration-200 shadow-lg active:scale-95 text-[10px] sm:text-[12px] md:text-[14px] shrink-0 ${
            !isMusicMuted
              ? 'bg-[#4285F4]/30 border-[#4285F4] text-white animate-pulse'
              : 'bg-[#18191C]/90 hover:bg-white text-white hover:text-black border-white/20'
          }`}
          title={isMusicMuted ? "Unmute Background Music" : "Mute Background Music"}
          aria-label="Toggle Background Music"
        >
          {isMusicMuted ? '🔇' : '🎵'}
        </button>

        {/* Info Button */}
        <button
          onClick={onOpenInfo}
          className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-[#18191C]/90 hover:bg-white text-white hover:text-black border border-white/20 flex items-center justify-center transition-all duration-200 shadow-lg active:scale-95 text-[10px] sm:text-[12px] md:text-[13px] font-bold shrink-0"
          title="How to play"
        >
          ?
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
