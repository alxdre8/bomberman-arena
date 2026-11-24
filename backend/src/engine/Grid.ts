import { TileKind } from './types.js';
import type { Position } from './types.js';

/** Options de construction d'une grille de jeu. */
export interface GridConfig {
  width: number;
  height: number;
}

/** Options de génération d'un terrain de jeu. */
export interface GridGenerationConfig extends GridConfig {
  /**
   * Probabilité (entre 0 et 1) qu'une case libre reçoive un mur destructible
   * (défaut : 0.7).
   */
  destructibleWallDensity?: number;
  /**
   * Générateur aléatoire renvoyant un nombre dans [0, 1[ (défaut : Math.random).
   * Injectable pour rendre la génération déterministe dans les tests.
   */
  random?: () => number;
}

/** Dimensions minimales d'un terrain généré (bordure + 3 cases jouables). */
export const MIN_GENERATED_SIZE = 5;

/** Dimensions par défaut d'un terrain de Bomberman classique. */
export const DEFAULT_GRID_WIDTH = 13;
export const DEFAULT_GRID_HEIGHT = 11;

const DEFAULT_DESTRUCTIBLE_WALL_DENSITY = 0.7;

/**
 * Grille de jeu Bomberman.
 *
 * Couche pure (aucune dépendance réseau) : la grille ne connaît que ses cases
 * et les règles de franchissabilité.
 *
 * - `new Grid(...)` crée une grille entièrement vide (utile pour les tests).
 * - `Grid.generate(...)` crée un terrain jouable : bordure et piliers
 *   indestructibles, murs destructibles aléatoires, coins de départ dégagés.
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

  /**
   * Génère un terrain de jeu classique :
   * - bordure de murs indestructibles ;
   * - piliers indestructibles sur les cases de coordonnées paires ;
   * - murs destructibles aléatoires sur les cases restantes ;
   * - zones de départ dégagées dans les 4 coins (case de spawn + 2 voisines),
   *   pour que chaque joueur puisse poser une bombe et s'abriter.
   *
   * @throws {Error} Si les dimensions sont paires, trop petites, ou si la
   *         densité n'est pas comprise entre 0 et 1.
   */
  static generate(config: GridGenerationConfig): Grid {
    const { width, height } = config;
    const density = config.destructibleWallDensity ?? DEFAULT_DESTRUCTIBLE_WALL_DENSITY;
    const random = config.random ?? Math.random;

    if (width < MIN_GENERATED_SIZE || height < MIN_GENERATED_SIZE) {
      throw new Error(
        `Un terrain généré doit mesurer au moins ${MIN_GENERATED_SIZE}x${MIN_GENERATED_SIZE}.`,
      );
    }
    if (width % 2 === 0 || height % 2 === 0) {
      throw new Error('Les dimensions d’un terrain généré doivent être impaires.');
    }
    if (density < 0 || density > 1) {
      throw new Error('La densité de murs destructibles doit être comprise entre 0 et 1.');
    }

    const grid = new Grid({ width, height });
    const safeCells = new Set(grid.getSpawnSafeZone().map(positionKey));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const position = { x, y };
        if (grid.isBorder(position) || (x % 2 === 0 && y % 2 === 0)) {
          grid.setCell(position, TileKind.IndestructibleWall);
        } else if (!safeCells.has(positionKey(position)) && random() < density) {
          grid.setCell(position, TileKind.DestructibleWall);
        }
      }
    }

    return grid;
  }

  /**
   * Points d'apparition des joueurs (les 4 coins jouables), dans l'ordre :
   * haut-gauche, bas-droite, haut-droite, bas-gauche. Cet ordre place les deux
   * premiers joueurs face à face sur la diagonale.
   */
  getSpawnPoints(): Position[] {
    const right = this.width - 2;
    const bottom = this.height - 2;
    return [
      { x: 1, y: 1 },
      { x: right, y: bottom },
      { x: right, y: 1 },
      { x: 1, y: bottom },
    ];
  }

  /** Renvoie la nature de la case demandée (position supposée valide). */
  getCell(position: Position): TileKind {
    return this.cells[position.y][position.x];
  }

  /** Remplace la nature d'une case (position supposée valide). */
  setCell(position: Position, kind: TileKind): void {
    this.cells[position.y][position.x] = kind;
  }

  /** Copie des cases de la grille (lignes = y, colonnes = x), pour la diffusion réseau. */
  toTiles(): TileKind[][] {
    return this.cells.map((row) => [...row]);
  }

  /** Vérifie que la position est dans les limites de la grille. */
  isValidPosition(position: Position): boolean {
    return (
      position.x >= 0 && position.x < this.width && position.y >= 0 && position.y < this.height
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

  /** Vrai si la case appartient au contour de la grille. */
  private isBorder(position: Position): boolean {
    return (
      position.x === 0 ||
      position.y === 0 ||
      position.x === this.width - 1 ||
      position.y === this.height - 1
    );
  }

  /** Cases à garder libres : chaque spawn et ses deux voisines vers l'intérieur. */
  private getSpawnSafeZone(): Position[] {
    return this.getSpawnPoints().flatMap((spawn) => {
      const dx = spawn.x === 1 ? 1 : -1;
      const dy = spawn.y === 1 ? 1 : -1;
      return [spawn, { x: spawn.x + dx, y: spawn.y }, { x: spawn.x, y: spawn.y + dy }];
    });
  }
}

function positionKey(position: Position): string {
  return `${position.x},${position.y}`;
}
