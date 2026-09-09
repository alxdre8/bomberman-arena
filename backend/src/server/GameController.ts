import { Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "../protocol/types.js";

/** Type de socket serveur, typé par le contrat du protocole. */
export type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Pont entre la couche transport (Socket.IO) et le domaine (lobbies, moteur).
 *
 * C'est la seule couche qui connaît les événements réseau. Les règles de jeu
 * (collisions, explosions) restent dans le moteur (`src/engine/`).
 */
export class GameController {
  constructor() {}

  /** Attache les écouteurs d'événements à une nouvelle connexion. */
  handleConnection(socket: ClientSocket): void {
    socket.on('player:ready', () => this.handleReady(socket.id));
  }

  private handleReady(playerId: string): void {
    void playerId;
    // TODO
  }
}
