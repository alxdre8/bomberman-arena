/** Noms des événements échangés entre le client et le serveur. */
export const ClientEvent = {
  RoomJoin: 'room:join',
  RoomLeave: 'room:leave',
  PlayerMove: 'player:move',
  PlayerPlantBomb: 'player:plant-bomb',
  PlayerReady: 'player:ready',
} as const;

export const ServerEvent = {
  RoomJoined: 'room:joined',
  RoomPlayers: 'room:players',
  GameStart: 'game:start',
  GameState: 'game:state',
  GamePosition: 'game:position',
  BombPlanted: 'bomb:planted',
  ExplosionOccurred: 'explosion:occurred',
  PlayerDead: 'player:dead',
  GameEnd: 'game:end',
  Error: 'error',
} as const;

export type ClientEvent = (typeof ClientEvent)[keyof typeof ClientEvent];
export type ServerEvent = (typeof ServerEvent)[keyof typeof ServerEvent];
