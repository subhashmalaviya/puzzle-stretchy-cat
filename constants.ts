/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const GAME_CONSTANTS = {
  // Treats (🐟)
  TREAT_MIN_LIFETIME_MS: 3500,
  TREAT_SCALE_FACTOR_MS: 100, 
  
  // Yarn (🧶)
  YARN_MIN_LIFETIME_MS: 3000,
  YARN_SCALE_FACTOR_MS: 100,

  // Collectible Expiring Behavior
  COLLECTIBLE_WARNING_TIME_MS: 3000,
  COLLECTIBLE_OSCILLATION_FREQ_HZ: 2, // Blinks per second when expiring
  
  // Game Timer
  INITIAL_TIME_SECONDS: 15,
  TREAT_TIME_BONUS_SECONDS: 5,
  
  // Scoring
  BASE_MOVE_SCORE: 10,
  TREAT_SCORE_BONUS: 0,
  YARN_SCORE_BONUS: 50,
  
  // Levels
  TOTAL_LEVELS: 12,
  BASE_GRID_SIZE: 4,
  MAX_GRID_SIZE: 7,
  LEVEL_WIN_DELAY_TIME_MS: 0,
  LEVEL_TRANSITION_TIME_MS: 400,

  // Level Generation Difficulty
  TARGET_DENSITY_BASE: 0.5,
  TARGET_DENSITY_INCREMENT: 0.03,
  TARGET_DENSITY_MAX: 0.9,
  
  // Collectible Limits
  MAX_COLLECTIBLES_PER_LEVEL: 3,
  WALLS_KILL_YOU: false,
};

/**
 * Calculates total levels for a given stage.
 * Stage 1: 12 levels
 * Every next stage increases by +2:
 * Stage 2: 14 levels
 * Stage 3: 16 levels
 * Stage 4: 18 levels
 * Stage 5: 20 levels ...
 */
export const getStageTotalLevels = (stage: number): number => {
  return 12 + Math.max(0, stage - 1) * 2;
};

/**
 * Initial continuous timer for starting a stage/run.
 * Starts tighter in higher stages for increased difficulty.
 */
export const getStageInitialTime = (stage: number): number => {
  if (stage <= 1) return 15;
  if (stage === 2) return 13;
  if (stage === 3) return 12;
  if (stage === 4) return 11;
  return 10;
};

/**
 * Seconds awarded on completing a level.
 * Decreases to 0s in higher stages so the continuous clock is relentless!
 */
export const getLevelWinBonusTime = (stage: number): number => {
  if (stage <= 1) return 2;
  if (stage === 2) return 1;
  return 0; // Stage 3+ awards 0s on level clear - must catch fish treats!
};

/**
 * Lifetime of collectible treats/yarn before vanishing.
 * Decays faster in higher stages.
 */
export const getTreatLifetimeMs = (stage: number): number => {
  return Math.max(1600, 3500 - (stage - 1) * 450);
};

export const STORAGE_KEYS = {
  BEST_SCORE: 'stretchy_cat_best_score',
  SCORE_HISTORY: 'stretchy_cat_score_history',
  PLAYER_PROFILE: 'stretchy_cat_player_profile',
  LAST_ROOM: 'stretchy_cat_last_room',
};