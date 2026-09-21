import { Direction } from '../protocol/types'
import { GameSocketService } from '../network/GameSocketService'

/**
 * Mappe les touches clavier aux directions de déplacement et aux actions,
 * puis envoie les événements correspondants via le GameSocketService.
 *
 * Supporte ZQSD (AZERTY) et les flèches directionnelles.
 */

/** Association touche → direction. */
const KEY_TO_DIRECTION: Record<string, Direction> = {
  // Flèches
  ArrowUp: Direction.Up,
  ArrowDown: Direction.Down,
  ArrowLeft: Direction.Left,
  ArrowRight: Direction.Right,
  // ZQSD (AZERTY)
  z: Direction.Up,
  s: Direction.Down,
  q: Direction.Left,
  d: Direction.Right,
  Z: Direction.Up,
  S: Direction.Down,
  Q: Direction.Left,
  D: Direction.Right,
  // WASD (QWERTY)
  w: Direction.Up,
  a: Direction.Left,
  W: Direction.Up,
  A: Direction.Left
}

/** Touche pour poser une bombe. */
const BOMB_KEYS = new Set(['e', 'E', ' '])

export class InputHandler {
  private readonly socketService: GameSocketService
  private readonly handleKeyDown: (e: KeyboardEvent) => void
  private readonly pressedKeys = new Set<string>()

  constructor(socketService: GameSocketService) {
    this.socketService = socketService

    this.handleKeyDown = (e: KeyboardEvent): void => {
      // Évite les doublons quand la touche reste enfoncée
      if (this.pressedKeys.has(e.key)) return
      this.pressedKeys.add(e.key)

      const direction = KEY_TO_DIRECTION[e.key]
      if (direction) {
        e.preventDefault()
        this.socketService.move(direction)
        return
      }

      if (BOMB_KEYS.has(e.key)) {
        e.preventDefault()
        this.socketService.plantBomb()
      }
    }
  }

  /** Commence à écouter les événements clavier. */
  bind(): void {
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', (e) => {
      this.pressedKeys.delete(e.key)
    })
  }

  /** Arrête l'écoute. */
  unbind(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
  }
}
