import { Bomb } from './Bomb.js';
import { Grid, type GridConfig } from './Grid.js';
import { Player } from './Player.js';
import { GameStatus } from './types.js';
import type { PlayerId, Position } from './types.js';

/** Options de création d'une partie. */
export interface GameConfig {
  grid: GridConfig;
  players: Player[];
}

/**
 * Partie de Bomberman : orchestration du moteur de jeu.
 *
 * Cette classe est volontairement indépendante du réseau. Elle sera pilotée
 * par la couche `server/` (GameController) et unificate le tick de jeu.
 *
 * Squelette Phase 1 : gestion des joueurs, de la grille et de la pose de
 * bombes. Explosions / destruction de murs / victoire : Phase 3.
 */
export class Game {
  private readonly grid: Grid;
  private readonly playersById = new Map<PlayerId, Player>();
  private readonly bombsById = new Map<string, Bomb>();

  private _status: GameStatus = GameStatus.Waiting;
  private _winnerId: PlayerId | null = null;

  constructor(config: GameConfig) {
    this.grid = new Grid(config.grid);
    for (const player of config.players) {
      this.playersById.set(player.id, player);
    }
  }

  get status(): GameStatus {
    return this._status;
  }

  get winnerId(): PlayerId | null {
    return this._winnerId;
  }

  get gridView(): Grid {
    return this.grid;
  }

  get players(): Player[] {
    return [...this.playersById.values()];
  }

  get bombs(): Bomb[] {
    return [...this.bombsById.values()];
  }

  getPlayer(playerId: PlayerId): Player | undefined {
    return this.playersById.get(playerId);
  }

  /** Passe la partie en cours d'exécution. */
  start(): void {
    if (this._status !== GameStatus.Waiting) {
      throw new Error('La partie a déjà démarré.');
    }
    this._status = GameStatus.Running;
  }

  /**
   * Pose une bombe pour le joueur donné.
   *
   * @param playerId Identifiant du joueur poseur.
   * @param position Position de pose (par défaut : position actuelle du joueur).
   * @returns La bombe instanciée ou null si la pose est impossible (quota atteint,
   *          case déjà occupée, joueur mort/inconnu, partie non démarrée).
   */
  plantBomb(playerId: PlayerId, position?: Position): Bomb | null {
    if (this._status !== GameStatus.Running) {
      return null;
    }

    const owner = this.playersById.get(playerId);
    if (!owner || !owner.isAlive) {
      return null;
    }

    const targetPosition = position ? { ...position } : owner.position;

    if (!this.grid.isValidPosition(targetPosition)) {
      return null;
    }

    if (this.hasBombAt(targetPosition)) {
      return null;
    }

    const activeBombs = this.getBombsByPlayer(playerId);
    if (activeBombs.length >= owner.maxBombs) {
      return null;
    }

    const bomb = new Bomb({
      ownerId: playerId,
      position: targetPosition,
      plantedAt: Date.now(),
      range: owner.bombRange,
    });

    this.bombsById.set(bomb.id, bomb);
    return bomb;
  }

  /** Renvoie toutes les bombes actives posées par un joueur donné. */
  getBombsByPlayer(playerId: PlayerId): Bomb[] {
    const result: Bomb[] = [];
    for (const bomb of this.bombsById.values()) {
      if (bomb.ownerId === playerId) {
        result.push(bomb);
      }
    }
    return result;
  }

  /** Renvoie la bombe présente à la position donnée, si elle existe. */
  getBombAt(position: Position): Bomb | undefined {
    for (const bomb of this.bombsById.values()) {
      if (bomb.position.x === position.x && bomb.position.y === position.y) {
        return bomb;
      }
    }
    return undefined;
  }

  /** Vrai si une bombe est présente sur la case indiquée. */
  hasBombAt(position: Position): boolean {
    return this.getBombAt(position) !== undefined;
  }

  /** Supprime une bombe de la partie (ex: après son explosion). */
  removeBomb(bombId: string): boolean {
    return this.bombsById.delete(bombId);
  }

  /**
   * Avance l'état de la partie à l'instant donné.
   *
   * TODO Phase 3 : faire exploser les bombes dont la mèche est écoulée,
   * calculer les explosions, détruire les murs et départager les joueurs.
   */
  update(now: number): void {
    void now;
  }
}
