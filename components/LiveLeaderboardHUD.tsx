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
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [isCollapsed, setIsCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Compact Pill on mobile (or collapsed on desktop) that sits above the board without overlaying any puzzle cells
  if (isCollapsed) {
    return (
      <div className="fixed top-11 sm:top-13 md:top-20 right-2 sm:right-3 md:right-6 z-30 select-none animate-in fade-in duration-300">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-[#121316]/95 hover:bg-[#1c1d22] backdrop-blur-md border border-white/20 hover:border-amber-400/50 rounded-full px-2.5 py-1 shadow-2xl flex items-center gap-1.5 cursor-pointer text-white text-[11px] sm:text-[12px] active:scale-95 transition-all"
          title="Tap to view live room standings"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-bold text-amber-300 shrink-0">{getRankBadge(myRank - 1)}</span>
          <span className="font-semibold tabular-nums text-white shrink-0">{myPlayer ? myPlayer.score.toLocaleString() : '0'}</span>
          <span className="text-white/50 text-[10px] shrink-0 font-medium">({players.length}👥)</span>
          <span className="text-white/40 text-[9px] shrink-0">▼</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-11 sm:top-13 md:top-20 right-2 sm:right-3 md:right-6 z-30 select-none animate-in fade-in duration-300">
      <div className="bg-[#121316]/95 backdrop-blur-md border border-white/20 rounded-2xl p-2 sm:p-2.5 shadow-2xl w-[190px] sm:w-[210px] md:w-[240px] text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 sm:pb-2 mb-1.5 sm:mb-2 border-b border-white/10">
          <div 
            onClick={onOpenModal} 
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            title="Click to view full room leaderboard"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] sm:text-[12px] md:text-[13px] font-bold tracking-tight">
              Room {room.id}
            </span>
            <span className="text-[9px] sm:text-[10px] bg-white/10 px-1.5 py-0.2 rounded-full text-white/70">
              {players.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-white/60 hover:text-white text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-0.5"
              title="Minimize Leaderboard"
            >
              ▲ Minimize
            </button>
          </div>
        </div>

        {/* Player List */}
        <div className="space-y-1 sm:space-y-1.5 max-h-[160px] md:max-h-[220px] overflow-y-auto pr-0.5">
          {players.map((p, idx) => {
            const isMe = p.id === currentPlayerId;
            const isTimedOut = p.status === 'timeout';
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between px-1.5 sm:px-2 py-1 rounded-xl text-[11px] sm:text-[12px] transition-colors ${
                  isMe
                    ? 'bg-amber-400/15 border border-amber-400/30 font-semibold'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <span className="text-[11px] sm:text-[12px] w-3.5 text-center shrink-0">
                    {getRankBadge(idx)}
                  </span>
                  <span className="text-[12px] sm:text-[13px] shrink-0">{p.avatar || '🐱'}</span>
                  <span className="truncate max-w-[60px] sm:max-w-[70px] md:max-w-[85px] text-white/90">
                    {p.name} {isMe && '(You)'}
                  </span>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-1">
                  <div className="flex items-center gap-1">
                    <span className="font-bold tabular-nums text-white">
                      {p.score.toLocaleString()}
                    </span>
                    {isTimedOut && (
                      <span className="text-[9px] sm:text-[10px]" title="Out of time">💀</span>
                    )}
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-white/50 font-normal">
                    S{p.stage} • L{p.level}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info / full button */}
        <div className="mt-1.5 sm:mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] sm:text-[11px] text-white/50">
          <button
            onClick={() => {
              onOpenModal();
              if (isMobile) setIsCollapsed(true);
            }}
            className="hover:text-white transition-colors flex items-center gap-1 font-medium"
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
