import { describe, expect, it } from 'vitest';
import { Game, type GameRules } from '../../src/engine/Game.js';
import { Grid } from '../../src/engine/Grid.js';
import { Player } from '../../src/engine/Player.js';
import { PowerUp } from '../../src/engine/PowerUp.js';
import { Direction, GameStatus, TileKind } from '../../src/engine/types.js';

const FUSE = 3000;

/**
 * Partie sur une grille vide 9x9 (sans bordure), entièrement contrôlée :
 * pas de bonus par défaut, horloge passée explicitement.
 */
const makeGame = (positions: Record<string, { x: number; y: number }>, rules: GameRules = {}) => {
  const grid = new Grid({ width: 9, height: 9 });
  const players = Object.entries(positions).map(([id, pos]) => new Player(id, id, pos));
  const game = new Game({ grid, players, powerUpDropRate: 0, ...rules });
  game.start();
  return { game, grid };
};

describe('Game.update — explosions', () => {
  it("ne fait rien tant que la mèche n'est pas écoulée", () => {
    const { game } = makeGame({ a: { x: 1, y: 1 }, b: { x: 7, y: 7 } });
    game.plantBomb('a', undefined, 0);

    const result = game.update(FUSE - 1);

    expect(result.explosions).toEqual([]);
    expect(game.bombs).toHaveLength(1);
  });

  it('fait exploser la bombe à la fin de la mèche et la retire', () => {
    const { game } = makeGame({ a: { x: 1, y: 1 }, b: { x: 7, y: 7 } });
    const bomb = game.plantBomb('a', { x: 4, y: 4 }, 0)!;

    const result = game.update(FUSE);

    expect(result.explosions).toHaveLength(1);
    expect(result.explosions[0]).toMatchObject({
      bombId: bomb.id,
      ownerId: 'a',
      origin: { x: 4, y: 4 },
    });
    expect(result.explosions[0].affectedCells).toContainEqual({ x: 4, y: 5 });
    expect(game.bombs).toHaveLength(0);
  });

  it('rend la bombe au joueur après explosion (quota libéré)', () => {
    const { game } = makeGame({ a: { x: 1, y: 1 }, b: { x: 7, y: 7 } });
    game.plantBomb('a', { x: 4, y: 4 }, 0);
    expect(game.plantBomb('a', { x: 5, y: 5 }, 0)).toBeNull();

    game.update(FUSE);

    expect(game.plantBomb('a', { x: 5, y: 5 }, FUSE)).not.toBeNull();
  });

  it('déclenche les bombes touchées en réaction en chaîne dans le même tick', () => {
    const { game } = makeGame({ a: { x: 1, y: 1 }, b: { x: 7, y: 7 } });
    game.plantBomb('a', { x: 4, y: 4 }, 0);
    // Bombe de b posée plus tard : sa mèche n'est pas écoulée, mais elle est soufflée.
    game.plantBomb('b', { x: 5, y: 4 }, 2000);

    const result = game.update(FUSE);

    expect(result.explosions.map((e) => e.origin)).toEqual([
      { x: 4, y: 4 },
      { x: 5, y: 4 },
    ]);
    expect(game.bombs).toHaveLength(0);
  });

  it('détruit les murs destructibles touchés', () => {
    const { game, grid } = makeGame({ a: { x: 1, y: 1 }, b: { x: 7, y: 7 } });
    grid.setCell({ x: 4, y: 3 }, TileKind.DestructibleWall);
    game.plantBomb('a', { x: 4, y: 4 }, 0);

    const result = game.update(FUSE);

    expect(result.destroyedWalls).toEqual([{ x: 4, y: 3 }]);
    expect(grid.getCell({ x: 4, y: 3 })).toBe(TileKind.Empty);
  });

  it('ne détruit pas les murs indestructibles', () => {
    const { game, grid } = makeGame({ a: { x: 1, y: 1 }, b: { x: 7, y: 7 } });
    grid.setCell({ x: 4, y: 3 }, TileKind.IndestructibleWall);
    game.plantBomb('a', { x: 4, y: 4 }, 0);

    game.update(FUSE);

    expect(grid.getCell({ x: 4, y: 3 })).toBe(TileKind.IndestructibleWall);
  });
});

