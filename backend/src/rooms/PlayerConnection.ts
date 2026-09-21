import type { Socket } from 'socket.io';
import type { PlayerId } from '../engine/types.js';
import type { ClientToServerEvents, ServerToClientEvents } from '../protocol/types.js';

/** Type de socket serveur, typé par le contrat du protocole. */
export type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Liaison entre une socket réelle et l'identité de jeu du joueur.
 *
 * Encapsule l'envoi de messages afin que le reste du code ne manipule jamais
 * directement la socket (séparation transport / logique).
 */
export class PlayerConnection {
  readonly id: PlayerId;
  readonly name: string;

  private readonly socket: ClientSocket;

  constructor(socket: ClientSocket, name: string) {
    this.socket = socket;
    this.id = socket.id;
    this.name = name;
  }

  /** Émet un événement typé vers le client. */
  emit<K extends keyof ServerToClientEvents>(
    event: K,
    payload: Parameters<ServerToClientEvents[K]>[0],
  ): void {
    (this.socket.emit as (name: string, data: unknown) => boolean)(event, payload);
  }

  /** Ferme la connexion (déconnexion forcée). */
  disconnect(): void {
    this.socket.disconnect();
  }
}
