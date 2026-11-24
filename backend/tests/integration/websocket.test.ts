import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client';
import { loadConfig } from '../../src/config.js';
import type {
  ClientToServerEvents,
  JoinRoomPayload,
  ServerToClientEvents,
} from '../../src/protocol/types.js';

import { GameServer } from '../../src/server/GameServer.js';

type TestClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

let server: GameServer;
let baseUrl: string;

beforeAll(async () => {
  server = new GameServer(loadConfig({ PORT: '0', CLIENT_ORIGIN: '*' }));
  await server.start();
  baseUrl = `http://localhost:${server.port}`;
}, 10_000);

afterAll(async () => {
  await server.stop();
});

describe('Communication Socket.IO (intégration)', () => {
  it('accepte un client et lui fait rejoindre un lobby', async () => {
    const { client } = await connectAndJoin('Alice');
    client.close();
  });

  it('diffuse la liste des joueurs mise à jour aux membres du lobby', async () => {
    const alice = await connectAndJoin('Alice');

    const playersReceived = new Promise<{ playerNames: string[] }>((resolve) => {
      alice.client.on('room:players', (payload) => resolve(payload));
    });

    const bob = await connectAndJoin('Bob');
    const players = await playersReceived;

    expect(players.playerNames).toEqual(expect.arrayContaining(['Alice', 'Bob']));

    alice.client.close();
    bob.client.close();
  });
});

/** Connecte un client puis lui fait rejoindre un lobby (ack de `room:join`). */
function connectAndJoin(playerName: string): Promise<{ client: TestClient }> {
  return new Promise((resolve, reject) => {
    const client: TestClient = createClient(baseUrl, {
      transports: ['websocket'],
    });

    client.on('connect_error', (error) => {
      client.close();
      reject(error);
    });

    client.on('connect', () => {
      const payload: JoinRoomPayload = { playerName };
      client.emit('room:join', payload, (result) => {
        if (!result.ok) {
          client.close();
          reject(new Error('Échec du join : ' + JSON.stringify(result)));
          return;
        }
        resolve({ client });
      });
    });
  });
}