describe('Game.update — morts et fin de partie', () => {
  it('tue un joueur présent dans le souffle', () => {
    const { game } = makeGame({ a: { x: 1, y: 1 }, b: { x: 4, y: 5 }, c: { x: 7, y: 7 } });
    game.plantBomb('a', { x: 4, y: 4 }, 0);

    const result = game.update(FUSE);

    expect(result.killedPlayerIds).toEqual(['b']);
    expect(game.getPlayer('b')?.isAlive).toBe(false);
    expect(game.status).toBe(GameStatus.Running);
  });

  it('épargne un joueur abrité derrière un mur', () => {
    const { game, grid } = makeGame({ a: { x: 1, y: 1 }, b: { x: 4, y: 6 } });
    grid.setCell({ x: 4, y: 5 }, TileKind.IndestructibleWall);
    game.plantBomb('a', { x: 4, y: 4 }, 0);

    const result = game.update(FUSE);

    expect(result.killedPlayerIds).toEqual([]);
  });

  it('tue le poseur resté sur sa bombe', () => {
    const { game } = makeGame({ a: { x: 4, y: 4 }, b: { x: 7, y: 7 }, c: { x: 1, y: 7 } });
    game.plantBomb('a', undefined, 0);

    const result = game.update(FUSE);

    expect(result.killedPlayerIds).toEqual(['a']);
  });

  it('déclare vainqueur le dernier survivant', () => {
    const { game } = makeGame({ a: { x: 1, y: 1 }, b: { x: 4, y: 5 } });
    game.plantBomb('a', { x: 4, y: 4 }, 0);

    const result = game.update(FUSE);

    expect(result.ended).toBe(true);
    expect(game.status).toBe(GameStatus.Finished);
    expect(game.winnerId).toBe('a');
  });

  it('déclare un match nul si tous les joueurs meurent ensemble', () => {
    const { game } = makeGame({ a: { x: 4, y: 4 }, b: { x: 4, y: 5 } });
    game.plantBomb('a', undefined, 0);

    const result = game.update(FUSE);

    expect(result.ended).toBe(true);
    expect(game.winnerId).toBeNull();
  });

  it("n'évolue plus une fois la partie terminée", () => {
    const { game } = makeGame({ a: { x: 1, y: 1 }, b: { x: 4, y: 5 } });
    game.plantBomb('a', { x: 4, y: 4 }, 0);
    game.update(FUSE);

    expect(game.plantBomb('a', { x: 2, y: 2 }, FUSE)).toBeNull();
    expect(game.movePlayer('a', Direction.Right, FUSE)).toBeNull();
    expect(game.update(FUSE * 2).explosions).toEqual([]);
  });

  it("élimine un joueur (déconnexion) et termine la partie s'il n'en reste qu'un", () => {
    const { game } = makeGame({ a: { x: 1, y: 1 }, b: { x: 7, y: 7 } });

    expect(game.eliminatePlayer('b')).toBe(true);
    expect(game.eliminatePlayer('b')).toBe(false);
    expect(game.status).toBe(GameStatus.Finished);
    expect(game.winnerId).toBe('a');
  });
});

describe('Game.movePlayer', () => {
  it('déplace le joueur sur une case libre', () => {
    const { game } = makeGame({ a: { x: 1, y: 1 }, b: { x: 7, y: 7 } });

    expect(game.movePlayer('a', Direction.Right, 0)).toEqual({ position: { x: 2, y: 1 } });
    expect(game.getPlayer('a')?.position).toEqual({ x: 2, y: 1 });
  });

  it('refuse un mur, la sortie de grille ou une bombe', () => {
    const { game, grid } = makeGame({ a: { x: 0, y: 0 }, b: { x: 7, y: 7 } });
    grid.setCell({ x: 1, y: 0 }, TileKind.DestructibleWall);
    game.plantBomb('b', { x: 0, y: 1 }, 0);

    expect(game.movePlayer('a', Direction.Up, 0)).toBeNull();
    expect(game.movePlayer('a', Direction.Right, 0)).toBeNull();
    expect(game.movePlayer('a', Direction.Down, 0)).toBeNull();
  });

  it('permet de quitter la case de sa propre bombe', () => {
    const { game } = makeGame({ a: { x: 4, y: 4 }, b: { x: 7, y: 7 } });
    game.plantBomb('a', undefined, 0);

    expect(game.movePlayer('a', Direction.Left, 0)).not.toBeNull();
  });

  it('limite la cadence des déplacements', () => {
    const { game } = makeGame({ a: { x: 1, y: 1 }, b: { x: 7, y: 7 } });
    const delay = game.getPlayer('a')!.moveDelayMs;

    expect(game.movePlayer('a', Direction.Right, 1000)).not.toBeNull();
    expect(game.movePlayer('a', Direction.Right, 1000 + delay - 1)).toBeNull();
    expect(game.movePlayer('a', Direction.Right, 1000 + delay)).not.toBeNull();
  });
});

