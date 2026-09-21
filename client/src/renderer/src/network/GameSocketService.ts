import { io, type Socket } from 'socket.io-client'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Direction,
  PlayerId,
  Position,
  GameStatePayload,
  PositionUpdatedPayload,
  RoomJoinedPayload,
  RoomPlayersPayload,
  BombPlantedPayload,
  ExplosionOccurredPayload,
  PlayerDeadPayload,
  GameEndPayload,
  ErrorPayload
} from '../protocol/types'

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/**
 * Callbacks enregistrés par le code de rendu (PixiJS) pour réagir
 * aux événements en provenance du serveur.
 */
export interface GameSocketCallbacks {
  onConnected?: () => void
  onDisconnected?: (reason: string) => void
  onRoomJoined?: (payload: RoomJoinedPayload) => void
  onRoomPlayers?: (payload: RoomPlayersPayload) => void
  onGameStart?: (payload: GameStatePayload) => void
  onGameState?: (payload: GameStatePayload) => void
  onPositionUpdated?: (payload: PositionUpdatedPayload) => void
  onBombPlanted?: (payload: BombPlantedPayload) => void
  onExplosionOccurred?: (payload: ExplosionOccurredPayload) => void
  onPlayerDead?: (payload: PlayerDeadPayload) => void
  onGameEnd?: (payload: GameEndPayload) => void
  onError?: (payload: ErrorPayload) => void
}

/**
 * Service de communication WebSocket avec le serveur de jeu.
 *
 * Encapsule la connexion Socket.IO et expose des méthodes typées
 * pour envoyer des actions (move, plant bomb, etc.) et recevoir
 * les mises à jour d'état.
 */
export class GameSocketService {
  private socket: GameSocket | null = null
  private callbacks: GameSocketCallbacks = {}

  /** URL du serveur (par défaut localhost:3000). */
  private readonly serverUrl: string

  constructor(serverUrl = 'http://localhost:3000') {
    this.serverUrl = serverUrl
  }

  /** Enregistre les callbacks de notification. */
  setCallbacks(callbacks: GameSocketCallbacks): void {
    this.callbacks = callbacks
  }

  /** Ouvre la connexion WebSocket. */
  connect(): void {
    if (this.socket?.connected) return

    this.socket = io(this.serverUrl, {
      transports: ['websocket'],
      autoConnect: true
    }) as GameSocket

    this.bindEvents()
  }

  /** Ferme proprement la connexion. */
  disconnect(): void {
    this.socket?.disconnect()
    this.socket = null
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  get playerId(): string | undefined {
    return this.socket?.id
  }

  // ── Actions envoyées au serveur ──────────────────────────────────────────

  /** Rejoindre un lobby avec un pseudo. */
  joinRoom(playerName: string): void {
    this.socket?.emit('room:join', { playerName })
  }

  /** Quitter le lobby actuel. */
  leaveRoom(): void {
    this.socket?.emit('room:leave')
  }

  /** Envoyer un déplacement dans une direction. */
  move(direction: Direction): void {
    this.socket?.emit('player:move', { direction })
  }

  /** Poser une bombe. */
  plantBomb(): void {
    this.socket?.emit('player:plant-bomb')
  }

  /** Se déclarer prêt. */
  ready(): void {
    this.socket?.emit('player:ready')
  }

  // ── Câblage des événements serveur → callbacks ───────────────────────────

  private bindEvents(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('[WS] Connecté au serveur:', this.socket?.id)
      this.callbacks.onConnected?.()
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Déconnecté:', reason)
      this.callbacks.onDisconnected?.(reason)
    })

    this.socket.on('room:joined', (payload) => {
      console.log('[WS] room:joined', payload)
      this.callbacks.onRoomJoined?.(payload)
    })

    this.socket.on('room:players', (payload) => {
      console.log('[WS] room:players', payload)
      this.callbacks.onRoomPlayers?.(payload)
    })

    this.socket.on('game:start', (payload) => {
      console.log('[WS] game:start', payload)
      this.callbacks.onGameStart?.(payload)
    })

    this.socket.on('game:state', (payload) => {
      console.log('[WS] game:state', payload)
      this.callbacks.onGameState?.(payload)
    })

    this.socket.on('game:position', (payload) => {
      console.log('[WS] game:position', payload)
      this.callbacks.onPositionUpdated?.(payload)
    })

    this.socket.on('bomb:planted', (payload) => {
      console.log('[WS] bomb:planted', payload)
      this.callbacks.onBombPlanted?.(payload)
    })

    this.socket.on('explosion:occurred', (payload) => {
      console.log('[WS] explosion:occurred', payload)
      this.callbacks.onExplosionOccurred?.(payload)
    })

    this.socket.on('player:dead', (payload) => {
      console.log('[WS] player:dead', payload)
      this.callbacks.onPlayerDead?.(payload)
    })

    this.socket.on('game:end', (payload) => {
      console.log('[WS] game:end', payload)
      this.callbacks.onGameEnd?.(payload)
    })

    this.socket.on('error', (payload) => {
      console.error('[WS] Erreur serveur:', payload.message)
      this.callbacks.onError?.(payload)
    })
  }
}
