import type { Direction, GameStatus, PlayerId, PlayerState, Position } from '../engine/types.js';

/**
 * Typage complet du contrat Socket.IO.
 *
 * Le format exact de chaque message JSON est documenté dans `docs/protocol.md`
 * (exigence du module). Ces interfaces servent de source de vérité au typage
 * du serveur comme aux futurs tests d'intégration.
 */

/** --- Payloads reçus du client --------------------------------------------- */

/** Demande de rejoindre un lobby. */
export interface JoinRoomPayload {
  playerName: string;
}

/** Demande de déplacement (le serveur reste seul juge des collisions). */
export interface MovePayload {
  direction: Direction;
}

/** --- Payloads envoyés au client ------------------------------------------- */

/** Confirmation d'arrivée dans un lobby. */
export interface RoomJoinedPayload {
  lobbyId: string;
  playerId: PlayerId;
  playerNames: string[];
  minPlayers: number;
  maxPlayers: number;
}

/** Mise à jour de la liste des joueurs présents dans un lobby. */
export interface RoomPlayersPayload {
  lobbyId: string;
  playerNames: string[];
  minPlayers: number;
  maxPlayers: number;
}

/** État complet d'une partie (diffusé au démarrage et à chaque synchronisation). */
export interface GameStatePayload {
  status: GameStatus;
  grid: {
    width: number;
    height: number;
    tiles: string[][];
  };
  players: PlayerState[];
}

/** Nouvelle position validée d'un joueur. */
export interface PositionUpdatedPayload {
  playerId: PlayerId;
  position: Position;
}

/** Bombe posée (visible par tous). */
export interface BombPlantedPayload {
  bombId: string;
  ownerId: PlayerId;
  position: Position;
  fuseMs: number;
  range: number;
}

/** Explosion produite (cases impactées). */
export interface ExplosionOccurredPayload {
  origin: Position;
  affectedCells: Position[];
}

/** Un joueur vient de mourir. */
export interface PlayerDeadPayload {
  playerId: PlayerId;
}

/** Fin de partie. */
export interface GameEndPayload {
  winnerId: PlayerId | null;
}

/** Erreur applicative renvoyée au client. */
export interface ErrorPayload {
  message: string;
}

/** --- Ack de la demande de rejoindre un lobby ------------------------------ */

export interface JoinRoomResult {
  ok: true;
  lobbyId: string;
  playerNames: string[];
  minPlayers: number;
  maxPlayers: number;
}

/** --- Contrats Socket.IO ---------------------------------------------------- */

export interface ClientToServerEvents {
  'room:join': (payload: JoinRoomPayload, ack?: (result: JoinRoomResult) => void) => void;
  'room:leave': () => void;
  'player:move': (payload: MovePayload) => void;
  'player:plant-bomb': () => void;
  'player:ready': () => void;
}

export interface ServerToClientEvents {
  'room:joined': (payload: RoomJoinedPayload) => void;
  'room:players': (payload: RoomPlayersPayload) => void;
  'game:start': (payload: GameStatePayload) => void;
  'game:state': (payload: GameStatePayload) => void;
  'game:position': (payload: PositionUpdatedPayload) => void;
  'bomb:planted': (payload: BombPlantedPayload) => void;
  'explosion:occurred': (payload: ExplosionOccurredPayload) => void;
  'player:dead': (payload: PlayerDeadPayload) => void;
  'player:moved': (payload: PositionUpdatedPayload) => void;
  'game:end': (payload: GameEndPayload) => void;
  error: (payload: ErrorPayload) => void;
}
