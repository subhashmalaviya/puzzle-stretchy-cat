/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import bgmService from '../services/bgmService';

interface SoloStartOverlayProps {
  stage: number;
  stageName: string;
  initialTime: number;
  totalLevels: number;
  bestScore: number;
  historyCount?: number;
  onStart: () => void;
  onOpenMultiplayer: () => void;
  onOpenHistory: () => void;
  onOpenInfo?: () => void;
}

const SoloStartOverlay: React.FC<SoloStartOverlayProps> = ({
  stage,
  stageName,
  initialTime,
  totalLevels,
  bestScore,
  historyCount = 0,
  onStart,
  onOpenMultiplayer,
  onOpenHistory,
  onOpenInfo,
}) => {
  // Background Music state
  const [isMusicMuted, setIsMusicMuted] = useState(bgmService.isMuted());

  useEffect(() => {
    const unsub = bgmService.subscribe((muted) => {
      setIsMusicMuted(muted);
    });
    return () => unsub();
  }, []);

  const handleToggleMusic = (e: React.MouseEvent) => {
    e.stopPropagation();
    bgmService.toggleMute();
  };

  const handleStartWithMusic = () => {
    // Unmute & start BGM on start
    bgmService.unmute();
    bgmService.play();
    onStart();
  };

  // Keyboard shortcut: Space or Enter to start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleStartWithMusic();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  const gradientBorderStyle = {
    background: 'conic-gradient(from 270deg at 50% 50.12%, #4285F4 142.87deg, #BB55A1 175.78deg, #EA4335 194.23deg, #FBBC04 246.99deg, #B9D84C 268.68deg, #38A852 305.11deg, #38A852 330.36deg, #4285F4 353.77deg)'
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[100] p-3 sm:p-4 overflow-y-auto overscroll-contain">
      {/* 3D Background Floating Elements for Atmospheric Depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[10%] left-[8%] w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-400/20 backdrop-blur-md animate-float-3d" style={{ transform: 'rotate(15deg)' }} />
        <div className="absolute bottom-[14%] right-[10%] w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-400/20 backdrop-blur-md animate-float-3d" style={{ animationDelay: '1.2s', transform: 'rotate(-20deg)' }} />
        <div className="absolute top-[20%] right-[15%] text-2xl opacity-40 animate-pulse-glow">🐟</div>
        <div className="absolute bottom-[22%] left-[12%] text-2xl opacity-40 animate-pulse-glow" style={{ animationDelay: '1.8s' }}>🧶</div>
        <div className="absolute top-[45%] left-[5%] text-xl opacity-30 animate-star-twinkle">✨</div>
        <div className="absolute top-[60%] right-[8%] text-xl opacity-30 animate-star-twinkle" style={{ animationDelay: '1s' }}>⭐</div>
      </div>

      {/* Card Wrapper without hover tilt */}
      <div 
        className="relative my-auto w-full max-w-sm p-[1.5px] rounded-3xl overflow-hidden shadow-2xl"
        style={gradientBorderStyle}
      >
        {/* Card Body with Mobile Scroll Container */}
        <div className="bg-[#101115] text-white rounded-3xl p-5 sm:p-6 md:p-7 flex flex-col items-center text-center max-h-[92vh] overflow-y-auto overscroll-contain custom-scrollbar relative z-20">
          
          {/* Top Bar: Stage Tag + Help Button + BGM Toggle */}
          <div className="w-full flex items-center justify-between mb-2 gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-white/80 border border-white/10 shrink-0">
              Stage {stage}
            </span>

            {/* Help Button in the middle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenInfo?.();
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-amber-400/50 transition-all duration-200 active:scale-95 shadow-md cursor-pointer shrink-0"
              title="How to play / Help"
            >
              <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] flex items-center justify-center font-black">?</span>
              <span>Help</span>
            </button>

            <button
              type="button"
              onClick={handleToggleMusic}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all duration-200 active:scale-95 shadow-md cursor-pointer border shrink-0 ${
                !isMusicMuted 
                  ? 'bg-[#4285F4]/20 border-[#4285F4]/50 text-white shadow-blue-500/20' 
                  : 'bg-white/5 border-white/15 text-white/50 hover:text-white'
              }`}
              title="Toggle Background Music"
            >
              <span className={!isMusicMuted ? 'animate-pulse text-sm' : 'text-sm'}>
                {!isMusicMuted ? '🎵' : '🔇'}
              </span>
              <span>{!isMusicMuted ? 'Music On' : 'Music Off'}</span>
            </button>
          </div>

          {/* 3D Animated Cat Character Mascot */}
          <div className="relative my-3 flex items-center justify-center select-none" style={{ transformStyle: 'preserve-3d' }}>
            {/* 3D Glowing Ambient Halo */}
            <div className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-amber-500/30 via-purple-500/20 to-blue-500/30 blur-xl animate-pulse-glow pointer-events-none" />

            {/* Orbiting 3D Fish Collectible */}
            <div className="absolute w-8 h-8 pointer-events-none animate-orbit-3d flex items-center justify-center text-lg filter drop-shadow-lg z-20">
              🐟
            </div>

            {/* 3D Cat Sphere Container */}
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-b from-[#ffbb44] via-[#f7971e] to-[#e65c00] border-2 border-amber-300/80 shadow-2xl flex items-center justify-center animate-float-3d">
              {/* Twitching 3D Cat Ears */}
              <div className="absolute -top-3.5 left-2 w-5 h-6 bg-[#ffbb44] border-t-2 border-l-2 border-amber-200 rounded-tl-full transform -rotate-12 animate-ear-left">
                <div className="w-2.5 h-3.5 bg-rose-400/80 rounded-tl-full mt-1.5 ml-1" />
              </div>
              <div className="absolute -top-3.5 right-2 w-5 h-6 bg-[#ffbb44] border-t-2 border-r-2 border-amber-200 rounded-tr-full transform rotate-12 animate-ear-right">
                <div className="w-2.5 h-3.5 bg-rose-400/80 rounded-tr-full mt-1.5 ml-1" />
              </div>

              {/* Expressive Cat Face */}
              <div className="flex flex-col items-center">
                {/* Eyes with Blinking Animation */}
                <div className="flex items-center gap-3.5 animate-blink">
                  <div className="w-2.5 h-3.5 bg-[#1b1c20] rounded-full relative shadow-inner">
                    <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 right-0.5" />
                  </div>
                  <div className="w-2.5 h-3.5 bg-[#1b1c20] rounded-full relative shadow-inner">
                    <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 right-0.5" />
                  </div>
                </div>

                {/* Cute Nose and W-Mouth */}
                <div className="flex flex-col items-center -mt-0.5">
                  <div className="w-1.5 h-1 bg-rose-500 rounded-full" />
                  <div className="text-[12px] font-black text-[#1b1c20] leading-none select-none">
                    ω
                  </div>
                </div>

                {/* Rosy Cheeks */}
                <div className="flex items-center justify-between w-14 -mt-2">
                  <div className="w-2.5 h-1.5 bg-rose-400/60 rounded-full blur-[0.5px]" />
                  <div className="w-2.5 h-1.5 bg-rose-400/60 rounded-full blur-[0.5px]" />
                </div>
              </div>

              {/* Cute Waving Paws */}
              <div className="absolute -bottom-2 -left-1 w-4 h-4 rounded-full bg-amber-100 border border-amber-300 shadow-sm" />
              <div className="absolute -bottom-2 -right-1 w-4 h-4 rounded-full bg-amber-100 border border-amber-300 shadow-sm" />
            </div>
          </div>

          {/* Title & Stage */}
          <h2 className="text-[23px] sm:text-[26px] font-black text-white leading-tight mt-1">
            Ready to Stretch?
          </h2>
          <p className="text-white/60 text-[12.5px] mt-0.5">
            {stageName} • {totalLevels} Levels
          </p>

          {/* Rules & Stats Card with History Option */}
          <div className="my-4 w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2 text-[12.5px] text-left">
            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none shrink-0">⏱️</span>
              <div>
                <span className="font-bold text-white">Continuous Clock: </span>
                <span className="text-white/70">Timer keeps running between levels—catch fish for extra seconds!</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="text-base leading-none shrink-0">🐟</span>
              <div>
                <span className="font-bold text-white">Treat Bonuses: </span>
                <span className="text-white/70">Grab fish & yarn before they disappear to extend time.</span>
              </div>
            </div>

            {/* High Score Row */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[12px]">
              <span className="text-white/50 font-medium">High Score</span>
              <span className="font-bold text-amber-400 tabular-nums">
                🏆 {bestScore > 0 ? `${bestScore.toLocaleString()} pts` : 'No score yet'}
              </span>
            </div>

            {/* History Option Directly Below High Score */}
            <button
              type="button"
              onClick={onOpenHistory}
              className="w-full pt-2 mt-1 border-t border-white/10 flex items-center justify-between text-[12px] text-white/80 hover:text-white transition-all cursor-pointer group rounded-xl hover:bg-white/5 px-1 py-1"
            >
              <div className="flex items-center gap-2">
                <span className="text-base group-hover:scale-125 transition-transform">📜</span>
                <span className="font-bold text-white/90 group-hover:text-amber-300 transition-colors">
                  Score History
                </span>
                {historyCount > 0 && (
                  <span className="text-[10px] bg-white/15 text-white/80 px-1.5 py-0.5 rounded-full font-bold">
                    {historyCount} runs
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-[#4285F4] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                View Past Scores ➔
              </span>
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleStartWithMusic}
            className="w-full py-3.5 bg-white text-black hover:bg-white/95 font-black text-[16px] sm:text-[17px] rounded-full transition-colors active:scale-95 shadow-xl cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Start Game</span>
            <span>🚀</span>
          </button>
          <span className="text-[11px] text-white/40 mt-1 mb-3 font-medium">Press Space or Enter to start</span>

          <button
            onClick={onOpenMultiplayer}
            className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-[#4285F4]/20 via-[#BB55A1]/20 to-[#4285F4]/20 hover:from-[#4285F4]/30 hover:to-[#BB55A1]/30 border border-[#4285F4]/40 hover:border-[#4285F4] text-white font-bold text-[13px] transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            <span className="text-base">👥</span>
            <span>Race with friends? Open Multiplayer Room</span>
            <span className="text-xs text-white/50">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SoloStartOverlay;
