import type { Grid } from './Grid.js';
import type { Position } from './types.js';

/** Options de construction d'une explosion. */
export interface ExplosionConfig {
  origin: Position;
  range: number;
}

/** Vecteurs des 4 directions de propagation (haut, bas, gauche, droite). */
const DIRECTIONS: readonly Position[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

/**
 * Explosion issue d'une bombe.
 *
 * Règles de propagation (calcul pur, sans modifier la grille) :
 * - la case d'origine est toujours touchée ;
 * - le souffle part en croix sur `range` cases dans chaque direction ;
 * - un mur indestructible arrête le souffle (la case n'est pas touchée) ;
 * - un mur destructible est touché puis arrête le souffle ;
 * - le souffle s'arrête au bord de la grille.
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

  /** Liste des cases impactées : l'origine puis chaque branche de la croix. */
  computeAffectedCells(grid: Grid): Position[] {
    const cells: Position[] = [{ ...this.origin }];

    for (const direction of DIRECTIONS) {
      for (let distance = 1; distance <= this.range; distance++) {
        const cell = {
          x: this.origin.x + direction.x * distance,
          y: this.origin.y + direction.y * distance,
        };

        if (!grid.isValidPosition(cell) || grid.isIndestructibleWall(cell)) break;

        cells.push(cell);
        if (grid.isDestructibleWall(cell)) break;
      }
    }

    return cells;
  }
}
