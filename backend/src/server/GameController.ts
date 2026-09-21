import type { JoinRoomResult, MovePayload, ServerToClientEvents } from '../protocol/types.js';
import { Lobby } from '../rooms/Lobby.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { PlayerConnection, type ClientSocket } from '../rooms/PlayerConnection.js';
import { GameStatus } from '../engine/types.js';

/**
 * Pont entre la couche transport (Socket.IO) et le domaine (lobbies, moteur).
 *
 * C'est la seule couche qui connaît les événements réseau. Les règles de jeu
 * (collisions, explosions) restent dans le moteur (`src/engine/`), jamais ici.
 *
 * Squelette Phase 1 : joindre/quitter un lobby fonctionne. Les actions de jeu
 * (déplacement, bombe, ready) sont câblées mais non implémentées (Phase 2).
 */
export class GameController {
  constructor(private readonly rooms: RoomManager) {}

  /** Attache les écouteurs d'événements à une nouvelle connexion. */
  handleConnection(socket: ClientSocket): void {
    socket.on('room:join', (payload, ack) =>
      this.handleJoin(socket, payload.playerName, ack),
    );
    socket.on('room:leave', () => this.handleLeave(socket.id));
    socket.on('player:move', (payload) => this.handleMove(socket.id, payload));
    socket.on('player:plant-bomb', () => this.handlePlantBomb(socket.id));
    socket.on('player:ready', () => this.handleReady(socket.id));
    socket.on('disconnect', () => this.handleLeave(socket.id));
  }

  private handleJoin(
    socket: ClientSocket,
    playerName: string,
    ack?: (result: JoinRoomResult) => void,
  ): void {
    const connection = new PlayerConnection(socket, playerName);
    const lobby = this.rooms.join(connection);

    socket.emit('room:joined', {
      lobbyId: lobby.id,
      playerId: connection.id,
      playerNames: lobby.getPlayerNames(),
      minPlayers: lobby.minPlayers,
      maxPlayers: lobby.maxPlayers,
    });

    this.broadcastPlayers(lobby);
    ack?.({
      ok: true,
      lobbyId: lobby.id,
      playerNames: lobby.getPlayerNames(),
      minPlayers: lobby.minPlayers,
      maxPlayers: lobby.maxPlayers,
    });
  }

  private handleLeave(playerId: string): void {
    const lobby = this.rooms.leave(playerId);
    if (lobby) {
      this.broadcastPlayers(lobby);
    }
  }

  private handleMove(playerId: string, payload: MovePayload): void {
    const lobby = this.rooms.getLobbyOfPlayer(playerId);
    if (!lobby) return;

    const currentGame = lobby.getGame();
    if (!currentGame || currentGame.status !== GameStatus.Running) return;

    const currentPlayer = currentGame.getPlayer(playerId);
    if (!currentPlayer || !currentPlayer.isAlive()) return;

    const currentGrid    = currentGame.gridView;
    const targetPosition = currentPlayer.candidatePosition(payload.direction);
    if (currentGrid.isWalkable(targetPosition)) {
      currentPlayer.setPosition(targetPosition);
      for (const player of lobby.getPlayers()) {
        player.emit('game:position', {
          playerId,
          position: targetPosition,
        });
      }
    }
  }

  private handlePlantBomb(playerId: string): void {
    void playerId;
    // TODO Phase 2 : poser la bombe via le moteur et diffuser `bomb:planted`.
  }

  private handleReady(playerId: string): void {
    void playerId;
    // TODO Phase 2 : marquer le joueur prêt ; si le lobby peut démarrer,
    // créer la partie (Game) et diffuser `game:start`.
  }

  private broadcastPlayers(lobby: Lobby): void {
    const payload = {
      lobbyId: lobby.id,
      playerNames: lobby.getPlayerNames(),
      minPlayers: lobby.minPlayers,
      maxPlayers: lobby.maxPlayers,
    };
    for (const player of lobby.getPlayers()) {
      player.emit('room:players', payload);
    }
  }
}
