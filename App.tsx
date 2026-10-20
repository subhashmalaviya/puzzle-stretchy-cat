/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateLevel, getStageConfig } from './logic/levelGenerator';
import { Point, CellType, LevelData, GameState, ScoreHistoryEntry, RoomState, MultiplayerToastMsg } from './types';
import Grid from './components/Grid';
import GameOver from './components/GameOver';
import FooterLeftContent from './components/FooterLeftContent';
import TopHeader from './components/TopHeader';
import HistoryModal from './components/HistoryModal';
import StageClearModal from './components/StageClearModal';
import LiveLeaderboardHUD from './components/LiveLeaderboardHUD';
import MultiplayerModal from './components/MultiplayerModal';
import MultiplayerToast from './components/MultiplayerToast';
import SoloStartOverlay from './components/SoloStartOverlay';
import MatchCountdownOverlay from './components/MatchCountdownOverlay';
import MultiplayerMatchEndModal from './components/MultiplayerMatchEndModal';
import multiplayerService from './services/multiplayerService';
import bgmService from './services/bgmService';
import { 
  GAME_CONSTANTS, 
  getStageTotalLevels, 
  getStageInitialTime, 
  getLevelWinBonusTime, 
  getTreatLifetimeMs, 
  STORAGE_KEYS 
} from './constants';
import { useKeyboardControls } from './hooks/useKeyboardControls';

