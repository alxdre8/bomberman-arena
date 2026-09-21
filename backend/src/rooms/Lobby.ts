import { randomUUID } from 'node:crypto';
import type { PlayerId } from '../engine/types.js';
import type { PlayerConnection } from './PlayerConnection.js';

/** Options de configuration d'un lobby. */
export interface LobbyConfig {
  minPlayers?: number;
  maxPlayers?: number;
}

const DEFAULT_MIN_PLAYERS = 2;
const DEFAULT_MAX_PLAYERS = 4;

/**
 * Lobby : salle d'attente pour une partie.
 *
 * Un lobby accueille 2 à 4 joueurs avant le démarrage. La partie peut
 * démarrer quand le minimum de joueurs est atteint et que tous sont prêts.
 */
export class Lobby {
  readonly id: string;

  readonly minPlayers: number;
  readonly maxPlayers: number;
  private readonly connections = new Map<PlayerId, PlayerConnection>();
  private readonly readyPlayers = new Set<PlayerId>();
  private started = false;

  constructor(config: LobbyConfig = {}) {
    this.minPlayers = config.minPlayers ?? DEFAULT_MIN_PLAYERS;
    this.maxPlayers = config.maxPlayers ?? DEFAULT_MAX_PLAYERS;

    if (
      this.minPlayers < 2 ||
      this.maxPlayers > 4 ||
      this.minPlayers > this.maxPlayers
    ) {
      throw new Error('Un lobby accepte entre 2 et 4 joueurs.');
    }

    this.id = randomUUID();
  }

  get playerCount(): number {
    return this.connections.size;
  }

  get isFull(): boolean {
    return this.connections.size >= this.maxPlayers;
  }

  get hasStarted(): boolean {
    return this.started;
  }

  /** Ajoute un joueur au lobby s'il y a de la place. */
  add(connection: PlayerConnection): boolean {
    if (this.started || this.isFull || this.connections.has(connection.id)) {
      return false;
    }
    this.connections.set(connection.id, connection);
    return true;
  }

  /** Retire un joueur du lobby. */
  remove(playerId: PlayerId): boolean {
    const removed = this.connections.delete(playerId);
    if (removed) {
      this.readyPlayers.delete(playerId);
    }
    return removed;
  }

  /** Modifie l'état prêt d'un joueur présent dans le lobby. */
  setPlayerReady(playerId: PlayerId, ready: boolean): void {
    if (!this.connections.has(playerId)) {
      throw new Error('Le joueur n’est pas présent dans ce lobby.');
    }

    if (ready) {
      this.readyPlayers.add(playerId);
    } else {
      this.readyPlayers.delete(playerId);
    }
  }

  /** Indique si un joueur présent est prêt. */
  isPlayerReady(playerId: PlayerId): boolean {
    return this.readyPlayers.has(playerId);
  }

  getPlayers(): PlayerConnection[] {
    return [...this.connections.values()];
  }

  getPlayerNames(): string[] {
    return this.getPlayers().map((player) => player.name);
  }

  /** Vrai si le minimum de joueurs est atteint et que tous sont prêts. */
  canStart(): boolean {
    return (
      !this.started &&
      this.connections.size >= this.minPlayers &&
      this.readyPlayers.size === this.connections.size
    );
  }
}
