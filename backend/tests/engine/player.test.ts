import { describe, expect, it } from 'vitest';
import { Direction } from '../../src/engine/types.js';
import { Player } from '../../src/engine/Player.js';
import { PowerUp } from '../../src/engine/PowerUp.js';

describe('Player', () => {
  const makePlayer = () => new Player('p1', 'Alice', { x: 1, y: 1 });

  it('mémorise identité, nom et position de départ', () => {
    const player = makePlayer();

    expect(player.id).toBe('p1');
    expect(player.name).toBe('Alice');
    expect(player.position).toEqual({ x: 1, y: 1 });
    expect(player.isAlive).toBe(true);
  });

  it('calcule la position candidate dans chaque direction', () => {
    const player = makePlayer();

    expect(player.candidatePosition(Direction.Up)).toEqual({ x: 1, y: 0 });
    expect(player.candidatePosition(Direction.Down)).toEqual({ x: 1, y: 2 });
    expect(player.candidatePosition(Direction.Left)).toEqual({ x: 0, y: 1 });
    expect(player.candidatePosition(Direction.Right)).toEqual({ x: 2, y: 1 });
  });

  it('applique les bonus de bombe et de portée', () => {
    const player = makePlayer();

    player.applyPowerUp(PowerUp.ExtraBomb);
    player.applyPowerUp(PowerUp.IncreaseRange);

    expect(player.maxBombs).toBe(2);
    expect(player.bombRange).toBe(2);
    expect(player.powerUps).toContain(PowerUp.ExtraBomb);
  });

  it('peut mourir', () => {
    const player = makePlayer();

    player.die();

    expect(player.isAlive).toBe(false);
  });
});
