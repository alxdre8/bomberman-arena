import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/engine/Grid.js';
import { TileKind } from '../../src/engine/types.js';

describe('Grid', () => {
  it('expose les dimensions configurées', () => {
    const grid = new Grid({ width: 13, height: 11 });

    expect(grid.width).toBe(13);
    expect(grid.height).toBe(11);
  });

  it('démarre avec des cases vides', () => {
    const grid = new Grid({ width: 3, height: 3 });

    expect(grid.getCell({ x: 1, y: 1 })).toBe(TileKind.Empty);
  });

  it('rejette une construction aux dimensions invalides', () => {
    expect(() => new Grid({ width: 0, height: 5 })).toThrow();
  });

  it('détecte les positions hors limites', () => {
    const grid = new Grid({ width: 3, height: 3 });

    expect(grid.isValidPosition({ x: 0, y: 0 })).toBe(true);
    expect(grid.isValidPosition({ x: 3, y: 0 })).toBe(false);
    expect(grid.isValidPosition({ x: -1, y: 2 })).toBe(false);
  });

  it('ne considère comme praticables que les cases vides ou à bonus', () => {
    const grid = new Grid({ width: 3, height: 3 });
    grid.setCell({ x: 1, y: 0 }, TileKind.DestructibleWall);
    grid.setCell({ x: 2, y: 0 }, TileKind.Bonus);

    expect(grid.isWalkable({ x: 0, y: 0 })).toBe(true);
    expect(grid.isWalkable({ x: 1, y: 0 })).toBe(false);
    expect(grid.isWalkable({ x: 2, y: 0 })).toBe(true);
  });

  it('identifie les murs destructibles et indestructibles', () => {
    const grid = new Grid({ width: 3, height: 3 });
    grid.setCell({ x: 1, y: 0 }, TileKind.DestructibleWall);
    grid.setCell({ x: 2, y: 0 }, TileKind.IndestructibleWall);

    expect(grid.isDestructibleWall({ x: 1, y: 0 })).toBe(true);
    expect(grid.isIndestructibleWall({ x: 2, y: 0 })).toBe(true);
  });
});
