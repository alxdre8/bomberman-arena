import { TileKind } from './types.js';
import type { Position } from './types.js';

/** Options de construction d'une grille de jeu. */
export interface GridConfig {
  width: number;
  height: number;
}

/**
 * Grille de jeu Bomberman.
 *
 * Couche pure (aucune dépendance réseau) : la grille ne connaît que ses cases
 * et les règles de franchissabilité. La génération du terrain (bordures, murs
 * destructibles, bonus) sera ajoutée lors de la Phase 2.
 */
export class Grid {
  private readonly cells: TileKind[][];

  readonly width: number;
  readonly height: number;

  constructor(config: GridConfig) {
    if (config.width <= 0 || config.height <= 0) {
      throw new Error('Les dimensions de la grille doivent être positives.');
    }
    this.width = config.width;
    this.height = config.height;
    this.cells = Array.from({ length: this.height }, () =>
      Array<TileKind>(this.width).fill(TileKind.Empty),
    );
  }

  /** Renvoie la nature de la case demandée (position supposée valide). */
  getCell(position: Position): TileKind {
    return this.cells[position.y][position.x];
  }

  /** Remplace la nature d'une case (position supposée valide). */
  setCell(position: Position, kind: TileKind): void {
    this.cells[position.y][position.x] = kind;
  }

  /** Vérifie que la position est dans les limites de la grille. */
  isValidPosition(position: Position): boolean {
    return (
      position.x >= 0 &&
      position.x < this.width &&
      position.y >= 0 &&
      position.y < this.height
    );
  }

  /** Une case est praticable si elle est vide ou contient un bonus. */
  isWalkable(position: Position): boolean {
    if (!this.isValidPosition(position)) return false;
    const kind = this.getCell(position);
    return kind === TileKind.Empty || kind === TileKind.Bonus;
  }

  /** Vrai si la case contient un mur destructible par une explosion. */
  isDestructibleWall(position: Position): boolean {
    if (!this.isValidPosition(position)) return false;
    return this.getCell(position) === TileKind.DestructibleWall;
  }

  /** Vrai si la case contient un mur indestructible (bordure ou pilier). */
  isIndestructibleWall(position: Position): boolean {
    if (!this.isValidPosition(position)) return false;
    return this.getCell(position) === TileKind.IndestructibleWall;
  }
}
