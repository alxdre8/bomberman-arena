import { describe, expect, it } from 'vitest';
import { GameStatus } from '../../src/engine/types.js';
import { Player } from '../../src/engine/Player.js';
import { Game } from '../../src/engine/Game.js';
import { Grid } from '../../src/engine/Grid.js';

describe('Game', () => {
  const makeGame = () => {
    const alice = new Player('p1', 'Alice', { x: 1, y: 1 });
    const bob = new Player('p2', 'Bob', { x: 11, y: 1 });
    return new Game({ grid: { width: 13, height: 11 }, players: [alice, bob] });
  };

  it('démarre en attente avec les joueurs fournis', () => {
    const game = makeGame();

    expect(game.status).toBe(GameStatus.Waiting);
    expect(game.players).toHaveLength(2);
  });

  it("passe en cours d'exécution au démarrage", () => {
    const game = makeGame();

    game.start();

    expect(game.status).toBe(GameStatus.Running);
  });

  it('refuse un double démarrage', () => {
    const game = makeGame();

    game.start();

    expect(() => game.start()).toThrow();
  });

  it('enregistre une bombe posée par un joueur', () => {
    const game = makeGame();
    game.start();

    const bomb = game.plantBomb('p1', { x: 1, y: 1 });

    expect(bomb?.ownerId).toBe('p1');
    expect(game.bombs).toHaveLength(1);
  });

  it('refuse une bombe pour un joueur inconnu', () => {
    const game = makeGame();
    game.start();

    expect(game.plantBomb('ghost', { x: 1, y: 1 })).toBeNull();
    expect(game.bombs).toHaveLength(0);
  });

  it('génère un terrain jouable à partir des dimensions', () => {
    const game = makeGame();
    const grid = game.gridView;

    expect(grid.width).toBe(13);
    expect(grid.height).toBe(11);
    expect(grid.isIndestructibleWall({ x: 0, y: 0 })).toBe(true);
    expect(grid.isIndestructibleWall({ x: 2, y: 2 })).toBe(true);
    for (const player of game.players) {
      expect(grid.isWalkable(player.position)).toBe(true);
    }
  });

  it('crée une partie en plaçant chaque joueur sur un coin libre', () => {
    const game = Game.create([
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
      { id: 'p3', name: 'Carol' },
      { id: 'p4', name: 'Dave' },
    ]);

    expect(game.status).toBe(GameStatus.Waiting);
    expect(game.gridView.width).toBe(13);
    expect(game.gridView.height).toBe(11);
    expect(game.players.map((p) => p.position)).toEqual(game.gridView.getSpawnPoints());
    for (const player of game.players) {
      expect(game.gridView.isWalkable(player.position)).toBe(true);
    }
    expect(game.getPlayer('p3')?.name).toBe('Carol');
  });

  it('refuse de créer une partie avec plus de joueurs que de coins', () => {
    const participants = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id }));

    expect(() => Game.create(participants)).toThrow();
  });

  it('expose un état sérialisable des joueurs', () => {
    const game = Game.create([{ id: 'p1', name: 'Alice' }]);

    expect(game.players[0].toState()).toEqual({
      id: 'p1',
      name: 'Alice',
      position: { x: 1, y: 1 },
      alive: true,
      maxBombs: 1,
      bombRange: 1,
    });
  });

  it('utilise telle quelle une grille fournie', () => {
    const grid = new Grid({ width: 3, height: 3 });
    const game = new Game({ grid, players: [] });

    expect(game.gridView).toBe(grid);
  });
});
