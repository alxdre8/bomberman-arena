import { Direction, PlayerId, PlayerState, Position } from './types.js';
import { PowerUp } from './PowerUp.js';

/** Délai minimal (ms) entre deux déplacements d'un joueur sans bonus de vitesse. */
export const BASE_MOVE_DELAY_MS = 200;
/** Gain (ms) apporté par chaque bonus de vitesse. */
export const SPEED_BONUS_STEP_MS = 40;
/** Délai plancher (ms) : la vitesse ne peut pas augmenter au-delà. */
export const MIN_MOVE_DELAY_MS = 80;

/**
 * Joueur contrôlé par un client.
 *
 * Le moteur (et non le client) fait autorité : position, vie et bonus sont
 * stockés ici. Les collisions sont validées par le moteur (`Game.movePlayer`)
 * avant tout déplacement effectif.
 */
export class Player {
  readonly id: PlayerId;
  readonly name: string;

  private _position: Position;
  private _alive = true;
  private _maxBombs = 1;
  private _bombRange = 1;
  private _speed = 0;
  private _lastMoveAt = Number.NEGATIVE_INFINITY;
  private readonly _powerUps: PowerUp[] = [];

  constructor(id: PlayerId, name: string, spawn: Position) {
    this.id = id;
    this.name = name;
    this._position = { ...spawn };
  }

  get position(): Position {
    return { ...this._position };
  }

  get isAlive(): boolean {
    return this._alive;
  }

  get maxBombs(): number {
    return this._maxBombs;
  }

  get bombRange(): number {
    return this._bombRange;
  }

  /** Nombre de bonus de vitesse ramassés. */
  get speed(): number {
    return this._speed;
  }

  /** Délai minimal entre deux déplacements, réduit par les bonus de vitesse. */
  get moveDelayMs(): number {
    return Math.max(MIN_MOVE_DELAY_MS, BASE_MOVE_DELAY_MS - this._speed * SPEED_BONUS_STEP_MS);
  }

  /** Vrai si le délai depuis le dernier déplacement est écoulé à l'instant donné. */
  canMoveAt(now: number): boolean {
    return now - this._lastMoveAt >= this.moveDelayMs;
  }

  /** Mémorise l'instant du dernier déplacement effectif (base du délai suivant). */
  markMoved(now: number): void {
    this._lastMoveAt = now;
  }

  get powerUps(): PowerUp[] {
    return [...this._powerUps];
  }

  /** Positionne le joueur (après validation des collisions côté moteur). */
  setPosition(position: Position): void {
    this._position = { ...position };
  }

  /** Case candidate pour un déplacement dans la direction donnée (sans collision). */
  candidatePosition(direction: Direction): Position {
    switch (direction) {
      case Direction.Up:
        return { x: this._position.x, y: this._position.y - 1 };
      case Direction.Down:
        return { x: this._position.x, y: this._position.y + 1 };
      case Direction.Left:
        return { x: this._position.x - 1, y: this._position.y };
      case Direction.Right:
        return { x: this._position.x + 1, y: this._position.y };
    }
  }

  /** Applique l'effet d'un bonus ramassé. */
  applyPowerUp(powerUp: PowerUp): void {
    this._powerUps.push(powerUp);
    switch (powerUp) {
      case PowerUp.ExtraBomb:
        this._maxBombs += 1;
        break;
      case PowerUp.IncreaseRange:
        this._bombRange += 1;
        break;
      case PowerUp.IncreaseSpeed:
        this._speed += 1;
        break;
    }
  }

  /** Instantané sérialisable du joueur, diffusé aux clients. */
  toState(): PlayerState {
    return {
      id: this.id,
      name: this.name,
      position: this.position,
      alive: this._alive,
      maxBombs: this._maxBombs,
      bombRange: this._bombRange,
      speed: this._speed,
    };
  }

  /** Tue le joueur (touché par une explosion). */
  die(): void {
    this._alive = false;
  }
}
