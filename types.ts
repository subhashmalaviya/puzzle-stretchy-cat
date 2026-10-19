/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


export enum CellType {
  EMPTY = 'empty',
  START = 'start',
  // Hazards
  WATER = 'water',   // Resets path
  SOCK = 'sock',     // Slippery
  // Blockers
  COUCH = 'couch',
  PLANT = 'plant',
  BOX = 'box',
  // Collectibles
  TREAT = 'treat',   // Score boost
  YARN = 'yarn',     // Multiplier boost
  STAR = 'star',     // Rare bonus
  // Objectives
  SAUCER = 'saucer'
}

export interface Point {
  x: number;
  y: number;
}

export interface LevelData {
  id: number;
  stage: number;
  levelInStage: number;
  totalLevelsInStage: number;
  width: number;
  height: number;
  grid: CellType[][];
  startPoint: Point;
  targetCount: number;
  title: string;
  flavor: string;
  roomTheme: string;
}

export interface GameState {
  path: Point[];
  isWon: boolean;
  isDragging: boolean;
  score: number;
  levelStartScore: number;
  multiplier: number;
  treats: number;
  collectedItems: string[]; // Stores coordinates "x,y" of collected items
}

export interface ScoreHistoryEntry {
  id: string;
  score: number;
  stage: number;
  level: number;
  timestamp: number;
  reason: 'timeout' | 'reset' | 'stage_cleared' | 'victory';
}

export interface RoomPlayer {
  id: string;
  name: string;
  avatar: string;
  score: number;
  stage: number;
  level: number;
  status: 'waiting' | 'ready' | 'playing' | 'timeout' | 'reset' | 'won';
  isReady: boolean;
  lastActive: number;
  color: string;
}

export interface RoomState {
  id: string;
  createdAt: number;
  hostId: string;
  status: 'waiting' | 'countdown' | 'playing' | 'ended';
  endedBy?: string;
  countdownValue?: number;
  players: Record<string, RoomPlayer>;
}


export interface MultiplayerToastMsg {
  id: string;
  message: string;
  type: 'rank' | 'stage' | 'death' | 'info';
  timestamp: number;
}
