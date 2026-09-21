import { Direction, PlayerId, Position } from './types.js';
import { PowerUp } from './PowerUp.js';

/**
 * Joueur contrôlé par un client.
 *
 * Le moteur (et non le client) fait autorité : position, vie et bonus sont
 * stockés ici. Les collisions sont validées par la grille avant tout
 * déplacement effectif (Phase 2).
 */
export class Player {
  readonly id: PlayerId;
  readonly name: string;

  private _position: Position;
  private _alive = true;
  private _maxBombs = 1;
  private _bombRange = 1;
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
        // TODO Phase 3 : la vitesse est dépendante du tick de déplacement.
        break;
    }
  }

  /** Tue le joueur (touché par une explosion). */
  die(): void {
    this._alive = false;
  }
}
