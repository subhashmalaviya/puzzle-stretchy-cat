/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface GameOverProps {
  type: 'win' | 'lose';
  score: number;
  bestScore?: number;
  stage?: number;
  roomRank?: number | null;
  totalRoomPlayers?: number;
  onAction: () => void;
  onOpenHistory?: () => void;
  onOpenLeaderboard?: () => void;
  onWatchAdForExtraTime?: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ 
  type, 
  score, 
  bestScore = 0, 
  stage = 1,
  roomRank,
  totalRoomPlayers = 0,
  onAction,
  onOpenHistory,
  onOpenLeaderboard,
  onWatchAdForExtraTime,
}) => {
  const isWin = type === 'win';
  const isNewBest = score >= bestScore && score > 0;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 backdrop-blur-xl p-6 animate-in fade-in duration-200">
      <div className="bg-black text-white px-7 lg:px-10 py-8 lg:py-10 rounded-3xl text-center w-full rainbow-border animate-rotate-gradient flex flex-col items-center min-w-xs max-w-md shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain custom-scrollbar">
        
        <h2 className="text-white text-[24px] md:text-[30px] font-bold leading-tight tracking-tight px-4">
          {isWin 
            ? "Stage Champion! 🎉" 
            : "Oh no! You ran out of time"}
        </h2>

        {isNewBest ? (
          <div className="mt-3 bg-amber-400/20 border border-amber-400/50 text-amber-300 text-[13px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
            <span>🏆</span> New Personal Best!
          </div>
        ) : (
          <div className="mt-2 text-white/60 text-[13px]">
            Reached Stage {stage} • Best: {bestScore.toLocaleString()} pts
          </div>
        )}

        {/* Room ranking banner if in a multiplayer room */}
        {roomRank && (
          <div className="mt-2 bg-[#4285F4]/20 border border-[#4285F4]/40 text-blue-200 text-[12px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
            <span>👥</span> Room Rank: #{roomRank} of {totalRoomPlayers}
          </div>
        )}

        <div className="mt-[20px] flex flex-col items-center">
          <div className="text-white text-[64px] md:text-[80px] font-extrabold leading-[0.9] tracking-[-3px] tabular-nums">
            {score.toLocaleString()}
          </div>
          <div className="text-white/60 text-[15px] font-medium mt-[8px]">
            Final Points
          </div>
        </div>

        <div className="mt-[25px] flex flex-col gap-2.5 items-center w-full px-4 max-w-[280px]">
          {!isWin && onWatchAdForExtraTime && (
            <button
              onClick={onWatchAdForExtraTime}
              className="flex justify-center items-center py-3.5 w-full cursor-pointer bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 text-black font-extrabold text-[15px] rounded-full transition-all duration-200 hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(251,188,4,0.35)] gap-2"
            >
              <span>▶️</span> Watch Ads for +15s More Time
            </button>
          )}

          <button
            onClick={onAction}
            className="flex justify-center items-center py-3 w-full cursor-pointer bg-white text-black font-bold text-[16px] rounded-full transition-all duration-200 hover:brightness-110 active:scale-95 shadow-lg"
          >
            {isWin ? 'Play Again' : 'Retry from Start'}
          </button>

          {onOpenLeaderboard && (
            <button
              onClick={onOpenLeaderboard}
              className="flex justify-center items-center py-2.5 w-full cursor-pointer bg-[#4285F4] hover:bg-[#3367D6] text-white font-bold text-[14px] rounded-full transition-all duration-200 active:scale-95 shadow-md"
            >
              👥 View Room Leaderboard
            </button>
          )}

          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="flex justify-center items-center py-2 w-full cursor-pointer bg-white/10 hover:bg-white/20 text-white font-medium text-[13px] rounded-full transition-all duration-200 active:scale-95 border border-white/10"
            >
              📜 View Score History
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameOver;
