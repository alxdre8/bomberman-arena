import { io, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Game } from '../../src/engine/Game.js';
import { GameStatus, TileKind } from '../../src/engine/types.js';
import type {
  ClientToServerEvents,
  ExplosionOccurredPayload,
  GameEndPayload,
  GameStatePayload,
  JoinRoomResult,
  PlayerDeadPayload,
  ServerToClientEvents,
} from '../../src/protocol/types.js';
import { GameServer } from '../../src/server/GameServer.js';

type TestSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

const FUSE_MS = 100;

describe('Intégration Réseau - boucle de jeu, explosions et fin de partie', () => {
  let server: GameServer;
  let serverUrl: string;
  const clientSockets: TestSocket[] = [];

  beforeEach(async () => {
    // Terrain 7x7 sans murs destructibles, mèche courte, pas de bonus :
    // la partie est entièrement déterministe. Spawns : (1,1) et (5,5).
    server = new GameServer(
      { port: 0, clientOrigin: '*' },
      {
        tickMs: 10,
        createGame: (participants) =>
          Game.create(participants, {
            grid: { width: 7, height: 7, destructibleWallDensity: 0 },
            bombFuseMs: FUSE_MS,
            powerUpDropRate: 0,
          }),
      },
    );
    await server.start();
    serverUrl = `http://localhost:${server.port}`;
  });

  afterEach(async () => {
    for (const socket of clientSockets) {
      if (socket.connected) socket.disconnect();
    }
    clientSockets.length = 0;
    await server.stop();
  });

  const connectClient = (): Promise<TestSocket> =>
    new Promise((resolve, reject) => {
      const socket: TestSocket = io(serverUrl, { transports: ['websocket'], forceNew: true });
      clientSockets.push(socket);
      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', reject);
    });

  const join = (socket: TestSocket, playerName: string): Promise<JoinRoomResult> =>
    new Promise((resolve) => socket.emit('room:join', { playerName }, resolve));

  const next = <K extends keyof ServerToClientEvents>(
    socket: TestSocket,
    event: K,
  ): Promise<Parameters<ServerToClientEvents[K]>[0]> =>
    new Promise((resolve) => {
      (socket.once as (e: string, l: (p: unknown) => void) => void)(event, (payload) =>
        resolve(payload as Parameters<ServerToClientEvents[K]>[0]),
      );
    });

  /** Deux joueurs rejoignent puis se déclarent prêts ; renvoie l'état de départ. */
  const startTwoPlayerGame = async () => {
    const alice = await connectClient();
    const bob = await connectClient();
    await join(alice, 'Alice');
    await join(bob, 'Bob');

    const started = next(alice, 'game:start');
    alice.emit('player:ready');
    bob.emit('player:ready');
    const state = await started;

    return { alice, bob, state };
  };

  it('démarre la boucle et diffuse un état complet au lancement', async () => {
    const { state } = await startTwoPlayerGame();

    expect(state.status).toBe(GameStatus.Running);
    expect(state.bombs).toEqual([]);
    expect(state.powerUps).toEqual([]);
    expect(state.winnerId).toBeNull();
    expect(server.gameController.activeGameLoops).toBe(1);
  });

  it('fait exploser la bombe, tue son poseur et désigne le vainqueur', async () => {
    const { alice, bob } = await startTwoPlayerGame();

    const explosion = next(bob, 'explosion:occurred');
    const dead = next(bob, 'player:dead');
    const state = next(bob, 'game:state');
    const end = next(bob, 'game:end');

    alice.emit('player:plant-bomb');

    const explosionPayload: ExplosionOccurredPayload = await explosion;
    expect(explosionPayload.origin).toEqual({ x: 1, y: 1 });
    expect(explosionPayload.affectedCells).toContainEqual({ x: 2, y: 1 });
    expect(explosionPayload.affectedCells).not.toContainEqual({ x: 0, y: 1 });

    const deadPayload: PlayerDeadPayload = await dead;
    expect(deadPayload.playerId).toBe(alice.id);

    const statePayload: GameStatePayload = await state;
    expect(statePayload.bombs).toEqual([]);
    expect(statePayload.players.find((p) => p.id === alice.id)?.alive).toBe(false);

    const endPayload: GameEndPayload = await end;
    expect(endPayload.winnerId).toBe(bob.id);
    expect(server.gameController.activeGameLoops).toBe(0);
  });

  it('détruit les murs destructibles et diffuse la grille mise à jour', async () => {
    const { alice, bob } = await startTwoPlayerGame();
    const game = server.roomManager.getGameOfPlayer(alice.id!)!;
    // Mur destructible à côté de Bob (5,5), et un autre hors de portée.
    game.gridView.setCell({ x: 4, y: 5 }, TileKind.DestructibleWall);
    game.gridView.setCell({ x: 3, y: 5 }, TileKind.DestructibleWall);

    const state = next(alice, 'game:state');
    bob.emit('player:plant-bomb');

    const payload = await state;
    expect(payload.grid.tiles[5][4]).toBe(TileKind.Empty);
    expect(payload.grid.tiles[5][3]).toBe(TileKind.DestructibleWall);
  });

  it('élimine un joueur qui se déconnecte en cours de partie', async () => {
    const { alice, bob } = await startTwoPlayerGame();

    const end = next(bob, 'game:end');
    alice.disconnect();

    const endPayload = await end;
    expect(endPayload.winnerId).toBe(bob.id);
    expect(server.gameController.activeGameLoops).toBe(0);
  });

  it('diffuse les déplacements validés par le moteur', async () => {
    const { alice, bob } = await startTwoPlayerGame();

    const position = next(bob, 'game:position');
    alice.emit('player:move', { direction: 'right' as never });

    expect(await position).toEqual({ playerId: alice.id, position: { x: 2, y: 1 } });
  });
});
