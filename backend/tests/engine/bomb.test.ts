import { describe, expect, it } from 'vitest';
import { Bomb } from '../../src/engine/Bomb.js';

describe('Bomb', () => {
  it('applique les valeurs par défaut de mèche et de portée', () => {
    const bomb = new Bomb({
      ownerId: 'p1',
      position: { x: 2, y: 2 },
      plantedAt: 0,
    });

    expect(bomb.fuseMs).toBe(3000);
    expect(bomb.range).toBe(1);
    expect(bomb.ownerId).toBe('p1');
  });

  it("n'explose pas avant la fin de la mèche", () => {
    const bomb = new Bomb({ ownerId: 'p1', position: { x: 0, y: 0 }, plantedAt: 1000 });

    expect(bomb.hasExploded(3500)).toBe(false);
  });

  it('explose une fois la mèche écoulée', () => {
    const bomb = new Bomb({ ownerId: 'p1', position: { x: 0, y: 0 }, plantedAt: 1000 });

    expect(bomb.hasExploded(4500)).toBe(true);
  });
});
