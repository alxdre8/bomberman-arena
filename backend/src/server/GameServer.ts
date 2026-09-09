import { createServer, type Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { AppConfig } from '../config.js';
import type { ClientToServerEvents, ServerToClientEvents } from '../protocol/types.ts';
import { GameController } from './GameController.js';

/**
 * Serveur de jeu : HTTP + Socket.IO.
 *
 * La classe assemble l'infrastructure (transport) et délègue toute la logique
 * au `GameController` / moteur. Elle peut être démarrée et
 * arrêtée de façon programmatique (tests d'intégration).
 */
export class GameServer {
  private readonly httpServer: HttpServer;
  private readonly io: Server<ClientToServerEvents, ServerToClientEvents>;
  private readonly controller: GameController;
  private connectionCount = 0;

  constructor(private readonly config: AppConfig) {
    this.httpServer = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bomberman Arena - Serveur WebSocket');
    });

    this.io = new Server<ClientToServerEvents, ServerToClientEvents>(
      this.httpServer,
      { cors: { origin: config.clientOrigin } },
    );

    this.controller = new GameController();

    this.io.on('connection', (socket) => {
      this.connectionCount += 1;
      this.controller.handleConnection(socket);
      socket.on('disconnect', () => {
        this.connectionCount = Math.max(0, this.connectionCount - 1);
      });
    });
  }

  /** Port effectif d'écoute (utile avec le port 0 alloué par l'OS). */
  get port(): number {
    const address = this.httpServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Le serveur n’est pas démarré.');
    }
    return address.port;
  }

  /** Nombre de connexions client actuellement ouvertes. */
  get connectedClients(): number {
    return this.connectionCount;
  }

  /** Démarre l'écoute HTTP + WebSocket. */
  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.httpServer.once('error', reject);
      this.httpServer.listen(this.config.port, () => {
        this.httpServer.off('error', reject);
        resolve();
      });
    });
  }

  /** Ferme le serveur Socket.IO (et le serveur HTTP sous-jacent). */
  async stop(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.io.close(() => resolve());
    });
  }
}
