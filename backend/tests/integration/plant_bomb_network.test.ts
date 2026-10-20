import { io, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Game } from '../../src/engine/Game.js';
import { Player } from '../../src/engine/Player.js';
import type {
  BombPlantedPayload,
  ClientToServerEvents,
  JoinRoomResult,
  ServerToClientEvents,
} from '../../src/protocol/types.js';
import { GameServer } from '../../src/server/GameServer.js';

type TestSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

describe('Intégration Réseau - player:plant-bomb & bomb:planted', () => {
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
      if (socket.connected) {
        socket.disconnect();
      }
    }
    clientSockets.length = 0;
    await server.stop();
  });

  const connectClient = (): Promise<TestSocket> => {
    return new Promise((resolve, reject) => {
      const socket: TestSocket = io(serverUrl, {
        transports: ['websocket'],
        forceNew: true,
      });
      clientSockets.push(socket);

      socket.on('connect', () => resolve(socket));
      socket.on('connect_error', (err) => reject(err));
    });
  };

  it('diffuse bomb:planted à tous les clients du lobby quand un joueur pose une bombe', async () => {
    const client1 = await connectClient();
    const client2 = await connectClient();

    // 1. Les deux joueurs rejoignent le lobby
    const joinResult1 = await new Promise<JoinRoomResult>((resolve) => {
      client1.emit('room:join', { playerName: 'Alice' }, resolve);
    });
    expect(joinResult1.ok).toBe(true);

    const joinResult2 = await new Promise<JoinRoomResult>((resolve) => {
      client2.emit('room:join', { playerName: 'Bob' }, resolve);
    });
    expect(joinResult2.ok).toBe(true);
    expect(joinResult1.lobbyId).toBe(joinResult2.lobbyId);

    // 2. Récupérer le lobby côté serveur et lui attacher une partie démarrée
    const lobby = server.roomManager.getLobby(joinResult1.lobbyId);
    expect(lobby).toBeDefined();

    const player1 = new Player(client1.id!, 'Alice', { x: 1, y: 1 });
    const player2 = new Player(client2.id!, 'Bob', { x: 5, y: 5 });
    const game = new Game({
      grid: { width: 13, height: 11 },
      players: [player1, player2],
    });
    game.start();
    lobby!.game = game;

    // 3. Préparer l'écoute de bomb:planted sur les deux clients
    const client1BombPromise = new Promise<BombPlantedPayload>((resolve) => {
      client1.once('bomb:planted', resolve);
    });
    const client2BombPromise = new Promise<BombPlantedPayload>((resolve) => {
      client2.once('bomb:planted', resolve);
    });

    // 4. Client 1 déclenche player:plant-bomb
    client1.emit('player:plant-bomb');

    // 5. Attendre la réception de bomb:planted par les deux clients
    const [payload1, payload2] = await Promise.all([
      client1BombPromise,
      client2BombPromise,
    ]);

    expect(payload1.ownerId).toBe(client1.id);
    expect(payload1.position).toEqual({ x: 1, y: 1 });
    expect(payload1.fuseMs).toBe(3000);
    expect(payload1.range).toBe(1);

    expect(payload2).toEqual(payload1);
  });

  it('ne diffuse rien si le quota de bombes du joueur est dépassé', async () => {
    const client1 = await connectClient();

    await new Promise<JoinRoomResult>((resolve) => {
      client1.emit('room:join', { playerName: 'Alice' }, resolve);
    });

    const lobby = server.roomManager.getLobbyOfPlayer(client1.id!);
    const player1 = new Player(client1.id!, 'Alice', { x: 1, y: 1 });
    const game = new Game({
      grid: { width: 13, height: 11 },
      players: [player1],
    });
    game.start();
    lobby!.game = game;

    // Première bombe posée avec succès
    const firstBombPromise = new Promise<BombPlantedPayload>((resolve) => {
      client1.once('bomb:planted', resolve);
    });
    client1.emit('player:plant-bomb');
    await firstBombPromise;

    // Deuxième tentative : le client ne doit rien recevoir
    let receivedSecondBomb = false;
    client1.once('bomb:planted', () => {
      receivedSecondBomb = true;
    });

    client1.emit('player:plant-bomb');

    // Attente brève pour vérifier qu'aucun événement n'est émis
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(receivedSecondBomb).toBe(false);
  });
});
