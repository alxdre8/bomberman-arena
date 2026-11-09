import { describe, expect, it } from 'vitest';
import { Game } from '../../src/engine/Game.js';
import { Player } from '../../src/engine/Player.js';
import { GameStatus } from '../../src/engine/types.js';

describe('Game - Pose de bombes (plantBomb)', () => {
  const createTestGame = () => {
    const player1 = new Player('p1', 'Alice', { x: 1, y: 1 });
    const player2 = new Player('p2', 'Bob', { x: 5, y: 5 });
    const game = new Game({
      grid: { width: 13, height: 11 },
      players: [player1, player2],
    });
    return { game, player1, player2 };
  };

  it('refuse de poser une bombe si la partie n’a pas démarré (statut Waiting)', () => {
    const { game, player1 } = createTestGame();
    expect(game.status).toBe(GameStatus.Waiting);

    const bomb = game.plantBomb(player1.id);
    expect(bomb).toBeNull();
    expect(game.bombs).toHaveLength(0);
  });

  it('pose avec succès une bombe sur la case du joueur quand la partie est Running', () => {
    const { game, player1 } = createTestGame();
    game.start();

    const bomb = game.plantBomb(player1.id);
    expect(bomb).not.toBeNull();
    expect(bomb?.ownerId).toBe(player1.id);
    expect(bomb?.position).toEqual({ x: 1, y: 1 });
    expect(bomb?.range).toBe(player1.bombRange);
    expect(game.bombs).toHaveLength(1);
    expect(game.hasBombAt({ x: 1, y: 1 })).toBe(true);
  });

  it('permet de spécifier une position valide pour la bombe', () => {
    const { game, player1 } = createTestGame();
    game.start();

    const bomb = game.plantBomb(player1.id, { x: 2, y: 1 });
    expect(bomb).not.toBeNull();
    expect(bomb?.position).toEqual({ x: 2, y: 1 });
    expect(game.hasBombAt({ x: 2, y: 1 })).toBe(true);
  });

  it('refuse de poser une bombe si le quota maxBombs est atteint', () => {
    const { game, player1 } = createTestGame();
    game.start();

    expect(player1.maxBombs).toBe(1);

    const firstBomb = game.plantBomb(player1.id, { x: 1, y: 1 });
    expect(firstBomb).not.toBeNull();

    // Deuxième bombe tentée sur une autre case alors que maxBombs = 1
    const secondBomb = game.plantBomb(player1.id, { x: 2, y: 1 });
    expect(secondBomb).toBeNull();
    expect(game.bombs).toHaveLength(1);
  });

  it('refuse de poser une bombe sur une case qui a déjà une bombe', () => {
    const { game, player1, player2 } = createTestGame();
    game.start();

    // Player 1 pose en (1, 1)
    const bomb1 = game.plantBomb(player1.id, { x: 1, y: 1 });
    expect(bomb1).not.toBeNull();

    // Player 2 tente de poser sur la même case (1, 1)
    const bomb2 = game.plantBomb(player2.id, { x: 1, y: 1 });
    expect(bomb2).toBeNull();
    expect(game.bombs).toHaveLength(1);
  });

  it('refuse de poser une bombe si le joueur est mort', () => {
    const { game, player1 } = createTestGame();
    game.start();
    player1.die();

    const bomb = game.plantBomb(player1.id);
    expect(bomb).toBeNull();
    expect(game.bombs).toHaveLength(0);
  });

  it('refuse de poser une bombe si le joueur est introuvable', () => {
    const { game } = createTestGame();
    game.start();

    const bomb = game.plantBomb('unknown_id');
    expect(bomb).toBeNull();
    expect(game.bombs).toHaveLength(0);
  });

  it('refuse de poser une bombe hors des limites de la grille', () => {
    const { game, player1 } = createTestGame();
    game.start();

    const bomb = game.plantBomb(player1.id, { x: -1, y: 0 });
    expect(bomb).toBeNull();

    const bombOutOfBounds = game.plantBomb(player1.id, { x: 99, y: 99 });
    expect(bombOutOfBounds).toBeNull();
  });

  it('libère le quota du joueur quand une bombe est retirée de la partie', () => {
    const { game, player1 } = createTestGame();
    game.start();

    const bomb1 = game.plantBomb(player1.id, { x: 1, y: 1 });
    expect(bomb1).not.toBeNull();

    // Retrait de la bombe (simulation de détonation)
    const removed = game.removeBomb(bomb1!.id);
    expect(removed).toBe(true);
    expect(game.hasBombAt({ x: 1, y: 1 })).toBe(false);
    expect(game.bombs).toHaveLength(0);

    // Le joueur peut à nouveau poser
    const bomb2 = game.plantBomb(player1.id, { x: 1, y: 1 });
    expect(bomb2).not.toBeNull();
    expect(game.bombs).toHaveLength(1);
  });
});
