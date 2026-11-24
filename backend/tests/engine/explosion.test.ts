import { describe, expect, it } from 'vitest';
import { Explosion } from '../../src/engine/Explosion.js';
import { Grid } from '../../src/engine/Grid.js';
import { TileKind, type Position } from '../../src/engine/types.js';

const sortCells = (cells: Position[]) => [...cells].sort((a, b) => a.y - b.y || a.x - b.x);

describe('Explosion', () => {
  it("mémorise l'origine et la portée", () => {
    const explosion = new Explosion({ origin: { x: 4, y: 4 }, range: 2 });

    expect(explosion.origin).toEqual({ x: 4, y: 4 });
    expect(explosion.range).toBe(2);
  });

  it('rejette une portée négative', () => {
    expect(() => new Explosion({ origin: { x: 0, y: 0 }, range: -1 })).toThrow();
  });

  it("ne touche que l'origine avec une portée nulle", () => {
    const grid = new Grid({ width: 5, height: 5 });
    const explosion = new Explosion({ origin: { x: 2, y: 2 }, range: 0 });

    expect(explosion.computeAffectedCells(grid)).toEqual([{ x: 2, y: 2 }]);
  });

  it('se propage en croix sur toute sa portée dans une grille vide', () => {
    const grid = new Grid({ width: 7, height: 7 });
    const explosion = new Explosion({ origin: { x: 3, y: 3 }, range: 2 });

    expect(sortCells(explosion.computeAffectedCells(grid))).toEqual(
      sortCells([
        { x: 3, y: 3 },
        { x: 3, y: 2 },
        { x: 3, y: 1 },
        { x: 3, y: 4 },
        { x: 3, y: 5 },
        { x: 2, y: 3 },
        { x: 1, y: 3 },
        { x: 4, y: 3 },
        { x: 5, y: 3 },
      ]),
    );
  });

  it("s'arrête au bord de la grille", () => {
    const grid = new Grid({ width: 3, height: 3 });
    const explosion = new Explosion({ origin: { x: 0, y: 0 }, range: 5 });

    expect(sortCells(explosion.computeAffectedCells(grid))).toEqual(
      sortCells([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
      ]),
    );
  });

  it("est arrêtée par un mur indestructible, qui n'est pas touché", () => {
    const grid = new Grid({ width: 7, height: 7 });
    grid.setCell({ x: 4, y: 3 }, TileKind.IndestructibleWall);
    const explosion = new Explosion({ origin: { x: 3, y: 3 }, range: 3 });

    const cells = explosion.computeAffectedCells(grid);

    expect(cells).not.toContainEqual({ x: 4, y: 3 });
    expect(cells).not.toContainEqual({ x: 5, y: 3 });
  });

  it('touche un mur destructible puis s’arrête', () => {
    const grid = new Grid({ width: 7, height: 7 });
    grid.setCell({ x: 3, y: 1 }, TileKind.DestructibleWall);
    const explosion = new Explosion({ origin: { x: 3, y: 3 }, range: 3 });

    const cells = explosion.computeAffectedCells(grid);

    expect(cells).toContainEqual({ x: 3, y: 2 });
    expect(cells).toContainEqual({ x: 3, y: 1 });
    expect(cells).not.toContainEqual({ x: 3, y: 0 });
  });

  it('ne modifie pas la grille', () => {
    const grid = new Grid({ width: 5, height: 5 });
    grid.setCell({ x: 2, y: 1 }, TileKind.DestructibleWall);
    const before = grid.toTiles();

    new Explosion({ origin: { x: 2, y: 2 }, range: 2 }).computeAffectedCells(grid);

    expect(grid.toTiles()).toEqual(before);
  });
});
