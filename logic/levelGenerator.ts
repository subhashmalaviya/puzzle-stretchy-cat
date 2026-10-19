/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { CellType, Point, LevelData } from '../types';
import { GAME_CONSTANTS, getStageTotalLevels } from '../constants';

export interface StageConfig {
  name: string;
  flavor: string;
  themeColor: string;
  baseSize: number;
  maxSize: number;
  densityBase: number;
  densityIncrement: number;
  maxDensity: number;
  waterCount: number;
}

export const STAGE_CONFIGS: Record<number, StageConfig> = {
  1: {
    name: "Living Room",
    flavor: "A cozy stretch on soft rugs. Watch out for spills in later rooms!",
    themeColor: "#FBBC04", // Amber
    baseSize: 4,
    maxSize: 6,
    densityBase: 0.50,
    densityIncrement: 0.02,
    maxDensity: 0.74,
    waterCount: 1,
  },
  2: {
    name: "Kitchen Counter",
    flavor: "Watch out for water spills on the slick tiles!",
    themeColor: "#4285F4", // Google Blue
    baseSize: 5,
    maxSize: 7,
    densityBase: 0.56,
    densityIncrement: 0.018,
    maxDensity: 0.80,
    waterCount: 3,
  },
  3: {
    name: "Dusty Attic",
    flavor: "Tricky cardboard boxes and winding obstacle courses.",
    themeColor: "#BB55A1", // Purple
    baseSize: 5,
    maxSize: 7,
    densityBase: 0.60,
    densityIncrement: 0.016,
    maxDensity: 0.85,
    waterCount: 4,
  },
  4: {
    name: "Botanical Sunroom",
    flavor: "Leafy plants, water puddles, and twisting pathways.",
    themeColor: "#38A852", // Green
    baseSize: 6,
    maxSize: 7,
    densityBase: 0.65,
    densityIncrement: 0.014,
    maxDensity: 0.89,
    waterCount: 5,
  },
  5: {
    name: "Royal Cat Palace",
    flavor: "The ultimate labyrinth for feline agility champions!",
    themeColor: "#EA4335", // Red
    baseSize: 6,
    maxSize: 7,
    densityBase: 0.70,
    densityIncrement: 0.012,
    maxDensity: 0.92,
    waterCount: 6,
  }
};


export const getStageConfig = (stage: number): StageConfig => {
  if (STAGE_CONFIGS[stage]) return STAGE_CONFIGS[stage];
  const colors = ["#4285F4", "#BB55A1", "#EA4335", "#FBBC04", "#38A852"];
  const themeColor = colors[(stage - 1) % colors.length];
  return {
    name: `Master Realm ${stage}`,
    flavor: `Transcendent agility! An infinite realm for master stretchy cats.`,
    themeColor,
    baseSize: 6,
    maxSize: 7,
    densityBase: Math.min(0.70, 0.62 + (stage - 5) * 0.02),
    densityIncrement: 0.012,
    maxDensity: 0.92,
    waterCount: Math.min(6, 4 + (stage - 5)),
  };
};

/**
 * Generates a level by first constructing a Hamiltonian path on a subset of the grid.
 * Supports multiple stages, with +2 levels per subsequent stage and increased difficulty.
 */
