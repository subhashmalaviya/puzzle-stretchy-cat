/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import { RoomPlayer, RoomState } from '../types';

interface LiveLeaderboardHUDProps {
  room: RoomState | null;
  currentPlayerId: string;
  onOpenModal: () => void;
  onLeaveRoom: () => void;
}

const LiveLeaderboardHUD: React.FC<LiveLeaderboardHUDProps> = ({
  room,
  currentPlayerId,
  onOpenModal,
  onLeaveRoom,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!room) return null;

  const players: RoomPlayer[] = Object.values(room.players).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.stage !== a.stage) return b.stage - a.stage;
    return b.level - a.level;
  });

  const myPlayer = players.find(p => p.id === currentPlayerId);
  const myRankIdx = players.findIndex(p => p.id === currentPlayerId);
  const myRank = myRankIdx !== -1 ? myRankIdx + 1 : 1;

  const getRankBadge = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  // Ultra-compact Pill when collapsed
  if (isCollapsed) {
    return (
      <div className="fixed top-[46px] md:top-20 right-2 sm:right-3 md:right-6 z-20 select-none animate-in fade-in duration-300">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-[#121316]/95 hover:bg-[#1c1d22] backdrop-blur-md border border-white/20 hover:border-amber-400/50 rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 shadow-2xl flex items-center gap-1 sm:gap-1.5 cursor-pointer text-white text-[10px] sm:text-[12px] active:scale-95 transition-all"
          title="Tap to expand live room standings"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-bold text-amber-300 shrink-0">{getRankBadge(myRank - 1)}</span>
          <span className="font-semibold tabular-nums text-white shrink-0">{myPlayer ? myPlayer.score.toLocaleString() : '0'}</span>
          <span className="text-white/50 text-[9px] sm:text-[10px] shrink-0 font-medium">({players.length}👥)</span>
          <span className="text-white/40 text-[8px] sm:text-[9px] shrink-0">▼</span>
        </button>
      </div>
    );
  }

  // Small size leaderboard on mobile, perfectly fitting in the blank space above the grid
  return (
    <div className="fixed top-[46px] md:top-20 right-2 sm:right-3 md:right-6 z-20 select-none animate-in fade-in duration-300">
      <div className="bg-[#121316]/95 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 shadow-2xl w-[160px] sm:w-[190px] md:w-[240px] text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/10">
          <div 
            onClick={onOpenModal} 
            className="flex items-center gap-1 sm:gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            title="Click to view full room leaderboard"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[10px] sm:text-[12px] font-bold tracking-tight">
              Room {room.id}
            </span>
            <span className="text-[8px] sm:text-[9px] bg-white/10 px-1 py-0.2 rounded-full text-white/70">
              {players.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-white/50 hover:text-white text-[9px] sm:text-[10px] px-1 py-0.2 rounded bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-0.5"
              title="Minimize Leaderboard"
            >
              ▲
            </button>
          </div>
        </div>

        {/* Compact Player List (capped so it never expands downward to touch grid tiles) */}
        <div className="space-y-0.5 sm:space-y-1 max-h-[76px] sm:max-h-[140px] md:max-h-[220px] overflow-y-auto pr-0.5">
          {players.map((p, idx) => {
            const isMe = p.id === currentPlayerId;
            const isTimedOut = p.status === 'timeout';
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between px-1 sm:px-1.5 py-0.5 rounded-lg text-[9px] sm:text-[11px] transition-colors ${
                  isMe
                    ? 'bg-amber-400/15 border border-amber-400/30 font-semibold'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[9px] sm:text-[11px] w-3 text-center shrink-0">
                    {getRankBadge(idx)}
                  </span>
                  <span className="text-[10px] sm:text-[12px] shrink-0">{p.avatar || '🐱'}</span>
                  <span className="truncate max-w-[45px] sm:max-w-[70px] md:max-w-[85px] text-white/90">
                    {p.name} {isMe && '(You)'}
                  </span>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-1">
                  <div className="flex items-center gap-0.5">
                    <span className="font-bold tabular-nums text-white text-[9px] sm:text-[11px]">
                      {p.score.toLocaleString()}
                    </span>
                    {isTimedOut && (
                      <span className="text-[8px]" title="Out of time">💀</span>
                    )}
                  </div>
                  <span className="text-[7px] sm:text-[9px] text-white/50 font-normal leading-tight">
                    S{p.stage} • L{p.level}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info / full button */}
        <div className="mt-1 pt-1 border-t border-white/10 flex items-center justify-between text-[8px] sm:text-[10px] text-white/50">
          <button
            onClick={onOpenModal}
            className="hover:text-white transition-colors flex items-center gap-0.5 font-medium"
          >
            🏆 Full Board
          </button>
          <button
            onClick={onLeaveRoom}
            className="hover:text-red-400 transition-colors"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveLeaderboardHUD;