describe('Bonus', () => {
  it("fait apparaître un bonus à la place d'un mur détruit", () => {
    // random() : 0 → sous le taux d'apparition, puis 0 → premier type de bonus.
    const { game, grid } = makeGame(
      { a: { x: 1, y: 1 }, b: { x: 7, y: 7 } },
      { powerUpDropRate: 1, random: () => 0 },
    );
    grid.setCell({ x: 4, y: 3 }, TileKind.DestructibleWall);
    game.plantBomb('a', { x: 4, y: 4 }, 0);

    const result = game.update(FUSE);

    expect(result.droppedPowerUps).toEqual([{ position: { x: 4, y: 3 }, kind: PowerUp.ExtraBomb }]);
    expect(grid.getCell({ x: 4, y: 3 })).toBe(TileKind.Bonus);
    expect(game.powerUps).toEqual([{ position: { x: 4, y: 3 }, kind: PowerUp.ExtraBomb }]);
  });

  it('ne fait apparaître aucun bonus si le tirage dépasse le taux', () => {
    const { game, grid } = makeGame(
      { a: { x: 1, y: 1 }, b: { x: 7, y: 7 } },
      { powerUpDropRate: 0.3, random: () => 0.5 },
    );
    grid.setCell({ x: 4, y: 3 }, TileKind.DestructibleWall);
    game.plantBomb('a', { x: 4, y: 4 }, 0);

    expect(game.update(FUSE).droppedPowerUps).toEqual([]);
    expect(grid.getCell({ x: 4, y: 3 })).toBe(TileKind.Empty);
  });

  it('applique le bonus au joueur qui marche dessus et le retire de la grille', () => {
    const { game, grid } = makeGame(
      { a: { x: 4, y: 1 }, b: { x: 7, y: 7 } },
      { powerUpDropRate: 1, random: () => 0.5 }, // 0.5 * 3 → IncreaseRange
    );
    grid.setCell({ x: 4, y: 3 }, TileKind.DestructibleWall);
    game.plantBomb('b', { x: 4, y: 4 }, 0);
    game.update(FUSE);
    game.movePlayer('a', Direction.Down, FUSE);

    const result = game.movePlayer('a', Direction.Down, FUSE + 1000);

    expect(result).toEqual({ position: { x: 4, y: 3 }, pickedPowerUp: PowerUp.IncreaseRange });
    expect(game.getPlayer('a')?.bombRange).toBe(2);
    expect(grid.getCell({ x: 4, y: 3 })).toBe(TileKind.Empty);
    expect(game.powerUps).toEqual([]);
  });

  it('détruit un bonus déjà présent touché par une explosion', () => {
    const { game, grid } = makeGame(
      { a: { x: 1, y: 1 }, b: { x: 7, y: 7 } },
      { powerUpDropRate: 1, random: () => 0 },
    );
    grid.setCell({ x: 4, y: 3 }, TileKind.DestructibleWall);
    game.plantBomb('a', { x: 4, y: 4 }, 0);
    game.update(FUSE);

    game.plantBomb('a', { x: 4, y: 4 }, FUSE);
    const result = game.update(FUSE * 2);

    expect(result.destroyedPowerUps).toEqual([{ x: 4, y: 3 }]);
    expect(game.powerUps).toEqual([]);
    expect(grid.getCell({ x: 4, y: 3 })).toBe(TileKind.Empty);
  });

  it('accélère le joueur avec le bonus de vitesse', () => {
    const player = new Player('a', 'a', { x: 1, y: 1 });
    const base = player.moveDelayMs;

    player.applyPowerUp(PowerUp.IncreaseSpeed);

    expect(player.speed).toBe(1);
    expect(player.moveDelayMs).toBeLessThan(base);
  });

  it('plafonne la vitesse', () => {
    const player = new Player('a', 'a', { x: 1, y: 1 });
    for (let i = 0; i < 20; i++) player.applyPowerUp(PowerUp.IncreaseSpeed);

    expect(player.moveDelayMs).toBe(80);
  });

  it('rejette un taux d’apparition hors de [0, 1]', () => {
    expect(
      () => new Game({ grid: new Grid({ width: 3, height: 3 }), players: [], powerUpDropRate: 2 }),
    ).toThrow();
  });
});
