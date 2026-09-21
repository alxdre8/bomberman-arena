import type { PlayerId } from '../engine/types.js';
import { Lobby } from './Lobby.js';
import type { PlayerConnection } from './PlayerConnection.js';

/**
 * Gestionnaire des lobbies et des parties en cours.
 *
 * Attribue chaque joueur qui se connecte à un lobby ouvert (non démarré et
 * non plein) ou en crée un nouveau. Le démarrage d'une partie et la
 * synchronisation avec le moteur seront branchés à la Phase 2.
 */
export class RoomManager {
  private readonly lobbies = new Map<string, Lobby>();
  private readonly playerToLobby = new Map<PlayerId, string>();

  /** Fait rejoindre un lobby au joueur, en le créant si nécessaire. */
  join(connection: PlayerConnection): Lobby {
    const lobby =
      this.findOpenLobby() ?? this.createLobby();

    if (!lobby.add(connection)) {
      throw new Error('Impossible d’ajouter le joueur au lobby.');
    }
    this.playerToLobby.set(connection.id, lobby.id);
    return lobby;
  }

  /**
   * Retire le joueur de son lobby.
   *
   * @returns Le lobby restant (s'il a été supprimé car vide, renvoie undefined).
   */
  leave(playerId: PlayerId): Lobby | undefined {
    const lobbyId = this.playerToLobby.get(playerId);
    if (!lobbyId) return undefined;

    const lobby = this.lobbies.get(lobbyId);
    this.playerToLobby.delete(playerId);

    if (!lobby) return undefined;
    lobby.remove(playerId);

    if (lobby.playerCount === 0) {
      this.lobbies.delete(lobbyId);
      return undefined;
    }
    return lobby;
  }

  getLobby(lobbyId: string): Lobby | undefined {
    return this.lobbies.get(lobbyId);
  }

  getLobbyOfPlayer(playerId: PlayerId): Lobby | undefined {
    const lobbyId = this.playerToLobby.get(playerId);
    return lobbyId ? this.lobbies.get(lobbyId) : undefined;
  }

  private findOpenLobby(): Lobby | undefined {
    for (const lobby of this.lobbies.values()) {
      if (!lobby.hasStarted && !lobby.isFull) return lobby;
    }
    return undefined;
  }

  private createLobby(): Lobby {
    const lobby = new Lobby();
    this.lobbies.set(lobby.id, lobby);
    return lobby;
  }
}
