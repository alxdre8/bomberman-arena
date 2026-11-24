import { io, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GameStatus, TileKind } from '../../src/engine/types.js';
import type {
  ClientToServerEvents,
  GameStatePayload,
  JoinRoomResult,
  RoomPlayersPayload,
  ServerToClientEvents,
} from '../../src/protocol/types.js';
import { GameServer } from '../../src/server/GameServer.js';

type TestSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

describe('Intégration Réseau - player:ready & game:start', () => {
  let server: GameServer;
  let serverUrl: string;
  const clientSockets: TestSocket[] = [];

  beforeEach(async () => {
    server = new GameServer({ port: 0, clientOrigin: '*' });
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

  /** Attend le prochain `room:players` dont le contenu satisfait le prédicat. */
  const waitForPlayers = (
    socket: TestSocket,
    predicate: (payload: RoomPlayersPayload) => boolean,
  ): Promise<RoomPlayersPayload> =>
    new Promise((resolve) => {
      const listener = (payload: RoomPlayersPayload) => {
        if (!predicate(payload)) return;
        socket.off('room:players', listener);
        resolve(payload);
      };
      socket.on('room:players', listener);
    });

  const waitForGameStart = (socket: TestSocket): Promise<GameStatePayload> =>
    new Promise((resolve) => socket.once('game:start', resolve));

  /** Laisse au serveur le temps de traiter (et éventuellement d'émettre). */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 100));

  it('diffuse la liste des joueurs prêts quand un joueur se déclare prêt', async () => {
    const alice = await connectClient();
    const bob = await connectClient();
    await join(alice, 'Alice');
    await join(bob, 'Bob');

    const update = waitForPlayers(bob, (p) => p.readyPlayerNames.length > 0);
    alice.emit('player:ready');

    expect((await update).readyPlayerNames).toEqual(['Alice']);
  });

  it('ne démarre pas tant que tous les joueurs ne sont pas prêts', async () => {
    const alice = await connectClient();
    const bob = await connectClient();
    await join(alice, 'Alice');
    await join(bob, 'Bob');

    let started = false;
    alice.once('game:start', () => {
      started = true;
    });

    alice.emit('player:ready');
    await settle();

    expect(started).toBe(false);
    const lobby = server.roomManager.getLobbyOfPlayer(alice.id!);
    expect(lobby?.hasStarted).toBe(false);
  });

  it('ne démarre pas avec un seul joueur prêt dans le lobby', async () => {
    const alice = await connectClient();
    await join(alice, 'Alice');

    let started = false;
    alice.once('game:start', () => {
      started = true;
    });

    alice.emit('player:ready');
    await settle();

    expect(started).toBe(false);
  });

  it('lance la partie et envoie game:start à tous quand tous sont prêts', async () => {
    const alice = await connectClient();
    const bob = await connectClient();
    await join(alice, 'Alice');
    await join(bob, 'Bob');

    const aliceStart = waitForGameStart(alice);
    const bobStart = waitForGameStart(bob);
    alice.emit('player:ready');
    bob.emit('player:ready');

    const [state, bobState] = await Promise.all([aliceStart, bobStart]);

    expect(bobState).toEqual(state);
    expect(state.status).toBe(GameStatus.Running);
    expect(state.grid.width).toBe(13);
    expect(state.grid.height).toBe(11);
    expect(state.grid.tiles).toHaveLength(11);
    expect(state.grid.tiles[0]).toHaveLength(13);
    expect(state.grid.tiles[0][0]).toBe(TileKind.IndestructibleWall);

    expect(state.players).toHaveLength(2);
    const byName = Object.fromEntries(state.players.map((p) => [p.name, p]));
    expect(byName.Alice).toMatchObject({ id: alice.id, position: { x: 1, y: 1 }, alive: true });
    expect(byName.Bob).toMatchObject({ id: bob.id, position: { x: 11, y: 9 }, alive: true });
    for (const player of state.players) {
      expect(state.grid.tiles[player.position.y][player.position.x]).toBe(TileKind.Empty);
    }

    const lobby = server.roomManager.getLobbyOfPlayer(alice.id!);
    expect(lobby?.hasStarted).toBe(true);
    expect(lobby?.getGame()?.status).toBe(GameStatus.Running);
  });

  it('lance la partie quand le dernier joueur non prêt quitte le lobby', async () => {
    const alice = await connectClient();
    const bob = await connectClient();
    const carol = await connectClient();
    await join(alice, 'Alice');
    await join(bob, 'Bob');
    await join(carol, 'Carol');

    const bothReady = waitForPlayers(alice, (p) => p.readyPlayerNames.length === 2);
    alice.emit('player:ready');
    bob.emit('player:ready');
    await bothReady;

    const aliceStart = waitForGameStart(alice);
    carol.emit('room:leave');
    const state = await aliceStart;

    expect(state.players.map((p) => p.name).sort()).toEqual(['Alice', 'Bob']);
  });

  it("n'envoie pas de nouvelle partie dans un lobby déjà démarré", async () => {
    const alice = await connectClient();
    const bob = await connectClient();
    await join(alice, 'Alice');
    await join(bob, 'Bob');

    const firstStart = waitForGameStart(alice);
    alice.emit('player:ready');
    bob.emit('player:ready');
    await firstStart;

    let restarted = false;
    alice.once('game:start', () => {
      restarted = true;
    });
    bob.emit('player:ready');
    await settle();

    expect(restarted).toBe(false);
  });

  it('place les nouveaux arrivants dans un autre lobby après le démarrage', async () => {
    const alice = await connectClient();
    const bob = await connectClient();
    const first = await join(alice, 'Alice');
    await join(bob, 'Bob');

    const started = waitForGameStart(alice);
    alice.emit('player:ready');
    bob.emit('player:ready');
    await started;

    const carol = await connectClient();
    const second = await join(carol, 'Carol');

    expect(second.lobbyId).not.toBe(first.lobbyId);
  });
});
