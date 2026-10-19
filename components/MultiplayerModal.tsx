/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { RoomPlayer, RoomState } from '../types';
import multiplayerService from '../services/multiplayerService';

const AVATARS = ['🐱', '😸', '😻', '😼', '😽', '🦁', '🐯', '🐾', '🐈'];

interface MultiplayerModalProps {
  isOpen: boolean;
  initialTab?: 'create' | 'join';
  onClose: () => void;
  room: RoomState | null;
  onRoomJoined: (room: RoomState) => void;
  onLeaveRoom: () => void;
}

const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  initialTab = 'create',
  onClose,
  room,
  onRoomJoined,
  onLeaveRoom,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>(initialTab);
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setTab(initialTab || 'create');
      setErrorMsg('');
    }
  }, [isOpen, initialTab]);

  const profile = multiplayerService.getProfile();
  const [playerName, setPlayerName] = useState(profile.name);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatar);

  if (!isOpen) return null;

  const gradientBorderStyle = {
    background: 'conic-gradient(from 270deg at 50% 50.12%, #4285F4 142.87deg, #BB55A1 175.78deg, #EA4335 194.23deg, #FBBC04 246.99deg, #B9D84C 268.68deg, #38A852 305.11deg, #38A852 330.36deg, #4285F4 353.77deg)'
  };

  const handleSaveProfile = () => {
    multiplayerService.updateProfile(playerName, selectedAvatar);
  };

  const handleCreateRoom = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    handleSaveProfile();
    try {
      const newRoom = await multiplayerService.createRoom();
      onRoomJoined(newRoom);
    } catch (e: any) {
      setErrorMsg('Failed to create room. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setErrorMsg('Please enter a valid room code.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    handleSaveProfile();
    try {
      const joined = await multiplayerService.joinRoom(code);
      if (joined) {
        onRoomJoined(joined);
      } else {
        setErrorMsg(`Room "${code}" could not be found.`);
      }
    } catch (e: any) {
      setErrorMsg('Failed to join room.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleReady = async () => {
    await multiplayerService.toggleReady();
  };

  const handleStartMatch = async () => {
    setIsSubmitting(true);
    try {
      await multiplayerService.startMatch();
      onClose();
    } catch (e) {
      setErrorMsg('Failed to start match.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = (code: string) => {
    const url = `${window.location.origin}${window.location.pathname}?room=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const players: RoomPlayer[] = room 
    ? Object.values(room.players).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.stage !== a.stage) return b.stage - a.stage;
        return b.level - a.level;
      })
    : [];

  const isHost = room ? room.hostId === profile.id : false;
  const isMeReady = room?.players[profile.id]?.isReady ?? false;
  const allMembersReady = players.length > 0 && players.every(p => p.isReady);
  const isLobbyWaiting = room?.status === 'waiting';

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[110] backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div 
        className="p-[1.5px] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
        style={gradientBorderStyle}
      >
        <div className="bg-[#121316] text-white rounded-3xl p-5 md:p-6 flex flex-col max-h-[88vh]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">👥</span>
              <div>
                <h2 className="text-[20px] md:text-[22px] font-bold text-white leading-tight">
                  Multiplayer Battle Room
                </h2>
                <p className="text-white/60 text-[13px]">
                  {room 
                    ? isLobbyWaiting 
                      ? `Room ${room.id} • Pre-Game Lobby` 
                      : `Room ${room.id} • Live Match Leaderboard`
                    : 'Race your friends in real-time'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Profile Name & Avatar customization */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 my-3">
            <div className="flex items-center justify-between text-[12px] text-white/60 mb-1.5 font-medium">
              <span>Your Cat Identity</span>
              <span className="text-amber-400">Synced to Room</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Avatar Selector */}
              <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-[190px] md:max-w-[220px]">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    onClick={() => {
                      setSelectedAvatar(av);
                      multiplayerService.updateProfile(playerName, av);
                    }}
                    className={`text-xl p-1 rounded-xl transition-all ${
                      selectedAvatar === av
                        ? 'bg-amber-400/30 scale-125 border border-amber-400'
                        : 'opacity-60 hover:opacity-100 hover:scale-110'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>

              {/* Name Input */}
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onBlur={handleSaveProfile}
                maxLength={16}
                placeholder="Your Cat Name"
                className="bg-black/50 border border-white/20 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400 flex-1 min-w-0"
              />
            </div>
          </div>

          {/* Room Screen */}
          {room ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Room Share Card */}
              <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-amber-500/10 border border-white/15 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 mb-3">
                <div className="text-center sm:text-left">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">
                    Room Code
                  </div>
                  <div className="text-[22px] font-extrabold tracking-wider text-white">
                    {room.id}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyCode(room.id)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[12px] font-semibold rounded-xl border border-white/15 transition-all active:scale-95 flex items-center gap-1"
                  >
                    {copiedCode ? '✓ Copied' : '📋 Code'}
                  </button>
                  <button
                    onClick={() => handleCopyLink(room.id)}
                    className="px-3 py-1.5 bg-[#4285F4] hover:bg-[#3367D6] text-white text-[12px] font-semibold rounded-xl transition-all active:scale-95 flex items-center gap-1 shadow-md"
                  >
                    {copiedLink ? '✓ Copied Link' : '🔗 Invite Link'}
                  </button>
                </div>
              </div>

              {/* LOBBY WAITING STATE */}
              {isLobbyWaiting ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-3 mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-amber-300 font-bold text-[13px] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        Room Lobby ({players.length} Players)
                      </div>
                      <p className="text-white/60 text-[11px] mt-0.5">
                        {isHost 
                          ? 'Wait for all friends to ready up, then click Start Battle.' 
                          : 'Click Ready Up! The room creator will start the continuous clock.'}
                      </p>
                    </div>

                    {!isHost && (
                      <button
                        onClick={handleToggleReady}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[12px] transition-all shadow-md active:scale-95 ${
                          isMeReady
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            : 'bg-amber-500 hover:bg-amber-600 text-black'
                        }`}
                      >
                        {isMeReady ? '✓ Ready!' : 'Ready Up'}
                      </button>
                    )}
                  </div>

                  {/* Player readiness list */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[220px]">
                    {players.map((p) => {
                      const isPlayerHost = room.hostId === p.id;
                      const isMe = profile.id === p.id;
                      return (
                        <div
                          key={p.id}
                          className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{p.avatar || '🐱'}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[14px] text-white">
                                  {p.name}
                                </span>
                                {isMe && (
                                  <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                                    You
                                  </span>
                                )}
                                {isPlayerHost && (
                                  <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                    👑 Creator
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-white/50">
                                {isPlayerHost ? 'Room Host' : 'Challenger'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {p.isReady ? (
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Ready
                              </span>
                            ) : (
                              <span className="bg-white/10 text-white/60 text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                Waiting...
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Host Start / Lobby Actions */}
                  <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between gap-3">
                    <button
                      onClick={onLeaveRoom}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-[13px] font-semibold rounded-full transition-all active:scale-95"
                    >
                      Leave
                    </button>

                    {isHost ? (
                      <button
                        onClick={handleStartMatch}
                        disabled={isSubmitting}
                        className={`flex-1 py-3 text-black font-extrabold text-[15px] rounded-full transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 cursor-pointer ${
                          allMembersReady
                            ? 'bg-emerald-400 hover:bg-emerald-300 animate-pulse'
                            : 'bg-white hover:bg-white/90'
                        }`}
                      >
                        {allMembersReady ? 'Start Battle Now! 🚀' : 'Start Battle 🚀'}
                      </button>
                    ) : (
                      <div className="flex-1 text-center text-[12px] text-white/60 font-medium py-2 bg-white/5 rounded-full border border-white/10">
                        Waiting for Creator to click Start...
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* LIVE MATCH LEADERBOARD VIEW */
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Podium View if >= 2 players */}
                  {players.length >= 2 && (
                    <div className="grid grid-cols-3 gap-2 mb-3 px-1">
                      {/* 2nd Place */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex flex-col items-center justify-end h-[95px]">
                        <span className="text-xl">{players[1]?.avatar || '🥈'}</span>
                        <span className="text-[11px] font-bold truncate max-w-[80px] mt-1 text-slate-300">
                          {players[1]?.name}
                        </span>
                        <span className="text-[12px] font-extrabold text-white tabular-nums">
                          {players[1]?.score.toLocaleString()}
                        </span>
                        <span className="text-[9px] bg-slate-400/20 text-slate-300 px-1.5 rounded-full mt-0.5">
                          2nd Place
                        </span>
                      </div>

                      {/* 1st Place */}
                      <div className="bg-amber-400/15 border border-amber-400/40 rounded-2xl p-2.5 flex flex-col items-center justify-end h-[105px] shadow-[0_0_15px_rgba(251,188,4,0.15)]">
                        <span className="text-2xl animate-bounce">{players[0]?.avatar || '👑'}</span>
                        <span className="text-[12px] font-extrabold truncate max-w-[90px] mt-1 text-amber-300">
                          {players[0]?.name}
                        </span>
                        <span className="text-[14px] font-black text-white tabular-nums">
                          {players[0]?.score.toLocaleString()}
                        </span>
                        <span className="text-[9px] bg-amber-400 text-black font-bold px-1.5 rounded-full mt-0.5">
                          🥇 Leader
                        </span>
                      </div>

                      {/* 3rd Place */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex flex-col items-center justify-end h-[95px]">
                        <span className="text-xl">{players[2]?.avatar || '🥉'}</span>
                        <span className="text-[11px] font-bold truncate max-w-[80px] mt-1 text-amber-600">
                          {players[2]?.name || 'Waiting...'}
                        </span>
                        <span className="text-[12px] font-extrabold text-white tabular-nums">
                          {players[2] ? players[2].score.toLocaleString() : '-'}
                        </span>
                        <span className="text-[9px] bg-amber-700/20 text-amber-500 px-1.5 rounded-full mt-0.5">
                          3rd Place
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Leaderboard Player List */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[220px]">
                    {players.map((p, idx) => {
                      const isMe = p.id === profile.id;
                      const isTimedOut = p.status === 'timeout';
                      return (
                        <div
                          key={p.id}
                          className={`p-2.5 rounded-2xl border flex items-center justify-between ${
                            isMe
                              ? 'bg-amber-400/10 border-amber-400/40'
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 text-center font-bold text-[13px] text-white/60">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </span>
                            <span className="text-xl">{p.avatar || '🐱'}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-white font-bold text-[14px]">
                                  {p.name}
                                </span>
                                {isMe && (
                                  <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-medium">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-white/50">
                                Stage {p.stage} • Level {p.level}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="text-white font-extrabold text-[16px] tabular-nums">
                              {p.score.toLocaleString()}
                            </span>
                            <div className="flex items-center gap-1 text-[11px]">
                              {isTimedOut ? (
                                <span className="text-red-400 font-medium">💀 Time Up</span>
                              ) : (
                                <span className="text-emerald-400 font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                  Playing
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Match Footer Actions */}
                  <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between">
                    <button
                      onClick={onLeaveRoom}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-[13px] font-semibold rounded-full transition-all active:scale-95"
                    >
                      Leave Room
                    </button>
                    {isHost && (
                      <button
                        onClick={handleStartMatch}
                        className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold text-[13px] rounded-full transition-all active:scale-95"
                      >
                        🔄 Rematch
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="px-6 py-2 bg-white text-black font-bold text-[14px] rounded-full transition-all hover:bg-white/90 active:scale-95 shadow-md"
                    >
                      Resume Match ➔
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* CREATE OR JOIN TABS */
            <div className="flex-1 flex flex-col">
              <div className="flex bg-white/5 p-1 rounded-2xl mb-4 border border-white/10">
                <button
                  onClick={() => { setTab('create'); setErrorMsg(''); }}
                  className={`flex-1 py-2 text-[14px] font-bold rounded-xl transition-all ${
                    tab === 'create'
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Create Room
                </button>
                <button
                  onClick={() => { setTab('join'); setErrorMsg(''); }}
                  className={`flex-1 py-2 text-[14px] font-bold rounded-xl transition-all ${
                    tab === 'join'
                      ? 'bg-white text-black shadow-md'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Join Room
                </button>
              </div>

              {errorMsg && (
                <div className="mb-3 px-3 py-2 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-[13px] text-center">
                  {errorMsg}
                </div>
              )}

              {tab === 'create' ? (
                <div className="flex flex-col items-center justify-center py-6 text-center flex-1">
                  <span className="text-5xl mb-3">🎮</span>
                  <h3 className="text-white font-bold text-[18px]">
                    Create a Private Battle Room
                  </h3>
                  <p className="text-white/60 text-[13px] mt-1 max-w-[320px]">
                    You become the room creator. When your friends join and ready up, click Start Battle to launch the continuous race!
                  </p>

                  <button
                    disabled={isSubmitting}
                    onClick={handleCreateRoom}
                    className="mt-6 px-8 py-3.5 bg-white text-black hover:bg-white/90 font-bold text-[16px] rounded-full transition-all active:scale-95 shadow-xl flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? 'Creating Room...' : 'Create Room ➔'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 flex-1">
                  <span className="text-4xl mb-2">🔑</span>
                  <h3 className="text-white font-bold text-[17px] mb-1">
                    Enter Friend's Room Code
                  </h3>
                  <p className="text-white/60 text-[12px] mb-4 text-center max-w-[280px]">
                    Enter the room code shared by your friend (e.g. CAT-482).
                  </p>

                  <div className="w-full max-w-[260px]">
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="e.g. CAT-742"
                      className="w-full bg-black/60 border border-white/20 rounded-2xl px-4 py-3 text-center text-[18px] font-extrabold tracking-widest text-white uppercase focus:outline-none focus:border-[#4285F4]"
                      maxLength={10}
                    />

                    <button
                      disabled={isSubmitting}
                      onClick={handleJoinRoom}
                      className="w-full mt-3 py-3 bg-[#4285F4] hover:bg-[#3367D6] text-white font-bold text-[15px] rounded-full transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? 'Joining...' : 'Join Room ➔'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiplayerModal;
