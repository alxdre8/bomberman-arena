import type {
  JoinRoomResult,
  MovePayload,
  BombPlantedPayload,
  GameStatePayload,
  RoomPlayersPayload,
  ServerToClientEvents,
} from '../protocol/types.js';
import { Lobby } from '../rooms/Lobby.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { PlayerConnection, type ClientSocket } from '../rooms/PlayerConnection.js';
import type { Bomb } from '../engine/Bomb.js';
import { Game, type Participant } from '../engine/Game.js';
import { GameStatus } from '../engine/types.js';

/** Intervalle par défaut (ms) entre deux ticks de la boucle de jeu (20 ticks/s). */
export const DEFAULT_TICK_MS = 50;

/** Options injectables du contrôleur (utiles pour les tests). */
export interface GameControllerOptions {
  /** Intervalle entre deux ticks de la boucle de jeu (défaut : 50 ms). */
  tickMs?: number;
  /** Fabrique de partie (défaut : `Game.create` avec terrain aléatoire 13x11). */
  createGame?: (participants: Participant[]) => Game;
  /** Horloge (défaut : Date.now). */
  now?: () => number;
}

/**
 * Pont entre la couche transport (Socket.IO) et le domaine (lobbies, moteur).
 *
 * C'est la seule couche qui connaît les événements réseau. Les règles de jeu
 * (collisions, explosions, victoire) restent dans le moteur (`src/engine/`) :
 * les actions de jeu sont validées par le moteur avant d'être diffusées. Le
 * contrôleur relaie les actions des joueurs, cadence la boucle de jeu
 * (`Game.update`) et diffuse ce qui a changé.
 */
export class GameController {
  private readonly tickMs: number;
  private readonly createGame: (participants: Participant[]) => Game;
  private readonly now: () => number;
  /** Boucles de jeu actives, par identifiant de lobby. */
  private readonly loops = new Map<string, ReturnType<typeof setInterval>>();

  constructor(
    private readonly rooms: RoomManager,
    options: GameControllerOptions = {},
  ) {
    this.tickMs = options.tickMs ?? DEFAULT_TICK_MS;
    this.createGame = options.createGame ?? ((participants) => Game.create(participants));
    this.now = options.now ?? Date.now;
  }

  /** Nombre de boucles de jeu en cours (une par partie active). */
  get activeGameLoops(): number {
    return this.loops.size;
  }

  /** Attache les écouteurs d'événements à une nouvelle connexion. */
  handleConnection(socket: ClientSocket): void {
    socket.on('room:join', (payload, ack) => this.handleJoin(socket, payload.playerName, ack));
    socket.on('room:leave', () => this.handleLeave(socket.id));
    socket.on('player:move', (payload) => this.handleMove(socket.id, payload));
    socket.on('player:plant-bomb', () => this.handlePlantBomb(socket.id));
    socket.on('player:ready', () => this.handleReady(socket.id));
    socket.on('disconnect', () => this.handleLeave(socket.id));
  }

  /** Arrête toutes les boucles de jeu (arrêt du serveur). */
  dispose(): void {
    for (const timer of this.loops.values()) {
      clearInterval(timer);
    }
    this.loops.clear();
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
    const lobby = this.rooms.getLobbyOfPlayer(playerId);
    if (!lobby) return;

    this.rooms.leave(playerId);

    if (lobby.playerCount === 0) {
      this.stopLoop(lobby.id);
      return;
    }

    this.broadcastPlayers(lobby);

    const game = lobby.getGame();
    if (game) {
      // Un joueur qui quitte une partie en cours est éliminé : sinon il
      // bloquerait la fin de partie (ou « gagnerait » sans jouer).
      if (game.eliminatePlayer(playerId)) {
        this.broadcast(lobby, 'player:dead', { playerId });
        this.broadcast(lobby, 'game:state', this.buildGameState(game));
        if (game.status === GameStatus.Finished) this.endGame(lobby, game);
      }
      return;
    }

    // Le départ d'un joueur non prêt peut suffire à réunir les conditions.
    this.tryStartGame(lobby);
  }

