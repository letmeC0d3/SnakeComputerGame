import {
  GRID_SIZE,
  STARTING_POSITION,
  STARTING_DIRECTION,
  INITIAL_SPEED,
  MIN_SPEED,
  SPEED_DECREMENT,
  Position,
  Direction,
} from "./gameRules";

export interface DailyChallengeConfig {
  seed: number;
  gridSize: { width: number; height: number };
  startingPosition: Position;
  startingDirection: Direction;
  speedProfile: {
    initial: number;
    min: number;
    decrement: number;
  };
}

/**
 * Returns the single source of truth configuration for the Daily Challenge
 * based on the provided UTC date string (YYYY-MM-DD).
 */
export function getDailyChallenge(dateString: string): DailyChallengeConfig {
  // Generate a standard hash of the date string to use as the seed
  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed = (seed * 31 + dateString.charCodeAt(i)) | 0;
  }

  // Ensure positive integer for seed
  const absoluteSeed = Math.abs(seed) || 12345;

  return {
    seed: absoluteSeed,
    gridSize: GRID_SIZE,
    startingPosition: STARTING_POSITION,
    startingDirection: STARTING_DIRECTION,
    speedProfile: {
      initial: INITIAL_SPEED,
      min: MIN_SPEED,
      decrement: SPEED_DECREMENT,
    },
  };
}
