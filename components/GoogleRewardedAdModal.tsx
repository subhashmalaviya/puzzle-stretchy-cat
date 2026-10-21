/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import adService, { AD_CAMPAIGNS, AdCampaign } from '../services/adService';
import bgmService from '../services/bgmService';

interface GoogleRewardedAdModalProps {
  isOpen: boolean;
  score: number;
  stage: number;
  levelId: number;
  reviveCount?: number;
  onRewardGranted: (extraSeconds: number) => void;
  onDeclineOrSkip: () => void;
}

interface FloatingToy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  popped: boolean;
  points: number;
}

const TOTAL_AD_SECONDS = 30;
const REWARD_SECONDS = 15;

const GoogleRewardedAdModal: React.FC<GoogleRewardedAdModalProps> = ({
  isOpen,
  score,
  stage,
  levelId,
  reviveCount = 0,
  onRewardGranted,
  onDeclineOrSkip,
}) => {
  // Phase: 'prompt' | 'watching' | 'rewarded' | 'confirm_skip'
  const [phase, setPhase] = useState<'prompt' | 'watching' | 'rewarded' | 'confirm_skip'>('prompt');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(TOTAL_AD_SECONDS);
  const [isAdMuted, setIsAdMuted] = useState<boolean>(false);
  const [currentCampaign, setCurrentCampaign] = useState<AdCampaign>(AD_CAMPAIGNS[1]); // Cat Paradise
  const [interactiveScore, setInteractiveScore] = useState<number>(0);
  const [toys, setToys] = useState<FloatingToy[]>([]);
  const [autoResumeCountdown, setAutoResumeCountdown] = useState<number>(3);

  const toyIdRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase('prompt');
      setSecondsRemaining(TOTAL_AD_SECONDS);
      setInteractiveScore(0);
      setAutoResumeCountdown(3);
      // Pick an engaging ad campaign
      const randomCampaign = AD_CAMPAIGNS[Math.floor(Math.random() * AD_CAMPAIGNS.length)];
      setCurrentCampaign(randomCampaign);
    }
  }, [isOpen]);

  // Handle start watching ad
  const handleStartWatching = () => {
    setPhase('watching');
    setSecondsRemaining(TOTAL_AD_SECONDS);
    adService.recordRewardedAdStart();
    bgmService.pauseTemporarily();

    // Spawn initial interactive toys for player engagement during the 30s ad
    const initialToys: FloatingToy[] = [
      { id: ++toyIdRef.current, x: 20, y: 30, vx: 0.15, vy: 0.12, emoji: '🐟', popped: false, points: 50 },
      { id: ++toyIdRef.current, x: 70, y: 40, vx: -0.12, vy: 0.14, emoji: '🧶', popped: false, points: 100 },
      { id: ++toyIdRef.current, x: 45, y: 65, vx: 0.18, vy: -0.15, emoji: '⭐', popped: false, points: 75 },
    ];
    setToys(initialToys);
  };

  // 30-Second Countdown Timer
  useEffect(() => {
    if (!isOpen || phase !== 'watching') return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // 30 seconds complete! Grant Reward!
          setPhase('rewarded');
          adService.recordRewardEarned(REWARD_SECONDS);
          adService.playRewardChime();
          return 0;
        }
        // Subtle tick sound every second
        if (prev <= 5) {
          adService.playCountdownTick(1000);
        } else {
          adService.playCountdownTick(700);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, phase]);

  // Auto-resume countdown when rewarded
  useEffect(() => {
    if (phase !== 'rewarded') return;
    const interval = setInterval(() => {
      setAutoResumeCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleClaimRewardAndResume();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Interactive Mini-game animation frame while watching
  useEffect(() => {
    if (phase !== 'watching') return;

    let lastSpawn = Date.now();

    const loop = () => {
      setToys((prevToys) => {
        const now = Date.now();
        let nextToys = prevToys.map((t) => {
          if (t.popped) return t;
          let nx = t.x + t.vx;
          let ny = t.y + t.vy;
          let nvx = t.vx;
          let nvy = t.vy;
          if (nx < 8 || nx > 92) nvx = -nvx;
          if (ny < 15 || ny > 82) nvy = -nvy;
          return { ...t, x: nx, y: ny, vx: nvx, vy: nvy };
        });

        // Spawn new toy every 3 seconds if fewer than 5
        if (now - lastSpawn > 3200 && nextToys.filter(t => !t.popped).length < 5) {
          lastSpawn = now;
          const emojis = ['🐟', '🧶', '⭐', '🐾', '🎀'];
          const emoji = emojis[Math.floor(Math.random() * emojis.length)];
          nextToys.push({
            id: ++toyIdRef.current,
            x: 15 + Math.random() * 70,
            y: 20 + Math.random() * 55,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            emoji,
            popped: false,
            points: Math.floor(Math.random() * 5 + 5) * 10
          });
        }
        return nextToys;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase]);

  const handlePopToy = (id: number, points: number) => {
    adService.playPopSound();
    setInteractiveScore((prev) => prev + points);
    setToys((prev) =>
      prev.map((t) => (t.id === id ? { ...t, popped: true } : t))
    );
  };

  const handleClaimRewardAndResume = () => {
    adService.playReviveFanfare();
    bgmService.resume();
    onRewardGranted(REWARD_SECONDS);
  };

  const handleConfirmSkip = () => {
    bgmService.resume();
    onDeclineOrSkip();
  };

  if (!isOpen) return null;

  const progressPercent = Math.min(
    100,
    Math.max(0, ((TOTAL_AD_SECONDS - secondsRemaining) / TOTAL_AD_SECONDS) * 100)
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-3 sm:p-5 select-none animate-in fade-in duration-200">
      
      {/* ---------------- PHASE 1: REVIVE PROMPT ---------------- */}
      {phase === 'prompt' && (
        <div className="bg-[#121318] text-white p-6 sm:p-8 rounded-3xl max-w-md w-full border border-amber-500/30 shadow-[0_0_50px_rgba(251,188,4,0.15)] flex flex-col items-center text-center relative overflow-hidden">
          {/* Glowing background halo */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Google Ads Header */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-[11px] font-semibold mb-4">
            <span className="flex items-center gap-0.5">
              <span className="text-[#4285F4] font-bold">G</span>
              <span className="text-[#EA4335] font-bold">o</span>
              <span className="text-[#FBBC04] font-bold">o</span>
              <span className="text-[#4285F4] font-bold">g</span>
              <span className="text-[#34A853] font-bold">l</span>
              <span className="text-[#EA4335] font-bold">e</span>
            </span>
            <span>Ads Rewarded Video</span>
          </div>

          {/* Animated Hourglass / Clock */}
          <div className="relative mb-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-4xl sm:text-5xl shadow-lg animate-bounce">
              ⏰
            </div>
            <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              Time 0:00
            </span>
          </div>

          <h2 className="text-[23px] sm:text-[27px] font-extrabold text-white tracking-tight leading-tight">
            Watch ads for more time?
          </h2>

          <p className="text-white/70 text-[13px] sm:text-[14px] mt-2 mb-4 leading-relaxed max-w-xs">
            Your solo time ran out! Complete a 30s ad to gain <strong className="text-emerald-400 font-extrabold">+{REWARD_SECONDS} SECONDS MORE</strong> and continue your game!
          </p>

          {/* Stage & Score summary pill */}
          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 mb-5 flex items-center justify-between text-left">
            <div>
              <div className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
                Stage {stage} • Level {levelId}
              </div>
              <div className="text-white font-extrabold text-[18px] tabular-nums mt-0.5">
                {score.toLocaleString()} <span className="text-xs font-normal text-white/60">Points</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Reward
              </div>
              <div className="text-emerald-400 font-extrabold text-[16px] flex items-center gap-1 justify-end">
                <span>⏱️</span> +{REWARD_SECONDS}s
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={handleStartWatching}
              className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-black font-extrabold text-[15px] sm:text-[16px] shadow-[0_0_25px_rgba(251,188,4,0.4)] hover:brightness-110 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>▶️</span>
              <span>Watch Ads for +{REWARD_SECONDS}s More Time</span>
            </button>

            <button
              onClick={onDeclineOrSkip}
              className="w-full py-2.5 px-4 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-semibold text-[13px] border border-white/10 transition-all duration-200 cursor-pointer"
            >
              No thanks, End Game
            </button>
          </div>
        </div>
      )}

      {/* ---------------- PHASE 2: 30-SECOND AD PLAYING ---------------- */}
      {phase === 'watching' && (
        <div className="relative w-full max-w-2xl h-[92vh] max-h-[640px] bg-[#0c0d12] rounded-3xl border border-white/15 shadow-2xl flex flex-col overflow-hidden">
          
          {/* Top Ad Header Bar */}
          <div className="bg-[#14161f] border-b border-white/10 px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between z-20">
            {/* Left: Google Ads Badge */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded text-[11px] font-bold">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">o</span>
                <span className="text-[#FBBC04]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#34A853]">l</span>
                <span className="text-[#EA4335]">e</span>
                <span className="text-white/80 ml-1">Ad</span>
              </div>
              <span className="text-white/50 text-[10px] hidden sm:inline">
                Sponsored · 1 of 1
              </span>
            </div>

            {/* Center: Live 30s Countdown Clock */}
            <div className="flex items-center gap-1.5 bg-black/60 border border-amber-400/40 px-3 py-1 rounded-full text-amber-300 font-extrabold text-[12px] sm:text-[13px] tabular-nums shadow-inner">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Reward in: {secondsRemaining}s</span>
            </div>

            {/* Right: Sound toggle and Skip button */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const muted = adService.toggleMute();
                  setIsAdMuted(muted);
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                title={isAdMuted ? "Unmute Ad Sound" : "Mute Ad Sound"}
              >
                {isAdMuted ? '🔇' : '🔊'}
              </button>

              <button
                onClick={() => setPhase('confirm_skip')}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-red-600 text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                title="Close / Skip Ad"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Linear Progress Bar across Top */}
          <div className="w-full h-1.5 bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-400 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Main Interactive Ad Canvas Stage */}
          <div className={`relative flex-1 bg-gradient-to-b ${currentCampaign.bgGradient} p-4 flex flex-col items-center justify-between overflow-hidden select-none`}>
            
            {/* Background animated ambiance */}
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Top Interactive Prompt */}
            <div className="z-10 bg-black/40 backdrop-blur-md border border-white/15 px-4 py-1.5 rounded-full flex items-center gap-2 text-xs text-white">
              <span className="animate-bounce">🎮</span>
              <span className="font-medium text-white/90">
                Tap the floating items while you wait! Score: <strong className="text-amber-400 font-bold">{interactiveScore}</strong>
              </span>
            </div>

            {/* Floating Toys (Playable Mini-game while 30s ad counts down!) */}
            <div className="absolute inset-0 z-10 pointer-events-auto">
              {toys.map((toy) => (
                <button
                  key={toy.id}
                  onClick={() => !toy.popped && handlePopToy(toy.id, toy.points)}
                  disabled={toy.popped}
                  style={{
                    left: `${toy.x}%`,
                    top: `${toy.y}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 text-3xl sm:text-4xl transition-transform duration-150 cursor-pointer active:scale-75 ${
                    toy.popped ? 'scale-0 opacity-0 pointer-events-none' : 'hover:scale-125'
                  }`}
                  title="Tap to catch!"
                >
                  <span className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] filter">
                    {toy.emoji}
                  </span>
                </button>
              ))}
            </div>

            {/* Center: Featured Game / App Showcase Card */}
            <div className="z-10 my-auto flex flex-col items-center text-center max-w-sm p-4 bg-black/50 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl">
              <div 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl mb-3 shadow-lg border border-white/20 animate-pulse"
                style={{ backgroundColor: `${currentCampaign.color}35` }}
              >
                {currentCampaign.iconEmoji}
              </div>

              <span className="bg-white/15 text-white/90 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1">
                {currentCampaign.badge}
              </span>

              <h3 className="text-white font-extrabold text-[18px] sm:text-[22px] tracking-tight">
                {currentCampaign.title}
              </h3>

              <div className="flex items-center gap-2 mt-1 mb-2 text-xs">
                <span className="text-amber-400 font-bold">★ {currentCampaign.rating}</span>
                <span className="text-white/40">•</span>
                <span className="text-white/70">{currentCampaign.downloads} Downloads</span>
                <span className="text-white/40">•</span>
                <span className="text-white/60">{currentCampaign.advertiser}</span>
              </div>

              <p className="text-white/70 text-[12px] sm:text-[13px] leading-snug mb-3">
                {currentCampaign.description}
              </p>

              {/* Install button inside ad */}
              <button
                onClick={() => {
                  adService.playPopSound();
                  setInteractiveScore((prev) => prev + 250);
                }}
                className="w-full py-2.5 rounded-full font-bold text-xs sm:text-sm text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
                style={{ backgroundColor: currentCampaign.color }}
              >
                {currentCampaign.ctaText}
              </button>
            </div>

            {/* Bottom 30s Status notification */}
            <div className="z-10 text-center">
              <span className="text-white/50 text-[11px]">
                Watch all {TOTAL_AD_SECONDS} seconds to unlock +{REWARD_SECONDS} seconds extra time
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PHASE 3: REWARD UNLOCKED! (+10 SECONDS) ---------------- */}
      {phase === 'rewarded' && (
        <div className="bg-[#10121a] text-white p-6 sm:p-8 rounded-3xl max-w-md w-full border border-emerald-500/40 shadow-[0_0_60px_rgba(52,168,83,0.3)] flex flex-col items-center text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Confetti & Gold glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/25 rounded-full blur-3xl pointer-events-none" />

          {/* Trophy / Award icon */}
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-5xl mb-3 shadow-[0_0_30px_rgba(52,168,83,0.5)] animate-bounce">
            🎉
          </div>

          <div className="bg-emerald-400/20 border border-emerald-400/50 text-emerald-300 text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
            Google Ad Completed!
          </div>

          <h2 className="text-[26px] sm:text-[30px] font-black text-white tracking-tight leading-tight">
            +{REWARD_SECONDS} SECONDS ADDED!
          </h2>

          <p className="text-white/80 text-[13px] sm:text-[14px] mt-2 mb-5 max-w-xs">
            Awesome! You completed the 30-second Google Ad. Your extra time has been added. Continue stretching your cat!
          </p>

          {/* Reward summary badge */}
          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 flex items-center justify-around">
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Extra Time</div>
              <div className="text-emerald-400 font-black text-2xl mt-0.5">+{REWARD_SECONDS}s</div>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Bonus Points</div>
              <div className="text-amber-400 font-black text-2xl mt-0.5">+{interactiveScore}</div>
            </div>
          </div>

          <button
            onClick={handleClaimRewardAndResume}
            className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-[16px] sm:text-[17px] shadow-[0_0_30px_rgba(52,168,83,0.5)] hover:brightness-110 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🚀 Resume Game Now</span>
            <span className="text-xs bg-black/20 text-black px-2 py-0.5 rounded-full font-bold">
              ({autoResumeCountdown}s)
            </span>
          </button>
        </div>
      )}

      {/* ---------------- CONFIRM SKIP AD WARNING ---------------- */}
      {phase === 'confirm_skip' && (
        <div className="bg-[#181920] text-white p-6 rounded-3xl max-w-sm w-full border border-red-500/40 shadow-2xl flex flex-col items-center text-center z-50">
          <span className="text-4xl mb-2">⚠️</span>
          <h3 className="text-lg font-bold text-white">Skip Google Ad?</h3>
          <p className="text-white/70 text-xs mt-1.5 mb-5 leading-relaxed">
            If you skip now with <strong>{secondsRemaining}s remaining</strong>, you will <span className="text-red-400 font-bold">NOT receive</span> the +{REWARD_SECONDS} seconds extra time and your run will end.
          </p>
          <div className="w-full flex flex-col gap-2">
            <button
              onClick={() => setPhase('watching')}
              className="w-full py-3 bg-[#4285F4] hover:bg-[#3367D6] text-white font-bold text-xs rounded-full transition-colors cursor-pointer"
            >
              Resume Watching ({secondsRemaining}s left)
            </button>
            <button
              onClick={handleConfirmSkip}
              className="w-full py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-bold text-xs rounded-full transition-colors cursor-pointer"
            >
              Skip (Give Up +{REWARD_SECONDS}s)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleRewardedAdModal;
