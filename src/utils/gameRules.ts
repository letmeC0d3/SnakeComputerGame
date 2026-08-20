export interface Position {
  x: number;
  y: number;
}

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export const GRID_SIZE = {
  width: 20,
  height: 25,
};

export const INITIAL_SPEED = 150; // ms per tick
export const MIN_SPEED = 50; // ms per tick
export const SPEED_DECREMENT = 2; // speed-up per food eaten

export const STARTING_POSITION: Position = { x: 10, y: 12 };
export const STARTING_DIRECTION: Direction = "RIGHT";

export const POINTS_PER_FOOD = 10;
export const MAX_SUBMITTABLE_SCORE = 50000;