export const generateLevel = (stageOrLevel: number, levelInStageParam?: number): LevelData => {
  const stage = levelInStageParam !== undefined ? stageOrLevel : 1;
  const levelInStage = levelInStageParam !== undefined ? levelInStageParam : stageOrLevel;
  const totalLevels = getStageTotalLevels(stage);
  const config = getStageConfig(stage);

  // Progressive grid size based on level inside the stage
  const growth = Math.floor(((levelInStage - 1) / totalLevels) * (config.maxSize - config.baseSize + 0.99));
  const width = Math.min(config.maxSize, config.baseSize + growth);
  const height = width;

  // Higher level & higher stage = more dense path
  const targetDensity = Math.min(
    config.maxDensity,
    config.densityBase + (levelInStage * config.densityIncrement)
  );
  const targetLength = Math.max(4, Math.floor(width * height * targetDensity));

  let attempts = 0;
  while (attempts < 200) {
    attempts++;

    const grid: CellType[][] = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => CellType.BOX)
    );

    const startPoint: Point = {
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height)
    };

    const path: Point[] = [startPoint];
    const visited = new Set<string>([`${startPoint.x},${startPoint.y}`]);

    // Randomized DFS to find a path of targetLength
    const findPath = (curr: Point): boolean => {
      if (path.length === targetLength) return true;

      const neighbors = [
        { x: curr.x + 1, y: curr.y },
        { x: curr.x - 1, y: curr.y },
        { x: curr.x, y: curr.y + 1 },
        { x: curr.x, y: curr.y - 1 }
      ].filter(n =>
        n.x >= 0 && n.x < width && n.y >= 0 && n.y < height &&
        !visited.has(`${n.x},${n.y}`)
      );

      // Shuffle neighbors for variety
      for (let i = neighbors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
      }

      for (const next of neighbors) {
        visited.add(`${next.x},${next.y}`);
        path.push(next);
        if (findPath(next)) return true;
        path.pop();
        visited.delete(`${next.x},${next.y}`);
      }

      return false;
    };

    if (findPath(startPoint)) {
      // 1. Mark path cells in grid
      path.forEach((p, idx) => {
        if (idx === 0) {
          grid[p.y][p.x] = CellType.START;
        } else if (idx === path.length - 1) {
          grid[p.y][p.x] = CellType.SAUCER;
        } else {
          grid[p.y][p.x] = CellType.EMPTY;
        }
      });

      // 2. Scatter collectibles on the path
      let collectiblesPlaced = 0;
      const pathIndices = Array.from({ length: path.length - 2 }, (_, i) => i + 1);
      for (let i = pathIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pathIndices[i], pathIndices[j]] = [pathIndices[j], pathIndices[i]];
      }

      for (const idx of pathIndices) {
        if (collectiblesPlaced >= GAME_CONSTANTS.MAX_COLLECTIBLES_PER_LEVEL) break;

        if (Math.random() < 0.25) {
          const p = path[idx];
          const rand = Math.random();
          if (stage >= 3 && rand < 0.15) {
            grid[p.y][p.x] = CellType.STAR;
          } else if (rand < 0.45) {
            grid[p.y][p.x] = CellType.YARN;
          } else {
            grid[p.y][p.x] = CellType.TREAT;
          }
          collectiblesPlaced++;
        }
      }

      // 3. Decorate non-path cells with variety and hazards
      const nonPathCoords: Point[] = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!visited.has(`${x},${y}`)) {
            nonPathCoords.push({ x, y });
          }
        }
      }

      // Shuffle non-path coords
      for (let i = nonPathCoords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nonPathCoords[i], nonPathCoords[j]] = [nonPathCoords[j], nonPathCoords[i]];
      }

      // Water hazards (cat hates water - stepping on water restarts level!)
      const maxWater = (stage === 1 && levelInStage <= 6) ? 0 : config.waterCount;
      const waterToPlace = Math.min(maxWater, Math.floor(nonPathCoords.length * 0.45));
      for (let i = 0; i < waterToPlace; i++) {
        const pt = nonPathCoords[i];
        grid[pt.y][pt.x] = CellType.WATER;
      }

      // Remaining non-path cells become theme-appropriate blockers
      for (let i = waterToPlace; i < nonPathCoords.length; i++) {
        const pt = nonPathCoords[i];
        if (stage === 1) {
          grid[pt.y][pt.x] = Math.random() < 0.6 ? CellType.BOX : CellType.COUCH;
        } else if (stage === 2) {
          grid[pt.y][pt.x] = Math.random() < 0.5 ? CellType.BOX : CellType.COUCH;
        } else if (stage === 3) {
          grid[pt.y][pt.x] = Math.random() < 0.4 ? CellType.BOX : Math.random() < 0.5 ? CellType.COUCH : CellType.PLANT;
        } else if (stage === 4) {
          grid[pt.y][pt.x] = Math.random() < 0.6 ? CellType.PLANT : CellType.BOX;
        } else {
          const blockers = [CellType.BOX, CellType.COUCH, CellType.PLANT];
          grid[pt.y][pt.x] = blockers[Math.floor(Math.random() * blockers.length)];
        }
      }

      return {
        id: levelInStage,
        stage,
        levelInStage,
        totalLevelsInStage: totalLevels,
        width,
        height,
        grid,
        startPoint,
        targetCount: path.length,
        title: `${config.name} — Level ${levelInStage}/${totalLevels}`,
        flavor: levelInStage === totalLevels ? `Final level of Stage ${stage}: ${config.name}! Stretch to the saucer!` : config.flavor,
        roomTheme: config.themeColor
      };
    }
  }

  // Fallback (simple 4x4)
  return {
    id: levelInStage,
    stage,
    levelInStage,
    totalLevelsInStage: totalLevels,
    width: 4,
    height: 4,
    grid: [
      [CellType.START, CellType.EMPTY, CellType.EMPTY, CellType.EMPTY],
      [CellType.BOX, CellType.BOX, CellType.BOX, CellType.EMPTY],
      [CellType.EMPTY, CellType.EMPTY, CellType.EMPTY, CellType.EMPTY],
      [CellType.EMPTY, CellType.SAUCER, CellType.BOX, CellType.BOX]
    ],
    startPoint: { x: 0, y: 0 },
    targetCount: 9,
    title: `${config.name} — Level ${levelInStage}/${totalLevels}`,
    flavor: config.flavor,
    roomTheme: config.themeColor
  };
};
