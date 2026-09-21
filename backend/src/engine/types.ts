/** Coordonnées d'une case de la grille (exprimées en cases). */
export interface Position {
  x: number;
  y: number;
}

/** Direction d'un déplacement demandé par un joueur. */
export enum Direction {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right',
}

/** Nature d'une case de la grille. */
export enum TileKind {
  Empty = 'empty',
  IndestructibleWall = 'indestructible_wall',
  DestructibleWall = 'destructible_wall',
  Bonus = 'bonus',
}

/** Identifiant unique d'un joueur (côté moteur = id de la socket). */
export type PlayerId = string;

/** État courant d'un joueur, diffusé aux clients (image d'écran). */
export interface PlayerState {
  id: PlayerId;
  name: string;
  position: Position;
  alive: boolean;
  maxBombs: number;
  bombRange: number;
}

/** Cycle de vie d'une partie. */
export enum GameStatus {
  Waiting = 'waiting',
  Running = 'running',
  Finished = 'finished',
}
