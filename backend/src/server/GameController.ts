import type {
  JoinRoomResult,
  MovePayload,
  BombPlantedPayload,
  GameStatePayload,
  RoomPlayersPayload,
} from '../protocol/types.js';
import { Lobby } from '../rooms/Lobby.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { PlayerConnection, type ClientSocket } from '../rooms/PlayerConnection.js';
import { Game } from '../engine/Game.js';
import { Player } from '../engine/Player.js';
import { GameStatus, TileKind } from '../engine/types.js';

/**
 * Pont entre la couche transport (Socket.IO) et le domaine (lobbies, moteur).
 *
 * C'est la seule couche qui connaît les événements réseau. Les règles de jeu
 * (collisions, explosions) restent dans le moteur (`src/engine/`), jamais ici.
 *
 * Les actions de jeu sont validées par le moteur avant d'être diffusées.
 */
export class GameController {
  constructor(private readonly rooms: RoomManager) {}

  /** Attache les écouteurs d'événements à une nouvelle connexion. */
  handleConnection(socket: ClientSocket): void {
    socket.on('room:join', (payload, ack) => this.handleJoin(socket, payload.playerName, ack));
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
      // Le départ d'un joueur non prêt peut suffire à réunir les conditions.
      this.tryStartGame(lobby);
    }
  }

  private handleMove(playerId: string, payload: MovePayload): void {
    const lobby = this.rooms.getLobbyOfPlayer(playerId);
    if (!lobby) return;

    const currentGame = lobby.game;
    if (!currentGame || currentGame.status !== GameStatus.Running) return;

    const currentPlayer = currentGame.getPlayer(playerId);
    if (!currentPlayer || !currentPlayer.isAlive) return;

    const currentGrid = currentGame.gridView;
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
    const lobby = this.rooms.getLobbyOfPlayer(playerId);
    if (!lobby || !lobby.game) {
      return;
    }

    const bomb = lobby.game.plantBomb(playerId);
    if (!bomb) {
      return;
    }

    const payload: BombPlantedPayload = {
      bombId: bomb.id,
      ownerId: bomb.ownerId,
      position: bomb.position,
      fuseMs: bomb.fuseMs,
      range: bomb.range,
    };

    for (const player of lobby.getPlayers()) {
      player.emit('bomb:planted', payload);
    }
  }

  private handleReady(playerId: string): void {
    const lobby = this.rooms.getLobbyOfPlayer(playerId);
    if (!lobby || lobby.hasStarted) return;

    lobby.setPlayerReady(playerId, true);
    this.broadcastPlayers(lobby);
    this.tryStartGame(lobby);
  }

  /**
   * Lance la partie si le lobby le permet : création du moteur (terrain
   * généré, joueurs placés aux coins), démarrage puis diffusion de `game:start`.
   */
  private tryStartGame(lobby: Lobby): void {
    if (!lobby.canStart()) return;

    const game = Game.create(lobby.getPlayers().map(({ id, name }) => ({ id, name })));
    lobby.start(game);
    game.start();

    const payload = this.buildGameState(game);
    for (const player of lobby.getPlayers()) {
      player.emit('game:start', payload);
    }
  }

  private buildGameState(game: Game): GameStatePayload {
    const grid = game.gridView;
    return {
      status: game.status,
      grid: { width: grid.width, height: grid.height, tiles: grid.toTiles() },
      players: game.players.map((player) => player.toState()),
    };
  }

  private broadcastPlayers(lobby: Lobby): void {
    const payload: RoomPlayersPayload = {
      lobbyId: lobby.id,
      playerNames: lobby.getPlayerNames(),
      readyPlayerNames: lobby.getReadyPlayerNames(),
      minPlayers: lobby.minPlayers,
      maxPlayers: lobby.maxPlayers,
    };
    for (const player of lobby.getPlayers()) {
      player.emit('room:players', payload);
    }
  }
}