import useAudio from "./services/audioService";
import { getPath } from "./utils/path";
import { TimerIcon } from "./components/Icons";
import InfoDialog from './components/InfoDialog';

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(true);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isSoloStarted, setIsSoloStarted] = useState(false);
  const [isMatchCountdown, setIsMatchCountdown] = useState(false);
  const [isMatchEndedModalOpen, setIsMatchEndedModalOpen] = useState(false);

  const [stage, setStage] = useState(1);
  const [levelIndex, setLevelIndex] = useState(1);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);
  const [level, setLevel] = useState<LevelData | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(() => getStageInitialTime(1));
  
  // Best score and history persistence
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BEST_SCORE);
      return saved ? Number(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [history, setHistory] = useState<ScoreHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCORE_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal visibility states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isStageClearOpen, setIsStageClearOpen] = useState(false);
  const [stageClearBonus, setStageClearBonus] = useState(0);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);
  const [multiplayerModalTab, setMultiplayerModalTab] = useState<'create' | 'join'>('create');

  // Multiplayer room state and toast notifications
  const [multiplayerRoom, setMultiplayerRoom] = useState<RoomState | null>(null);
  const [multiplayerToast, setMultiplayerToast] = useState<MultiplayerToastMsg | null>(null);
  const myProfile = multiplayerService.getProfile();

  const collectedMap = useRef<Set<string>>(new Set());
  const isTransitioningRef = useRef(false);
  const isWinProcessed = useRef(false);

  const [gameState, setGameState] = useState<GameState>({
    path: [],
    isWon: false,
    isDragging: false,
    score: 0,
    levelStartScore: 0,
    multiplier: 1,
    treats: 0,
    collectedItems: []
  });
  
  const [timeBonuses, setTimeBonuses] = useState<{id: number; x: number; y: number; text: string; color: string}[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<number>(0);

  // In multiplayer battle, timer does not pause for modals to maintain fair live competition!
  const isPaused = !multiplayerRoom && (isHistoryOpen || isStageClearOpen || isInfoOpen);

  const { playForeground, preloadCache } = useAudio();
  const audioFiles = [
    getPath("/media/audio/sfx/stretchycat/backspace.mp3"),
    getPath("/media/audio/sfx/stretchycat/stretchspace.mp3"),
    getPath("/media/audio/sfx/stretchycat/YarnReward.mp3"),
    getPath("/media/audio/sfx/stretchycat/FishReward.mp3"),
    getPath("/media/audio/sfx/stretchycat/goal.mp3"),
    getPath("/media/audio/sfx/global/win.mp3"),
  ];

  useEffect(() => {
    const parent = document.getElementById('puzzle-game-container');
    if (parent) {
      parent.style.position = 'relative';
      parent.style.height = '100vh';
      parent.style.width = '100vw';
      parent.style.overflow = 'hidden';
      parent.style.display = 'block';
    }
  }, []);

  useEffect(() => { preloadCache(audioFiles); }, []);

  // Auto-play background music on first interaction (complies with browser AudioContext policy)
  useEffect(() => {
    const handleFirstGesture = () => {
      if (!bgmService.isMuted()) {
        bgmService.play();
      }
    };
    window.addEventListener('pointerdown', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  // Subscribe to multiplayer room updates and notifications
  useEffect(() => {
    const unsubRoom = multiplayerService.subscribe((r) => {
      setMultiplayerRoom(r);
      if (r?.status === 'ended') {
        setTimerStarted(false);
        setIsMatchCountdown(false);
        setIsMatchEndedModalOpen(true);
      }
    });
    const unsubToasts = multiplayerService.subscribeToasts((t) => {
      setMultiplayerToast(t);
      setTimeout(() => setMultiplayerToast(null), 3500);
    });
    const unsubMatchStart = multiplayerService.onMatchStart(() => {
      setIsMultiplayerOpen(false);
      setIsMatchEndedModalOpen(false);
      setGameResult(null);
      setStage(1);
      setLevelIndex(1);
      setTimeLeft(getStageInitialTime(1));
      setTimeBonuses([]);
      collectedMap.current.clear();
      isWinProcessed.current = false;
      setGameState({
        path: [],
        isWon: false,
        isDragging: false,
        score: 0,
        levelStartScore: 0,
        multiplier: 1,
        treats: 0,
        collectedItems: []
      });
      setIsMatchCountdown((prev) => {
        if (prev) return prev;
        return true;
      });
    });
    const unsubMatchEnd = multiplayerService.onMatchEnd((endedBy, room) => {
      setTimerStarted(false);
      setIsMatchCountdown(false);
      setMultiplayerRoom(room);
      setIsMatchEndedModalOpen(true);
    });
    const unsubRematch = multiplayerService.onRematch((room) => {
      setIsMatchEndedModalOpen(false);
      setIsSoloStarted(false);
      setTimerStarted(false);
      setTimeLeft(getStageInitialTime(1));
      setGameResult(null);
      setStage(1);
      setLevelIndex(1);
      setTimeBonuses([]);
      collectedMap.current.clear();
      isWinProcessed.current = false;
      setGameState({
        path: [],
        isWon: false,
        isDragging: false,
        score: 0,
        levelStartScore: 0,
        multiplier: 1,
        treats: 0,
        collectedItems: []
      });
      setMultiplayerRoom(room);
      setIsMultiplayerOpen(true);
    });
    return () => {
      unsubRoom();
      unsubToasts();
      unsubMatchStart();
      unsubMatchEnd();
      unsubRematch();
    };
  }, []);

  // Check URL query param ?room=CODE on startup
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        multiplayerService.joinRoom(roomParam).then((r) => {
          if (r) {
            setMultiplayerRoom(r);
            setIsMultiplayerOpen(true);
          }
        });
      }
    } catch {}
  }, []);

  const [isTreatActive, setIsTreatActive] = useState(true);
  const [isYarnActive, setIsYarnActive] = useState(true);
  const [levelStartTime, setLevelStartTime] = useState<number>(0);

  useEffect(() => {
    if (isPaused) {
      if (pauseStartTime === 0) setPauseStartTime(Date.now());
    } else if (pauseStartTime > 0) {
      const diff = Date.now() - pauseStartTime;
      setLevelStartTime(prev => (prev > 0 ? prev + diff : 0));
      setPauseStartTime(0);
    }
  }, [isPaused, pauseStartTime]);

  /**
   * Records a run into history and updates high score if applicable.
   */
  const recordHistoryRun = useCallback((
    finalScore: number,
    runStage: number,
    runLevel: number,
    reason: 'timeout' | 'reset' | 'stage_cleared' | 'victory'
  ) => {
    const entry: ScoreHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      score: finalScore,
      stage: runStage,
      level: runLevel,
      timestamp: Date.now(),
      reason,
    };

    setHistory(prev => {
      const updated = [entry, ...prev].slice(0, 60);
      try {
        localStorage.setItem(STORAGE_KEYS.SCORE_HISTORY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save score history:", e);
      }
      return updated;
    });

    setBestScore(prevBest => {
      if (finalScore > prevBest) {
        try {
          localStorage.setItem(STORAGE_KEYS.BEST_SCORE, String(finalScore));
        } catch (e) {
          console.error("Failed to save best score:", e);
        }
        return finalScore;
      }
      return prevBest;
    });
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.SCORE_HISTORY);
    } catch (e) {
      console.error("Failed to clear score history:", e);
    }
  }, []);

  const initLevel = useCallback(async (targetStage: number, targetLevel: number) => {
    setIsTransitioning(true);
    isTransitioningRef.current = true;
    isWinProcessed.current = false;
    const newLevel = generateLevel(targetStage, targetLevel);

    setTimeout(() => {
      collectedMap.current.clear();
      setLevel(newLevel);
      setIsTreatActive(true);
      setIsYarnActive(true);
      setPauseStartTime(0);
      setLevelStartTime(Date.now());

      setGameState(prev => ({
        ...prev,
        path: [newLevel.startPoint],
        isWon: false,
        isDragging: false,
        multiplier: 1,
        treats: 0,
        collectedItems: [],
        levelStartScore: prev.score
      }));
      setIsTransitioning(false);
      isTransitioningRef.current = false;
    }, GAME_CONSTANTS.LEVEL_TRANSITION_TIME_MS);
  }, []);

  /**
   * Resets the entire game: score resets to zero, saves current run to history,
   * updates room status, and restarts at Stage 1, Level 1.
   */
  const handleFullReset = useCallback(() => {
    if (!gameResult && (gameState.score > 0 || levelIndex > 1 || stage > 1)) {
      recordHistoryRun(gameState.score, stage, levelIndex, 'reset');
    }

    setGameResult(null);
    setIsStageClearOpen(false);
    setTimeLeft(getStageInitialTime(1));
    collectedMap.current.clear();
    isWinProcessed.current = false;
    setTimerStarted(false);
    setIsSoloStarted(false);

    // Reset game score to zero
    setGameState({
      path: [],
      isWon: false,
      isDragging: false,
      score: 0,
      levelStartScore: 0,
      multiplier: 1,
      treats: 0,
      collectedItems: []
    });

    multiplayerService.updateProgress(0, 1, 1, 'reset');

    if (stage === 1 && levelIndex === 1) {
      initLevel(1, 1);
    } else {
      setStage(1);
      setLevelIndex(1);
    }
  }, [gameResult, gameState.score, levelIndex, stage, recordHistoryRun, initLevel]);

  const restartCurrentLevel = () => {
    if (!level) return;
    setIsTreatActive(true);
    setIsYarnActive(true);
    collectedMap.current.clear();
    isWinProcessed.current = false;
    setLevelStartTime(Date.now());
    setGameState(prev => ({
      ...prev,
      path: [level.startPoint],
      isWon: false,
      isDragging: false,
      score: prev.levelStartScore,
      multiplier: 1,
      treats: 0,
      collectedItems: []
    }));
  };

  const handleNextStage = () => {
    setIsStageClearOpen(false);
    const nextStage = stage + 1;
    setStage(nextStage);
    setLevelIndex(1);
    // Add extra time bonus for moving to the next stage
    setTimeLeft(prev => (prev !== null ? prev + 12 : getStageInitialTime(nextStage)));
    multiplayerService.updateProgress(gameState.score, nextStage, 1, 'playing');
  };

  // Solo Start handler: starts continuous countdown clock & plays music automatically!
  const handleSoloStart = () => {
    bgmService.unmute();
    bgmService.play();
    setIsSoloStarted(true);
    setTimerStarted(true);
    setLevelStartTime(Date.now());
    setTimeLeft(getStageInitialTime(stage));
  };

  // Multiplayer Countdown Complete handler: starts continuous countdown clock & plays music!
  const handleMatchCountdownComplete = useCallback(() => {
    bgmService.unmute();
    bgmService.play();
    setIsMatchCountdown(false);
    setIsSoloStarted(true);
    setTimerStarted(true);
    setLevelStartTime(Date.now());
    setTimeLeft(getStageInitialTime(1));
    setStage(1);
    setLevelIndex(1);
    setTimeBonuses([]);
    collectedMap.current.clear();
    isWinProcessed.current = false;
    setGameState({
      path: [],
      isWon: false,
      isDragging: false,
      score: 0,
      levelStartScore: 0,
      multiplier: 1,
      treats: 0,
      collectedItems: []
    });
    initLevel(1, 1);
    multiplayerService.updateProgress(0, 1, 1, 'playing');
  }, [initLevel]);

  // Host triggers Rematch: resets room and brings everyone back to lobby
  const handleRematch = () => {
    multiplayerService.rematchRoom();
    setIsMatchEndedModalOpen(false);
    setIsSoloStarted(false);
    setTimerStarted(false);
    setTimeLeft(getStageInitialTime(1));
    setGameResult(null);
    setStage(1);
    setLevelIndex(1);
    setTimeBonuses([]);
    collectedMap.current.clear();
    isWinProcessed.current = false;
    setGameState({
      path: [],
      isWon: false,
      isDragging: false,
      score: 0,
      levelStartScore: 0,
      multiplier: 1,
      treats: 0,
      collectedItems: []
    });
    initLevel(1, 1);
    setIsMultiplayerOpen(true);
  };

  // Leave Room from Match End screen
  const handleLeaveRoomFromMatchEnd = () => {
    multiplayerService.leaveRoom();
    setMultiplayerRoom(null);
    setIsMatchEndedModalOpen(false);
    handleFullReset();
  };

  // Treat/Yarn decay based on stage difficulty
  useEffect(() => {
    if (!isTreatActive || isPaused || pauseStartTime > 0 || !hasStarted || !level || levelStartTime === 0) return; 
    const totalLifetime = getTreatLifetimeMs(stage) + (level.targetCount * GAME_CONSTANTS.TREAT_SCALE_FACTOR_MS);
    const elapsed = Date.now() - levelStartTime;
    const remaining = totalLifetime - elapsed;

    if (remaining <= 0) {
      setIsTreatActive(false);
    } else {
      const timer = setTimeout(() => setIsTreatActive(false), remaining);
      return () => clearTimeout(timer);
    }
  }, [isTreatActive, hasStarted, level, levelStartTime, isPaused, pauseStartTime, stage]);

  useEffect(() => {
    if (!isYarnActive || isPaused || pauseStartTime > 0 || !hasStarted || !level || levelStartTime === 0) return; 
    const totalLifetime = getTreatLifetimeMs(stage) + (level.targetCount * GAME_CONSTANTS.YARN_SCALE_FACTOR_MS);
    const elapsed = Date.now() - levelStartTime;
    const remaining = totalLifetime - elapsed;

    if (remaining <= 0) {
      setIsYarnActive(false);
    } else {
      const timer = setTimeout(() => setIsYarnActive(false), remaining);
      return () => clearTimeout(timer);
    }
  }, [isYarnActive, hasStarted, level, levelStartTime, isPaused, pauseStartTime, stage]);

  /**
   * CONTINUOUS TIMER:
   * Starts when Start button is clicked (solo) or when creator starts match (multiplayer).
   * Does NOT stop between level changes or transitions!
   */
  useEffect(() => {
    if (!hasStarted || gameResult !== null || timeLeft === null || !timerStarted || isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, gameResult, timeLeft, timerStarted, isPaused]);

  // When continuous time runs out, save score to history tab and report timeout
  useEffect(() => {
    if (timeLeft === 0 && !gameState.isWon && hasStarted && !isTransitioning && !gameResult && timerStarted) {
      recordHistoryRun(gameState.score, stage, levelIndex, 'timeout');
      setTimerStarted(false);
      if (multiplayerRoom) {
        multiplayerService.reportTimeout(gameState.score, stage, levelIndex);
      } else {
        multiplayerService.updateProgress(gameState.score, stage, levelIndex, 'timeout');
        setGameResult('lose');
      }
    }
  }, [timeLeft, gameState.isWon, hasStarted, isTransitioning, gameResult, timerStarted, gameState.score, stage, levelIndex, recordHistoryRun, multiplayerRoom]);

  useEffect(() => { 
    if (hasStarted) initLevel(stage, levelIndex); 
  }, [stage, levelIndex, hasStarted, initLevel]);

  const handleCellInteraction = (p: Point) => {
    if (isTransitioningRef.current || isWinProcessed.current || isPaused || gameResult) return;
    // Don't interact until start button is clicked
    if (!timerStarted) return;
    
    if (levelStartTime === 0) {
      const last = gameState.path[gameState.path.length - 1];
      if (last) {
        const isAdjacent = Math.abs(last.x - p.x) + Math.abs(last.y - p.y) === 1;
        if (isAdjacent) setLevelStartTime(Date.now());
      }
    }

    setGameState(prev => {
      if (!level || prev.isWon || prev.path.length === 0) return prev;
      const path = prev.path;
      const last = path[path.length - 1];
      const secondLast = path[path.length - 2];
      const isAdjacent = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
      if (!isAdjacent(last, p)) return prev;
      if (secondLast && p.x === secondLast.x && p.y === secondLast.y) {
        playForeground(getPath("/media/audio/sfx/stretchycat/backspace.mp3"));
        const newScore = Math.max(prev.levelStartScore, prev.score - GAME_CONSTANTS.BASE_MOVE_SCORE);
        multiplayerService.updateProgress(newScore, stage, levelIndex, 'playing');
        return { ...prev, path: path.slice(0, -1), score: newScore };
      }
      const cellType = level.grid[p.y][p.x];
      const cellKey = `${p.x},${p.y}`;
      if (path.some(pt => pt.x === p.x && pt.y === p.y)) return prev; 
      if ([CellType.COUCH, CellType.PLANT, CellType.BOX].includes(cellType)) return prev;
      if (cellType === CellType.WATER) { 
        // Stepping on water splashes! Clock continues ticking so seconds lost are fatal!
        setTimeout(restartCurrentLevel, 0); 
        return prev; 
      }
      const newPath = [...path, p];
      let scoreAdd = GAME_CONSTANTS.BASE_MOVE_SCORE;
      let newTreats = prev.treats;

      if ((cellType === CellType.TREAT && isTreatActive) || (cellType === CellType.YARN && isYarnActive) || cellType === CellType.STAR) {
        if (!collectedMap.current.has(cellKey)) {
          collectedMap.current.add(cellKey);
          if (cellType === CellType.TREAT) {
            playForeground(getPath("/media/audio/sfx/stretchycat/FishReward.mp3"));
            // Time bonus for catching fish (scaled by stage difficulty)
            const timeBonus = Math.max(2, 4 - Math.floor((stage - 1) / 2));
            setTimeout(() => setTimeLeft(t => (t !== null ? t + timeBonus : t)), 0);
            newTreats += 1;
            const bid = Date.now();
            setTimeBonuses(b => [...b, { id: bid, x: p.x, y: p.y, text: `+${timeBonus}s`, color: 'text-white' }]);
            setTimeout(() => setTimeBonuses(b => b.filter(i => i.id !== bid)), 2000);
          } else if (cellType === CellType.YARN) {
            playForeground(getPath("/media/audio/sfx/stretchycat/YarnReward.mp3"));
            const yarnBonus = GAME_CONSTANTS.YARN_SCORE_BONUS * stage;
            scoreAdd += yarnBonus;
            const bid = Date.now();
            setTimeBonuses(b => [...b, { id: bid, x: p.x, y: p.y, text: `+${yarnBonus}`, color: 'text-white' }]);
            setTimeout(() => setTimeBonuses(b => b.filter(i => i.id !== bid)), 2000);
          } else if (cellType === CellType.STAR) {
            playForeground(getPath("/media/audio/sfx/stretchycat/YarnReward.mp3"));
            const starBonus = 100 * stage;
            scoreAdd += starBonus;
            const bid = Date.now();
            setTimeBonuses(b => [...b, { id: bid, x: p.x, y: p.y, text: `+${starBonus}★`, color: 'text-amber-300' }]);
            setTimeout(() => setTimeBonuses(b => b.filter(i => i.id !== bid)), 2000);
          }
        }
      } else { 
        playForeground(getPath("/media/audio/sfx/stretchycat/stretchspace.mp3")); 
      }

      const totalLevelsInCurrentStage = getStageTotalLevels(stage);
      const won = newPath.length === level.targetCount && cellType === CellType.SAUCER;
      const updatedScore = prev.score + scoreAdd;

      // Broadcast live score to multiplayer room
      multiplayerService.updateProgress(updatedScore, stage, levelIndex, 'playing');

      if (won && !isWinProcessed.current) {
        isWinProcessed.current = true;
        isTransitioningRef.current = true;
        setTimeBonuses([]);
        playForeground(getPath("/media/audio/sfx/stretchycat/goal.mp3"));

        // Bonus time on level completion (Stage 1: +2s, Stage 2: +1s, Stage 3+: 0s)
        const winTimeBonus = getLevelWinBonusTime(stage);
        if (winTimeBonus > 0) {
          setTimeout(() => setTimeLeft(t => (t !== null ? t + winTimeBonus : t)), 0);
          const bid = Date.now();
          setTimeBonuses(b => [...b, { id: bid, x: p.x, y: p.y, text: `+${winTimeBonus}s`, color: 'text-sky-300' }]);
          setTimeout(() => setTimeBonuses(b => b.filter(i => i.id !== bid)), 2000);
        }

        setTimeout(() => {
          if (levelIndex >= totalLevelsInCurrentStage) {
            // Stage completed!
            const bonus = stage * 250;
            const finalStageScore = updatedScore + bonus;
            setStageClearBonus(bonus);
            setGameState(s => ({
              ...s,
              score: finalStageScore,
              levelStartScore: finalStageScore
            }));
            recordHistoryRun(finalStageScore, stage, levelIndex, 'stage_cleared');
            multiplayerService.updateProgress(finalStageScore, stage, levelIndex, 'won');
            setIsStageClearOpen(true);
            playForeground(getPath("/media/audio/sfx/global/win.mp3"));
          } else {
            const nextLvl = levelIndex + 1;
            setLevelIndex(nextLvl);
            multiplayerService.updateProgress(updatedScore, stage, nextLvl, 'playing');
          }
        }, 300);
      }
      return { 
        ...prev, 
        path: newPath, 
        isWon: won, 
        score: updatedScore, 
        treats: newTreats, 
        collectedItems: [...prev.collectedItems, cellKey] 
      };
    });
  };

  useKeyboardControls((direction) => {
    if (!hasStarted || gameResult || isTransitioning || !level || gameState.isWon || isPaused || !timerStarted) return;
    const currentHead = gameState.path[gameState.path.length - 1];
    if (!currentHead) return;
    const newPos = { x: currentHead.x + direction.x, y: currentHead.y + direction.y };
    if (newPos.x >= 0 && newPos.x < level.width && newPos.y >= 0 && newPos.y < level.height) handleCellInteraction(newPos);
  });

  const currentStageConfig = getStageConfig(stage);
  const nextStageConfig = getStageConfig(stage + 1);
  const totalLevelsInCurrentStage = getStageTotalLevels(stage);

  // Compute player's rank in multiplayer room
  const leaderboard = multiplayerService.getLeaderboard();
  const myRankIndex = leaderboard.findIndex(p => p.id === myProfile.id);
  const roomRank = myRankIndex !== -1 ? myRankIndex + 1 : null;

  if (!level) return null;

  return (
    <div className="absolute inset-0 bg-black overflow-hidden flex flex-col items-center" onMouseUp={() => setGameState(prev => ({ ...prev, isDragging: false }))}>
      <style>{`
        @media (max-width: 767px) {
          footer.fixed {
            bottom: 12px !important;
          }
        }
        @keyframes floatUpFade { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-30px) scale(1.4); opacity: 0; } }
        .animate-float-up { animation: floatUpFade 1.8s ease-out forwards; }
        @keyframes oscillateAlpha { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(0.9); } }
        .animate-oscillate { animation: oscillateAlpha 0.5s infinite ease-in-out; }
      `}</style>
      
      {/* Top Header showing Best Score, Stage, Multiplayer Room & History */}
      <TopHeader
        stage={stage}
        stageName={currentStageConfig.name}
        levelInStage={levelIndex}
        totalLevelsInStage={totalLevelsInCurrentStage}
        score={gameState.score}
        bestScore={bestScore}
        historyCount={history.length}
        currentRoomId={multiplayerRoom?.id}
        roomPlayerCount={multiplayerRoom ? Object.keys(multiplayerRoom.players).length : 0}
        onOpenMultiplayer={() => {
          setMultiplayerModalTab('create');
          setIsMultiplayerOpen(true);
        }}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenInfo={() => setIsInfoOpen(true)}
      />

      {/* Synchronized 3.. 2.. 1.. GO! Countdown Overlay for Multiplayer */}
      {isMatchCountdown && (
        <MatchCountdownOverlay onComplete={handleMatchCountdownComplete} />
      )}

      {/* Floating Multiplayer Toast Notifications */}
      <MultiplayerToast toast={multiplayerToast} />

      {/* Floating Live In-Game Leaderboard HUD (when inside a multiplayer room) */}
      <LiveLeaderboardHUD
        room={multiplayerRoom}
        currentPlayerId={myProfile.id}
        onOpenModal={() => setIsMultiplayerOpen(true)}
        onLeaveRoom={() => multiplayerService.leaveRoom()}
      />

      {/* Multiplayer Battle Room & Leaderboard Modal */}
      <MultiplayerModal
        isOpen={isMultiplayerOpen}
        initialTab={multiplayerModalTab}
        onClose={() => setIsMultiplayerOpen(false)}
        room={multiplayerRoom}
        onRoomJoined={(r) => {
          setMultiplayerRoom(r);
        }}
        onLeaveRoom={() => {
          multiplayerService.leaveRoom();
          setMultiplayerRoom(null);
        }}
      />

      {/* Game Over Screen */}
      {gameResult && (
        <GameOver 
          type={gameResult} 
          score={gameState.score} 
          bestScore={bestScore}
          stage={stage}
          roomRank={roomRank}
          totalRoomPlayers={leaderboard.length}
          onAction={handleFullReset} 
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenLeaderboard={multiplayerRoom ? () => setIsMultiplayerOpen(true) : undefined}
        />
      )}

      {/* Stage Clear Celebration Modal */}
      {isStageClearOpen && (
        <StageClearModal
          stage={stage}
          stageName={currentStageConfig.name}
          bonusPoints={stageClearBonus}
          totalScore={gameState.score}
          nextStageTotalLevels={getStageTotalLevels(stage + 1)}
          nextStageName={nextStageConfig.name}
          nextStageFlavor={nextStageConfig.flavor}
          onNextStage={handleNextStage}
        />
      )}

      {/* Score History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        bestScore={bestScore}
        onClearHistory={handleClearHistory}
      />

      {/* Main Grid View */}
      <main className="absolute top-[46px] sm:top-[52px] md:top-[58px] bottom-[56px] sm:bottom-[66px] md:bottom-[76px] left-0 right-0 flex flex-col items-center justify-center p-2 select-none">
        <div className={`transition-all duration-500 transform ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} flex flex-col items-center justify-center mt-7 sm:mt-0`}>
          <Grid
            level={level}
            path={gameState.path}
            collectedMap={collectedMap.current}
            timeBonuses={timeBonuses}
            isTreatActive={isTreatActive}
            isYarnActive={isYarnActive}
            levelStartTime={levelStartTime}
            onCellMouseDown={(p) => { 
              if (!isTransitioning && !isWinProcessed.current && !isPaused && timerStarted) { 
                setGameState(prev => ({ ...prev, isDragging: true })); 
                handleCellInteraction(p); 
              } 
            }}
            onCellMouseEnter={(p) => { 
              if (gameState.isDragging && !isTransitioning && !isWinProcessed.current && !isPaused && timerStarted) {
                handleCellInteraction(p); 
              }
            }}
          />
          {timeLeft !== null && (
            <div className={`shrink-0 flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-bold mt-2 sm:mt-2.5 shadow-lg transition-colors duration-300 z-10 ${
              timeLeft === 0
                ? 'bg-red-600 text-white animate-pulse'
                : timeLeft <= 5 && timerStarted
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-white text-black'
            }`}>
              <TimerIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-[13px] sm:text-[15px] tabular-nums">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
              {multiplayerRoom && timeLeft === 0 ? (
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold bg-black/30 px-1.5 py-0.5 rounded-full ml-1 text-white">
                  Time's Up • Waiting for players...
                </span>
              ) : !timerStarted && timeLeft > 0 ? (
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-extrabold bg-black/10 px-1.5 py-0.5 rounded-full ml-1">
                  Ready
                </span>
              ) : null}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Footer with Stage, Level, Score, and Reset button */}
      <div className="fixed bottom-[10px] sm:bottom-[16px] md:bottom-[28px] left-0 right-0 z-[10] flex justify-center pointer-events-none px-2 sm:px-4 md:px-6">
        <div className="pointer-events-auto">
          <FooterLeftContent 
            stage={stage}
            levelId={level.id} 
            totalLevels={totalLevelsInCurrentStage} 
            score={gameState.score} 
            onReset={handleFullReset} 
            onOpenHistory={() => setIsHistoryOpen(true)}
          />
        </div>
      </div>

      {/* Info Dialog */}
      {isInfoOpen && (
        <InfoDialog 
          title="Stretch and Solve" 
          goal="Stretch the cat to cover all required tiles on the board, ending at the finish flag. Watch the clock—the continuous timer starts when you click Start and won't stop between levels! Catch fish treats for extra time and beware of water puddles in higher stages." 
          onClose={() => setIsInfoOpen(false)}
        />
      )}

      {/* Solo Start Game Overlay (Before Start button is clicked in solo) */}
      {!multiplayerRoom && !isSoloStarted && !gameResult && !isMultiplayerOpen && (
        <SoloStartOverlay
          stage={stage}
          stageName={currentStageConfig.name}
          initialTime={getStageInitialTime(stage)}
          totalLevels={totalLevelsInCurrentStage}
          bestScore={bestScore}
          onStart={handleSoloStart}
          onOpenMultiplayer={() => {
            setMultiplayerModalTab('create');
            setIsMultiplayerOpen(true);
          }}
          onOpenHistory={() => setIsHistoryOpen(true)}
          onOpenInfo={() => setIsInfoOpen(true)}
          historyCount={history.length}
        />
      )}

      {/* Eliminated Spectating Banner while other players are still competing */}
      {multiplayerRoom && multiplayerRoom.status === 'playing' && multiplayerRoom.players[myProfile.id]?.status === 'timeout' && !isMatchEndedModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[95] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#121318] border border-red-500/30 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
            <span className="text-4xl mb-2">⏰</span>
            <div className="text-red-400 font-extrabold text-[18px]">Your Time Ran Out!</div>
            <p className="text-white/70 text-[13px] mt-1 mb-4">
              You are eliminated. Waiting for final survivor...
            </p>
            <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 mb-4 text-left">
              <div className="text-[11px] font-bold uppercase text-white/50 tracking-wider mb-2">
                Survivors Competing:
              </div>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                {Object.values(multiplayerRoom.players)
                  .filter(p => p.status !== 'timeout')
                  .map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs text-white">
                      <span className="flex items-center gap-1.5">
                        <span>{p.avatar}</span>
                        <span className="font-semibold">{p.name}</span>
                      </span>
                      <span className="font-bold text-amber-400">{p.score.toLocaleString()} pts</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex items-center gap-2 w-full">
              <button
                onClick={() => {
                  multiplayerService.leaveRoom();
                  setMultiplayerRoom(null);
                  handleFullReset();
                }}
                className="flex-1 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 font-bold text-xs rounded-full transition-all active:scale-95 cursor-pointer"
              >
                Leave Room
              </button>
              <button
                onClick={() => setIsMultiplayerOpen(true)}
                className="flex-1 py-2.5 bg-white text-black font-bold text-xs rounded-full transition-all hover:bg-white/90 active:scale-95 shadow-md cursor-pointer"
              >
                Leaderboard ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multiplayer Final Survivor Match End Modal */}
      <MultiplayerMatchEndModal
        isOpen={isMatchEndedModalOpen}
        room={multiplayerRoom}
        currentPlayerId={myProfile.id}
        onRematch={handleRematch}
        onLeaveRoom={handleLeaveRoomFromMatchEnd}
      />
    </div>
  );
};

export default App;
