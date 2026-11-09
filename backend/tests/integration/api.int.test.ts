import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { GameServer } from '../../src/server/GameServer.js';
import type { ClientToServerEvents, ServerToClientEvents } from '../../src/protocol/types.js';

describe('GameServer Integration Tests', () => {
  let server: GameServer;
  let clientSocket: Socket<ServerToClientEvents, ClientToServerEvents>;

  beforeAll(async () => {
    server = new GameServer({ port: 0, clientOrigin: '*' });
    await server.start();
  });

  afterAll(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    await server.stop();
  });

  it('should serve HTTP healthcheck endpoint', async () => {
    const response = await fetch(`http://localhost:${server.port}`);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('Bomberman Arena - Serveur WebSocket');
  });

  it('should allow Socket.IO client to connect and join a room', async () => {
    clientSocket = io(`http://localhost:${server.port}`, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      clientSocket.on('connect', () => resolve());
      clientSocket.on('connect_error', (err) => reject(err));
    });

    expect(clientSocket.connected).toBe(true);
    expect(server.connectedClients).toBe(1);

    const joinedPromise = new Promise<{ lobbyId: string; playerNames: string[] }>((resolve) => {
      clientSocket.on('room:joined', (payload) => {
        resolve(payload);
      });
    });

    clientSocket.emit('room:join', { playerName: 'Player1' });

    const joinedPayload = await joinedPromise;
    expect(joinedPayload.lobbyId).toBeDefined();
    expect(joinedPayload.playerNames).toContain('Player1');
  });
});
