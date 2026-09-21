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
   * TODO Phase 2 : vérifier la limite `maxBombs` du joueur et les bombes déjà
   * posées sur la case.
   */
  plantBomb(playerId: PlayerId, position: Position): Bomb {
    const owner = this.playersById.get(playerId);
    if (!owner) {
      throw new Error(`Joueur inconnu : ${playerId}`);
    }
    const bomb = new Bomb({
      ownerId: playerId,
      position,
      plantedAt: Date.now(),
      range: owner.bombRange,
    });
    this.bombsById.set(bomb.id, bomb);
    return bomb;
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
