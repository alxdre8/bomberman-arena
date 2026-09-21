/**
 * Types du protocole Socket.IO côté client.
 *
 * Miroir des types définis dans backend/src/protocol/types.ts et
 * backend/src/engine/types.ts. On les duplique ici pour ne pas créer
 * de dépendance directe du client vers le serveur.
 */

// ── Types moteur ────────────────────────────────────────────────────────────

export interface Position {
  x: number
  y: number
}

export enum Direction {
  Up = 'up',
  Down = 'down',
  Left = 'left',
  Right = 'right'
}

export enum TileKind {
  Empty = 'empty',
  IndestructibleWall = 'indestructible_wall',
  DestructibleWall = 'destructible_wall',
  Bonus = 'bonus'
}

export type PlayerId = string

export interface PlayerState {
  id: PlayerId
  name: string
  position: Position
  alive: boolean
  maxBombs: number
  bombRange: number
}

export enum GameStatus {
  Waiting = 'waiting',
  Running = 'running',
  Finished = 'finished'
}

// ── Payloads client → serveur ──────────────────────────────────────────────

export interface JoinRoomPayload {
  playerName: string
}

export interface MovePayload {
  direction: Direction
}

// ── Payloads serveur → client ──────────────────────────────────────────────

export interface RoomJoinedPayload {
  lobbyId: string
  playerId: PlayerId
  playerNames: string[]
  minPlayers: number
  maxPlayers: number
}

export interface RoomPlayersPayload {
  lobbyId: string
  playerNames: string[]
  minPlayers: number
  maxPlayers: number
}

export interface GameStatePayload {
  status: GameStatus
  grid: {
    width: number
    height: number
    tiles: string[][]
  }
  players: PlayerState[]
}

export interface PositionUpdatedPayload {
  playerId: PlayerId
  position: Position
}

export interface BombPlantedPayload {
  bombId: string
  ownerId: PlayerId
  position: Position
  fuseMs: number
  range: number
}

export interface ExplosionOccurredPayload {
  origin: Position
  affectedCells: Position[]
}

export interface PlayerDeadPayload {
  playerId: PlayerId
}

export interface GameEndPayload {
  winnerId: PlayerId | null
}

export interface ErrorPayload {
  message: string
}

export interface JoinRoomResult {
  ok: true
  lobbyId: string
  playerNames: string[]
  minPlayers: number
  maxPlayers: number
}

// ── Contrats Socket.IO ─────────────────────────────────────────────────────

export interface ClientToServerEvents {
  'room:join': (payload: JoinRoomPayload, ack?: (result: JoinRoomResult) => void) => void
  'room:leave': () => void
  'player:move': (payload: MovePayload) => void
  'player:plant-bomb': () => void
  'player:ready': () => void
}

export interface ServerToClientEvents {
  'room:joined': (payload: RoomJoinedPayload) => void
  'room:players': (payload: RoomPlayersPayload) => void
  'game:start': (payload: GameStatePayload) => void
  'game:state': (payload: GameStatePayload) => void
  'game:position': (payload: PositionUpdatedPayload) => void
  'bomb:planted': (payload: BombPlantedPayload) => void
  'explosion:occurred': (payload: ExplosionOccurredPayload) => void
  'player:dead': (payload: PlayerDeadPayload) => void
  'game:end': (payload: GameEndPayload) => void
  error: (payload: ErrorPayload) => void
}
