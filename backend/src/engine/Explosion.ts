import type { Grid } from './Grid.js';
import type { Position } from './types.js';

/** Options de construction d'une explosion. */
export interface ExplosionConfig {
  origin: Position;
  range: number;
}

/**
 * Explosion issue d'une bombe.
 *
 * La propagation (cases touchées, arrêt par les murs indestructibles,
 * destruction des murs destructibles) sera calculée lors de la Phase 3.
 */
export class Explosion {
  readonly origin: Position;
  readonly range: number;

  constructor(config: ExplosionConfig) {
    if (config.range < 0) {
      throw new Error("La portée d'une explosion ne peut pas être négative.");
    }
    this.origin = { ...config.origin };
    this.range = config.range;
  }

  /**
   * Liste des cases impactées dans les 4 directions.
   *
   * @throws {Error} Tant que la propagation n'est pas implémentée (Phase 3).
   */
  computeAffectedCells(_grid: Grid): Position[] {
    throw new Error('Not implemented: propagation des explosions (Phase 3).');
  }
}