  private handleMove(playerId: string, payload: MovePayload): void {
    const lobby = this.rooms.getLobbyOfPlayer(playerId);
    const game = lobby?.game;
    if (!lobby || !game) return;

    // Le moteur refuse le déplacement si la partie n'est pas en cours.
    const result = game.movePlayer(playerId, payload.direction, this.now());
    if (!result) return;

    this.broadcast(lobby, 'game:position', { playerId, position: result.position });

    const player = game.getPlayer(playerId);
    if (result.pickedPowerUp && player) {
      this.broadcast(lobby, 'powerup:collected', {
        playerId,
        kind: result.pickedPowerUp,
        position: result.position,
        player: player.toState(),
      });
    }
  }

  private handlePlantBomb(playerId: string): void {
    const lobby = this.rooms.getLobbyOfPlayer(playerId);
    if (!lobby || !lobby.game) {
      return;
    }

    const bomb = lobby.game.plantBomb(playerId, undefined, this.now());
    if (!bomb) {
      return;
    }

    this.broadcast(lobby, 'bomb:planted', toBombPayload(bomb));
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
   * généré, joueurs placés aux coins), démarrage, diffusion de `game:start`
   * puis lancement de la boucle de jeu.
   */
  private tryStartGame(lobby: Lobby): void {
    if (!lobby.canStart()) return;

    const game = this.createGame(lobby.getPlayers().map(({ id, name }) => ({ id, name })));
    lobby.start(game);
    game.start();

    this.broadcast(lobby, 'game:start', this.buildGameState(game));
    this.startLoop(lobby);
  }

  private startLoop(lobby: Lobby): void {
    this.stopLoop(lobby.id);
    const timer = setInterval(() => this.tick(lobby), this.tickMs);
    // La boucle ne doit pas empêcher le processus Node de s'arrêter.
    timer.unref();
    this.loops.set(lobby.id, timer);
  }

  private stopLoop(lobbyId: string): void {
    const timer = this.loops.get(lobbyId);
    if (timer) {
      clearInterval(timer);
      this.loops.delete(lobbyId);
    }
  }

  /** Un tick : fait avancer le moteur puis diffuse ce qui a changé. */
  private tick(lobby: Lobby): void {
    const game = lobby.getGame();
    if (!game || game.status !== GameStatus.Running || lobby.playerCount === 0) {
      this.stopLoop(lobby.id);
      return;
    }

    const result = game.update(this.now());
    if (result.explosions.length === 0) return;

    for (const explosion of result.explosions) {
      this.broadcast(lobby, 'explosion:occurred', {
        bombId: explosion.bombId,
        origin: explosion.origin,
        affectedCells: explosion.affectedCells,
      });
    }
    for (const playerId of result.killedPlayerIds) {
      this.broadcast(lobby, 'player:dead', { playerId });
    }
    // État complet : grille (murs détruits, bonus), joueurs, bombes restantes.
    this.broadcast(lobby, 'game:state', this.buildGameState(game));

    if (result.ended) this.endGame(lobby, game);
  }

  private endGame(lobby: Lobby, game: Game): void {
    this.stopLoop(lobby.id);
    this.broadcast(lobby, 'game:end', { winnerId: game.winnerId });
  }

  private buildGameState(game: Game): GameStatePayload {
    const grid = game.gridView;
    return {
      status: game.status,
      grid: { width: grid.width, height: grid.height, tiles: grid.toTiles() },
      players: game.players.map((player) => player.toState()),
      bombs: game.bombs.map(toBombPayload),
      powerUps: game.powerUps,
      winnerId: game.winnerId,
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
    this.broadcast(lobby, 'room:players', payload);
  }

  /** Envoie un événement à tous les joueurs du lobby. */
  private broadcast<K extends keyof ServerToClientEvents>(
    lobby: Lobby,
    event: K,
    payload: Parameters<ServerToClientEvents[K]>[0],
  ): void {
    for (const player of lobby.getPlayers()) {
      player.emit(event, payload);
    }
  }
}

function toBombPayload(bomb: Bomb): BombPlantedPayload {
  return {
    bombId: bomb.id,
    ownerId: bomb.ownerId,
    position: { ...bomb.position },
    fuseMs: bomb.fuseMs,
    range: bomb.range,
  };
}
