import type { PlayerId, Position } from './types.js';

/** Options de pose d'une bombe. */
export interface BombConfig {
  ownerId: PlayerId;
  position: Position;
  /** Horodatage (ms) de pose, base du compte à rebours. */
  plantedAt: number;
  /** Durée de la mèche en millisecondes (défaut : 3000). */
  fuseMs?: number;
  /** Portée de l'explosion en cases (défaut : 1). */
  range?: number;
}

const DEFAULT_FUSE_MS = 3000;
const DEFAULT_RANGE = 1;

/**
 * Bombe posée sur la grille.
 *
 * Le compte à rebours est volontairement basé sur une horloge injectée
 * (`plantedAt` + comparaison à `now`) afin de rester testable avec de faux
 * timers Vitest.
 */
export class Bomb {
  private static nextId = 0;

  readonly id: string;
  readonly ownerId: PlayerId;
  readonly position: Position;
  readonly plantedAt: number;
  readonly fuseMs: number;
  readonly range: number;

  constructor(config: BombConfig) {
    this.id = `bomb-${Bomb.nextId++}`;
    this.ownerId = config.ownerId;
    this.position = { ...config.position };
    this.plantedAt = config.plantedAt;
    this.fuseMs = config.fuseMs ?? DEFAULT_FUSE_MS;
    this.range = config.range ?? DEFAULT_RANGE;
  }

  /** Vrai si le temps de mèche est écoulé à l'instant donné. */
  hasExploded(now: number): boolean {
    return now - this.plantedAt >= this.fuseMs;
  }
}
