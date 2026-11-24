import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/engine/Grid.js';
import { TileKind } from '../../src/engine/types.js';
import type { Position } from '../../src/engine/types.js';

const WIDTH = 13;
const HEIGHT = 11;

/** Toujours 0 < densité : chaque case libre candidate reçoit un mur. */
const alwaysWall = () => 0;
/** Toujours ≥ densité : aucune case ne reçoit de mur destructible. */
const neverWall = () => 0.999;

function allPositions(grid: Grid): Position[] {
  const positions: Position[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      positions.push({ x, y });
    }
  }
  return positions;
}

/** Cases atteignables à pied depuis `start` (parcours en largeur). */
function reachableFrom(grid: Grid, start: Position): Set<string> {
  const seen = new Set<string>([`${start.x},${start.y}`]);
  const queue = [start];
  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    for (const next of [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ]) {
      const key = `${next.x},${next.y}`;
      if (!seen.has(key) && grid.isWalkable(next)) {
        seen.add(key);
        queue.push(next);
      }
    }
  }
  return seen;
}

describe('Grid.generate', () => {
  it('produit une grille aux dimensions demandées', () => {
    const grid = Grid.generate({ width: WIDTH, height: HEIGHT });

    expect(grid.width).toBe(WIDTH);
    expect(grid.height).toBe(HEIGHT);
  });

  it('entoure le terrain de murs indestructibles', () => {
    const grid = Grid.generate({ width: WIDTH, height: HEIGHT, random: neverWall });

    for (let x = 0; x < WIDTH; x++) {
      expect(grid.isIndestructibleWall({ x, y: 0 })).toBe(true);
      expect(grid.isIndestructibleWall({ x, y: HEIGHT - 1 })).toBe(true);
    }
    for (let y = 0; y < HEIGHT; y++) {
      expect(grid.isIndestructibleWall({ x: 0, y })).toBe(true);
      expect(grid.isIndestructibleWall({ x: WIDTH - 1, y })).toBe(true);
    }
  });

  it('place un pilier indestructible sur chaque case de coordonnées paires', () => {
    const grid = Grid.generate({ width: WIDTH, height: HEIGHT, random: neverWall });

    for (const position of allPositions(grid)) {
      const isPillar = position.x % 2 === 0 && position.y % 2 === 0;
      if (isPillar) {
        expect(grid.isIndestructibleWall(position)).toBe(true);
      }
    }
    // Case intérieure impaire/impaire : jamais un pilier.
    expect(grid.getCell({ x: 3, y: 3 })).toBe(TileKind.Empty);
  });

  it('ne génère que bordure + piliers quand la densité est nulle', () => {
    const grid = Grid.generate({ width: WIDTH, height: HEIGHT, destructibleWallDensity: 0 });

    const destructibles = allPositions(grid).filter((p) => grid.isDestructibleWall(p));
    expect(destructibles).toHaveLength(0);
  });

  it('remplit toutes les cases libres hors zones de départ quand la densité vaut 1', () => {
    const grid = Grid.generate({ width: WIDTH, height: HEIGHT, destructibleWallDensity: 1 });

    const empties = allPositions(grid).filter((p) => grid.getCell(p) === TileKind.Empty);
    // 4 coins × (spawn + 2 voisines)
    expect(empties).toHaveLength(12);
  });

  it('garde chaque spawn et ses deux voisines libres, même avec un mur partout', () => {
    const grid = Grid.generate({ width: WIDTH, height: HEIGHT, random: alwaysWall });

    const expectedFree: Position[] = [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 },
      { x: 11, y: 9 }, { x: 10, y: 9 }, { x: 11, y: 8 },
      { x: 11, y: 1 }, { x: 10, y: 1 }, { x: 11, y: 2 },
      { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 1, y: 8 },
    ]; // prettier-ignore
    for (const position of expectedFree) {
      expect(grid.isWalkable(position)).toBe(true);
    }
  });

  it("n'utilise que des murs destructibles hors bordure et piliers", () => {
    const grid = Grid.generate({ width: WIDTH, height: HEIGHT, random: alwaysWall });

    expect(grid.getCell({ x: 3, y: 1 })).toBe(TileKind.DestructibleWall);
    expect(grid.getCell({ x: 5, y: 5 })).toBe(TileKind.DestructibleWall);
  });

  it('rend toutes les cases libres atteignables depuis un spawn sans mur destructible', () => {
    const grid = Grid.generate({ width: WIDTH, height: HEIGHT, random: neverWall });

    const reachable = reachableFrom(grid, { x: 1, y: 1 });
    const walkable = allPositions(grid).filter((p) => grid.isWalkable(p));
    expect(reachable.size).toBe(walkable.length);
  });

  it('est déterministe pour un même générateur aléatoire', () => {
    const seeded = () => {
      let seed = 42;
      return () => {
        seed = (seed * 1103515245 + 12345) % 2 ** 31;
        return seed / 2 ** 31;
      };
    };

    const a = Grid.generate({ width: WIDTH, height: HEIGHT, random: seeded() });
    const b = Grid.generate({ width: WIDTH, height: HEIGHT, random: seeded() });

    expect(a.toTiles()).toEqual(b.toTiles());
  });

  it.each([
    { width: 3, height: 11 },
    { width: 13, height: 4 },
    { width: 12, height: 11 },
    { width: 13, height: 10 },
  ])('rejette les dimensions invalides $width x $height', (dimensions) => {
    expect(() => Grid.generate(dimensions)).toThrow();
  });

  it.each([-0.1, 1.5])('rejette une densité hors [0, 1] (%s)', (density) => {
    expect(() =>
      Grid.generate({ width: WIDTH, height: HEIGHT, destructibleWallDensity: density }),
    ).toThrow();
  });

  it('fonctionne sur la plus petite grille autorisée (5x5)', () => {
    const grid = Grid.generate({ width: 5, height: 5, random: alwaysWall });

    for (const spawn of grid.getSpawnPoints()) {
      expect(grid.isWalkable(spawn)).toBe(true);
    }
  });
});

describe('Grid.getSpawnPoints', () => {
  it('renvoie les 4 coins jouables, les deux premiers en diagonale', () => {
    const grid = new Grid({ width: WIDTH, height: HEIGHT });

    expect(grid.getSpawnPoints()).toEqual([
      { x: 1, y: 1 },
      { x: 11, y: 9 },
      { x: 11, y: 1 },
      { x: 1, y: 9 },
    ]);
  });
});

describe('Grid.toTiles', () => {
  it('renvoie une copie indépendante des cases', () => {
    const grid = new Grid({ width: 3, height: 3 });

    const tiles = grid.toTiles();
    tiles[0][0] = TileKind.DestructibleWall;

    expect(tiles).toHaveLength(3);
    expect(tiles[0]).toHaveLength(3);
    expect(grid.getCell({ x: 0, y: 0 })).toBe(TileKind.Empty);
  });
});
