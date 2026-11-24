import { Bomb } from './Bomb.js';
import { Explosion } from './Explosion.js';
import {
  DEFAULT_GRID_HEIGHT,
  DEFAULT_GRID_WIDTH,
  Grid,
  type GridGenerationConfig,
} from './Grid.js';
import { Player } from './Player.js';
import { PowerUp } from './PowerUp.js';
import { GameStatus, TileKind } from './types.js';
import type { Direction, PlayerId, Position } from './types.js';

/** Probabilité par défaut qu'un mur détruit libère un bonus. */
export const DEFAULT_POWER_UP_DROP_RATE = 0.3;

/** Règles ajustables d'une partie (toutes optionnelles). */
export interface GameRules {
  /** Durée de mèche des bombes en ms (défaut : celle de `Bomb`, 3000). */
  bombFuseMs?: number;
  /** Probabilité (0 à 1) qu'un mur détruit libère un bonus (défaut : 0.3). */
  powerUpDropRate?: number;
  /**
   * Générateur aléatoire dans [0, 1[ (défaut : Math.random), injectable pour
   * rendre l'apparition des bonus déterministe dans les tests.
   */
  random?: () => number;
}

/** Options de création d'une partie. */
export interface GameConfig extends GameRules {
  /**
   * Terrain de la partie : soit une grille déjà construite (utile pour les
   * tests), soit des options de génération transmises à `Grid.generate`.
   */
  grid: Grid | GridGenerationConfig;
  players: Player[];
}

/** Options de `Game.create` : génération du terrain + règles de la partie. */
export interface GameCreateOptions extends GameRules {
  grid?: GridGenerationConfig;
}

/** Identité d'un participant, avant sa création côté moteur. */
export interface Participant {
  id: PlayerId;
  name: string;
}

/** Bonus présent sur une case de la grille. */
export interface PowerUpOnGrid {
  position: Position;
  kind: PowerUp;
}

/** Explosion d'une bombe survenue pendant un tick. */
export interface ExplosionEvent {
  bombId: string;
  ownerId: PlayerId;
  origin: Position;
  affectedCells: Position[];
}

/** Résultat d'un tick : tout ce qui a changé, pour que le serveur le diffuse. */
export interface TickResult {
  explosions: ExplosionEvent[];
  destroyedWalls: Position[];
  droppedPowerUps: PowerUpOnGrid[];
  destroyedPowerUps: Position[];
  killedPlayerIds: PlayerId[];
  /** Vrai si la partie vient de se terminer pendant ce tick. */
  ended: boolean;
}

/** Résultat d'un déplacement accepté par le moteur. */
export interface MoveResult {
  position: Position;
  /** Bonus ramassé sur la case d'arrivée, le cas échéant. */
  pickedPowerUp?: PowerUp;
}

const POWER_UP_KINDS = Object.values(PowerUp);

/**
 * Partie de Bomberman : orchestration du moteur de jeu.
 *
 * Cette classe est volontairement indépendante du réseau et de l'horloge :
 * l'instant courant est toujours passé en paramètre. Elle est pilotée par la
 * couche `server/` (GameController), qui appelle `update(now)` à chaque tick
 * et diffuse le `TickResult` obtenu.
 */
export class Game {
  private readonly grid: Grid;
  private readonly playersById = new Map<PlayerId, Player>();
  private readonly bombsById = new Map<string, Bomb>();
  private readonly powerUpsByCell = new Map<string, PowerUp>();

  private readonly bombFuseMs?: number;
  private readonly powerUpDropRate: number;
  private readonly random: () => number;

  private _status: GameStatus = GameStatus.Waiting;
  private _winnerId: PlayerId | null = null;

  constructor(config: GameConfig) {
    this.grid = config.grid instanceof Grid ? config.grid : Grid.generate(config.grid);
    for (const player of config.players) {
      this.playersById.set(player.id, player);
    }

    const dropRate = config.powerUpDropRate ?? DEFAULT_POWER_UP_DROP_RATE;
    if (dropRate < 0 || dropRate > 1) {
      throw new Error("Le taux d'apparition des bonus doit être compris entre 0 et 1.");
    }
    this.powerUpDropRate = dropRate;
    this.bombFuseMs = config.bombFuseMs;
    this.random = config.random ?? Math.random;
  }

