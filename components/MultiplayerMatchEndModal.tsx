/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { RoomState } from '../types';

interface MultiplayerMatchEndModalProps {
  isOpen: boolean;
  room: RoomState | null;
  currentPlayerId: string;
  onRematch: () => void;
  onLeaveRoom: () => void;
}

const MultiplayerMatchEndModal: React.FC<MultiplayerMatchEndModalProps> = ({
  isOpen,
  room,
  currentPlayerId,
  onRematch,
  onLeaveRoom,
}) => {
  if (!isOpen || !room) return null;

  const isHost = room.hostId === currentPlayerId;
  const players = Object.values(room.players).sort((a, b) => {
    // 1st priority: players who survived (did not time out)
    const aTimedOut = a.status === 'timeout';
    const bTimedOut = b.status === 'timeout';
    if (!aTimedOut && bTimedOut) return -1;
    if (aTimedOut && !bTimedOut) return 1;

    // 2nd priority: score
    if (b.score !== a.score) return b.score - a.score;
    // 3rd priority: stage
    if (b.stage !== a.stage) return b.stage - a.stage;
    return b.level - a.level;
  });

  const winner = players[0];
  const isMeWinner = winner?.id === currentPlayerId;
  const endedByText = room.endedBy || 'A player';
  const me = room.players[currentPlayerId];
  const didITimeout = me?.status === 'timeout';

  const gradientBorderStyle = {
    background: 'conic-gradient(from 270deg at 50% 50.12%, #4285F4 142.87deg, #BB55A1 175.78deg, #EA4335 194.23deg, #FBBC04 246.99deg, #B9D84C 268.68deg, #38A852 305.11deg, #38A852 330.36deg, #4285F4 353.77deg)',
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center z-[120] p-4 animate-in fade-in duration-200">
      <div
        className="p-[1.5px] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
        style={gradientBorderStyle}
      >
        <div className="bg-[#121318] text-white rounded-3xl p-6 md:p-7 flex flex-col items-center text-center max-h-[90vh] overflow-y-auto overscroll-contain custom-scrollbar">
          {/* Header Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[12px] font-bold uppercase tracking-wider mb-3">
            <span>👑</span> Final Survivor Match Complete
          </div>

          <h2 className="text-[26px] md:text-[30px] font-black text-white leading-tight">
            Match Ended!
          </h2>

          <p className="text-white/70 text-[14px] mt-1.5">
            {isMeWinner ? (
              <span className="text-emerald-400 font-semibold">
                🎉 Victory! You are the last cat standing!
              </span>
            ) : winner ? (
              <span>
                <strong className="text-white font-bold">{winner.name}</strong> won the battle as the last cat standing!
              </span>
            ) : (
              <span>All players ran out of time! Match completed.</span>
            )}
          </p>

          {/* Winner Spotlight Card */}
          {winner && (
            <div className={`mt-5 mb-4 w-full p-4 rounded-2xl border flex items-center gap-3.5 text-left ${
              isMeWinner
                ? 'bg-amber-500/15 border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'bg-white/5 border-white/10'
            }`}>
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full bg-black/40 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-md">
                  {winner.avatar}
                </div>
                <span className="absolute -top-2 -right-1 text-xl filter drop-shadow">👑</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400 text-[12px] font-extrabold uppercase tracking-wide">
                    {isMeWinner ? '🎉 Victory! You Won!' : 'Match Winner'}
                  </span>
                </div>
                <div className="font-black text-white text-[17px] truncate">
                  {winner.name} {isMeWinner && <span className="text-white/60 text-xs font-normal">(You)</span>}
                </div>
                <div className="text-[12px] text-white/60">
                  Stage {winner.stage} • Level {winner.level}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[20px] font-black text-amber-400 tabular-nums">
                  {winner.score.toLocaleString()}
                </div>
                <div className="text-[10px] text-white/40 uppercase font-semibold">Points</div>
              </div>
            </div>
          )}

          {/* Full Room Standings */}
          <div className="w-full text-left mb-5">
            <h4 className="text-[12px] uppercase font-bold text-white/50 tracking-wider mb-2 px-1">
              Final Standings ({players.length} Players)
            </h4>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {players.map((p, index) => {
                const isCurrent = p.id === currentPlayerId;
                const isTimedOut = p.status === 'timeout' || p.name.toLowerCase() === endedByText.toLowerCase();
                const rankMedal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                      isCurrent
                        ? 'bg-white/10 border-white/20'
                        : 'bg-white/[0.03] border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-extrabold text-[14px] text-white/80 w-6 text-center">
                        {rankMedal}
                      </span>
                      <span className="text-xl shrink-0">{p.avatar}</span>
                      <div className="min-w-0 truncate">
                        <div className="text-[13px] font-bold text-white truncate flex items-center gap-1.5">
                          {p.name}
                          {isCurrent && <span className="text-[10px] text-[#4285F4] bg-[#4285F4]/20 px-1 rounded font-semibold">You</span>}
                          {p.id === room.hostId && <span className="text-[10px] text-amber-400 bg-amber-400/20 px-1 rounded font-semibold">Host</span>}
                        </div>
                        <div className="text-[11px] text-white/50">
                          {isTimedOut ? (
                            <span className="text-red-400 font-medium">Ran out of time</span>
                          ) : (
                            <span>Stage {p.stage} • Level {p.level}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <span className="font-extrabold text-[14px] text-white tabular-nums">
                        {p.score.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-white/40 block">pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="w-full space-y-2.5">
            {isHost ? (
              <button
                onClick={onRematch}
                className="w-full py-3.5 bg-gradient-to-r from-[#4285F4] to-[#BB55A1] hover:opacity-95 text-white font-black text-[16px] rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-xl cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🔄</span> Play Again / Rematch
              </button>
            ) : (
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[12px] text-white/70 flex items-center justify-center gap-2">
                <span className="animate-spin text-sm">⏳</span>
                <span>Waiting for Room Host to start a rematch...</span>
              </div>
            )}

            <button
              onClick={onLeaveRoom}
              className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white font-semibold text-[13px] rounded-full transition-all duration-150 cursor-pointer"
            >
              Leave Room & Play Solo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerMatchEndModal;
