/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
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

  const getRankBadge = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <div className="fixed top-16 md:top-20 right-3 md:right-6 z-30 select-none animate-in fade-in duration-300">
      <div className="bg-[#121316]/95 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 shadow-2xl w-[210px] md:w-[240px] text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
          <div 
            onClick={onOpenModal} 
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            title="Click to view full room leaderboard"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[12px] md:text-[13px] font-bold tracking-tight">
              Room {room.id}
            </span>
            <span className="text-[10px] bg-white/10 px-1.5 py-0.2 rounded-full text-white/70">
              {players.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-white/50 hover:text-white text-[12px] px-1 py-0.5 rounded transition-colors"
              title={isCollapsed ? "Expand Leaderboard" : "Collapse Leaderboard"}
            >
              {isCollapsed ? '▼' : '▲'}
            </button>
          </div>
        </div>

        {/* Player List */}
        {!isCollapsed && (
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
            {players.map((p, idx) => {
              const isMe = p.id === currentPlayerId;
              const isTimedOut = p.status === 'timeout';
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-2 py-1 rounded-xl text-[12px] transition-colors ${
                    isMe
                      ? 'bg-amber-400/15 border border-amber-400/30 font-semibold'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[12px] w-4 text-center shrink-0">
                      {getRankBadge(idx)}
                    </span>
                    <span className="text-[13px] shrink-0">{p.avatar || '🐱'}</span>
                    <span className="truncate max-w-[70px] md:max-w-[85px] text-white/90">
                      {p.name} {isMe && '(You)'}
                    </span>
                  </div>

                  <div className="flex flex-col items-end shrink-0 pl-1">
                    <div className="flex items-center gap-1">
                      <span className="font-bold tabular-nums text-white">
                        {p.score.toLocaleString()}
                      </span>
                      {isTimedOut && (
                        <span className="text-[10px]" title="Out of time">💀</span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/50 font-normal">
                      S{p.stage} • L{p.level}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info / full button */}
        {!isCollapsed && (
          <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
            <button
              onClick={onOpenModal}
              className="hover:text-white transition-colors flex items-center gap-1"
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
        )}
      </div>
    </div>
  );
};

export default LiveLeaderboardHUD;