  /**
   * Crée une partie prête à démarrer : génère le terrain puis place chaque
   * participant sur un point d'apparition (un coin par joueur).
   *
   * @param participants Joueurs de la partie (au plus un par point d'apparition).
   * @param options Génération du terrain (défaut : 13x11) et règles de la partie.
   * @throws {Error} S'il y a plus de participants que de points d'apparition.
   */
  static create(participants: Participant[], options: GameCreateOptions = {}): Game {
    const { grid: gridOptions, ...rules } = options;
    const generated = Grid.generate(
      gridOptions ?? { width: DEFAULT_GRID_WIDTH, height: DEFAULT_GRID_HEIGHT },
    );
    const spawns = generated.getSpawnPoints();

    if (participants.length > spawns.length) {
      throw new Error(`Une partie accepte au plus ${spawns.length} joueurs.`);
    }

    const players = participants.map(
      (participant, index) => new Player(participant.id, participant.name, spawns[index]),
    );
    return new Game({ ...rules, grid: generated, players });
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

  get alivePlayers(): Player[] {
    return this.players.filter((player) => player.isAlive);
  }

  get bombs(): Bomb[] {
    return [...this.bombsById.values()];
  }

  /** Bonus actuellement posés sur la grille. */
  get powerUps(): PowerUpOnGrid[] {
    return [...this.powerUpsByCell.entries()].map(([key, kind]) => ({
      position: parsePositionKey(key),
      kind,
    }));
  }

  getPlayer(playerId: PlayerId): Player | undefined {
    return this.playersById.get(playerId);
  }

  /** Bonus présent sur la case donnée, s'il y en a un. */
  getPowerUpAt(position: Position): PowerUp | undefined {
    return this.powerUpsByCell.get(positionKey(position));
  }

  /** Passe la partie en cours d'exécution. */
  start(): void {
    if (this._status !== GameStatus.Waiting) {
      throw new Error('La partie a déjà démarré.');
    }
    this._status = GameStatus.Running;
  }

  /**
   * Déplace un joueur d'une case dans la direction demandée.
   *
   * Le déplacement est refusé si la partie n'est pas en cours, si le joueur
   * est mort ou inconnu, s'il se déplace plus vite que sa vitesse ne le
   * permet, ou si la case visée est un mur, hors grille ou occupée par une
   * bombe. Un bonus présent sur la case d'arrivée est ramassé.
   *
   * @returns Le résultat du déplacement, ou null s'il est refusé.
   */
  movePlayer(
    playerId: PlayerId,
    direction: Direction,
    now: number = Date.now(),
  ): MoveResult | null {
    if (this._status !== GameStatus.Running) return null;

    const player = this.playersById.get(playerId);
    if (!player || !player.isAlive || !player.canMoveAt(now)) return null;

    const target = player.candidatePosition(direction);
    if (!this.grid.isWalkable(target) || this.hasBombAt(target)) return null;

    player.setPosition(target);
    player.markMoved(now);

    const pickedPowerUp = this.collectPowerUp(player, target);
    return pickedPowerUp ? { position: target, pickedPowerUp } : { position: target };
  }

  /**
   * Pose une bombe pour le joueur donné.
   *
   * @param playerId Identifiant du joueur poseur.
   * @param position Position de pose (par défaut : position actuelle du joueur).
   * @param now Instant de pose (ms), base du compte à rebours.
   * @returns La bombe instanciée ou null si la pose est impossible (quota atteint,
   *          case déjà occupée, joueur mort/inconnu, partie non démarrée).
   */
  plantBomb(playerId: PlayerId, position?: Position, now: number = Date.now()): Bomb | null {
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
      plantedAt: now,
      range: owner.bombRange,
      fuseMs: this.bombFuseMs,
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
   * Élimine un joueur hors explosion (ex : déconnexion en cours de partie),
   * puis vérifie si la partie est terminée.
   *
   * @returns Vrai si le joueur était vivant et vient d'être éliminé.
   */
  eliminatePlayer(playerId: PlayerId): boolean {
    if (this._status !== GameStatus.Running) return false;

    const player = this.playersById.get(playerId);
    if (!player || !player.isAlive) return false;

    player.die();
    this.checkEndOfGame();
    return true;
  }

  /**
   * Avance l'état de la partie à l'instant donné :
   * 1. fait exploser les bombes dont la mèche est écoulée, ainsi que les
   *    bombes touchées par ces explosions (réaction en chaîne) ;
   * 2. détruit les murs destructibles touchés (avec une chance de libérer un
   *    bonus) et les bonus déjà présents sur les cases touchées ;
   * 3. tue les joueurs présents sur les cases touchées ;
   * 4. termine la partie s'il reste au plus un survivant.
   */
  update(now: number): TickResult {
    const result: TickResult = {
      explosions: [],
      destroyedWalls: [],
      droppedPowerUps: [],
      destroyedPowerUps: [],
      killedPlayerIds: [],
      ended: false,
    };
    if (this._status !== GameStatus.Running) return result;

    result.explosions = this.detonateBombs(now);
    if (result.explosions.length === 0) return result;

    const hitCells = uniquePositions(result.explosions.flatMap((e) => e.affectedCells));

    this.applyBlastToGrid(hitCells, result);

    const hitKeys = new Set(hitCells.map(positionKey));
    for (const player of this.alivePlayers) {
      if (hitKeys.has(positionKey(player.position))) {
        player.die();
        result.killedPlayerIds.push(player.id);
      }
    }

    result.ended = this.checkEndOfGame();
    return result;
  }

  /** Fait exploser les bombes arrivées à terme et celles qu'elles déclenchent. */
  private detonateBombs(now: number): ExplosionEvent[] {
    const queue = this.bombs.filter((bomb) => bomb.hasExploded(now));
    const explosions: ExplosionEvent[] = [];

    while (queue.length > 0) {
      const bomb = queue.shift()!;
      if (!this.bombsById.delete(bomb.id)) continue;

      const affectedCells = new Explosion({
        origin: bomb.position,
        range: bomb.range,
      }).computeAffectedCells(this.grid);

      explosions.push({
        bombId: bomb.id,
        ownerId: bomb.ownerId,
        origin: { ...bomb.position },
        affectedCells,
      });

      // Réaction en chaîne : toute bombe soufflée explose dans le même tick.
      for (const cell of affectedCells) {
        const chained = this.getBombAt(cell);
        if (chained) queue.push(chained);
      }
    }

    return explosions;
  }

  /** Détruit murs et bonus touchés ; les murs détruits peuvent libérer un bonus. */
  private applyBlastToGrid(hitCells: Position[], result: TickResult): void {
    for (const cell of hitCells) {
      const key = positionKey(cell);

      if (this.grid.isDestructibleWall(cell)) {
        result.destroyedWalls.push(cell);
        const drop = this.rollPowerUp();
        if (drop) {
          this.grid.setCell(cell, TileKind.Bonus);
          this.powerUpsByCell.set(key, drop);
          result.droppedPowerUps.push({ position: cell, kind: drop });
        } else {
          this.grid.setCell(cell, TileKind.Empty);
        }
      } else if (this.powerUpsByCell.has(key)) {
        this.powerUpsByCell.delete(key);
        this.grid.setCell(cell, TileKind.Empty);
        result.destroyedPowerUps.push(cell);
      }
    }
  }

  /** Tire au sort le bonus libéré par un mur détruit (ou aucun). */
  private rollPowerUp(): PowerUp | undefined {
    if (this.powerUpDropRate === 0 || this.random() >= this.powerUpDropRate) return undefined;
    const index = Math.min(
      Math.floor(this.random() * POWER_UP_KINDS.length),
      POWER_UP_KINDS.length - 1,
    );
    return POWER_UP_KINDS[index];
  }

  /** Ramasse le bonus de la case (s'il existe) et l'applique au joueur. */
  private collectPowerUp(player: Player, position: Position): PowerUp | undefined {
    const key = positionKey(position);
    const powerUp = this.powerUpsByCell.get(key);
    if (!powerUp) return undefined;

    this.powerUpsByCell.delete(key);
    this.grid.setCell(position, TileKind.Empty);
    player.applyPowerUp(powerUp);
    return powerUp;
  }

  /**
   * Termine la partie quand il ne reste qu'un survivant (victoire) ou aucun
   * (match nul). Une partie lancée à un seul joueur se termine à sa mort.
   *
   * @returns Vrai si la partie vient de se terminer.
   */
  private checkEndOfGame(): boolean {
    if (this._status !== GameStatus.Running) return false;

    const alive = this.alivePlayers;
    const survivorsToEnd = this.playersById.size >= 2 ? 1 : 0;
    if (alive.length > survivorsToEnd) return false;

    this._status = GameStatus.Finished;
    this._winnerId = alive.length === 1 ? alive[0].id : null;
    return true;
  }
}

function positionKey(position: Position): string {
  return `${position.x},${position.y}`;
}

function parsePositionKey(key: string): Position {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

function uniquePositions(positions: Position[]): Position[] {
  const seen = new Map<string, Position>();
  for (const position of positions) {
    seen.set(positionKey(position), position);
  }
  return [...seen.values()];
}
