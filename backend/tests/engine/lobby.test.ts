import { describe, expect, it } from 'vitest';
import { Game } from '../../src/engine/Game.js';
import { Lobby } from '../../src/rooms/Lobby.js';
import type { PlayerConnection } from '../../src/rooms/PlayerConnection.js';
import { RoomManager } from '../../src/rooms/RoomManager.js';

describe('Lobby', () => {
  it('accueille entre 2 et 4 joueurs par défaut', () => {
    const lobby = new Lobby();

    expect(lobby.minPlayers).toBe(2);
    expect(lobby.maxPlayers).toBe(4);
    expect(lobby.hasStarted).toBe(false);
  });

  it('peut démarrer quand le minimum est atteint et que tous sont prêts', () => {
    const lobby = new Lobby({ minPlayers: 2 });
    lobby.add(fakePlayer('p1', 'Alice'));
    lobby.add(fakePlayer('p2', 'Bob'));

    expect(lobby.playerCount).toBe(2);
    expect(lobby.isFull).toBe(false);
    expect(lobby.canStart()).toBe(false);

    lobby.setPlayerReady('p1', true);
    expect(lobby.canStart()).toBe(false);

    lobby.setPlayerReady('p2', true);
    expect(lobby.canStart()).toBe(true);
  });

  it('ne peut pas démarrer avec un seul joueur prêt', () => {
    const lobby = new Lobby();
    lobby.add(fakePlayer('p1', 'Alice'));
    lobby.setPlayerReady('p1', true);

    expect(lobby.canStart()).toBe(false);
  });

  it('liste les joueurs prêts', () => {
    const lobby = new Lobby();
    lobby.add(fakePlayer('p1', 'Alice'));
    lobby.add(fakePlayer('p2', 'Bob'));
    lobby.setPlayerReady('p2', true);

    expect(lobby.getReadyPlayerNames()).toEqual(['Bob']);
  });

  it('verrouille le lobby et garde la partie au démarrage', () => {
    const lobby = readyLobby();
    const game = Game.create([
      { id: 'p1', name: 'Alice' },
      { id: 'p2', name: 'Bob' },
    ]);

    lobby.start(game);

    expect(lobby.hasStarted).toBe(true);
    expect(lobby.getGame()).toBe(game);
    expect(lobby.canStart()).toBe(false);
    expect(lobby.add(fakePlayer('p3', 'Carol'))).toBe(false);
  });

  it('refuse de démarrer si les conditions ne sont pas réunies', () => {
    const lobby = new Lobby();
    lobby.add(fakePlayer('p1', 'Alice'));
    lobby.add(fakePlayer('p2', 'Bob'));

    expect(() => lobby.start(Game.create([]))).toThrow();
    expect(lobby.hasStarted).toBe(false);
  });

  it('refuse au-delà de la capacité maximale', () => {
    const lobby = new Lobby({ maxPlayers: 2 });
    lobby.add(fakePlayer('p1', 'Alice'));
    lobby.add(fakePlayer('p2', 'Bob'));

    expect(lobby.add(fakePlayer('p3', 'Carol'))).toBe(false);
  });
});

describe('RoomManager', () => {
  it('réunit deux joueurs dans le même lobby', () => {
    const rooms = new RoomManager();

    const lobbyA = rooms.join(fakePlayer('p1', 'Alice'));
    const lobbyB = rooms.join(fakePlayer('p2', 'Bob'));

    expect(lobbyA.id).toBe(lobbyB.id);
    expect(lobbyA.playerCount).toBe(2);
  });

  it('retire un joueur qui quitte le lobby', () => {
    const rooms = new RoomManager();
    const alice = fakePlayer('p1', 'Alice');
    const lobby = rooms.join(alice);
    rooms.join(fakePlayer('p2', 'Bob'));

    const remaining = rooms.leave(alice.id);

    expect(remaining?.id).toBe(lobby.id);
    expect(remaining?.getPlayerNames()).toEqual(['Bob']);
  });

  it('supprime un lobby devenu vide', () => {
    const rooms = new RoomManager();
    const alice = fakePlayer('p1', 'Alice');
    const lobby = rooms.join(alice);

    const leftover = rooms.leave(alice.id);

    expect(leftover).toBeUndefined();
    expect(rooms.getLobby(lobby.id)).toBeUndefined();
  });
});

/** Lobby de deux joueurs prêts. */
function readyLobby(): Lobby {
  const lobby = new Lobby();
  lobby.add(fakePlayer('p1', 'Alice'));
  lobby.add(fakePlayer('p2', 'Bob'));
  lobby.setPlayerReady('p1', true);
  lobby.setPlayerReady('p2', true);
  return lobby;
}

/** Faux joueur suffisant pour tester lobby/room manager (aucune socket réelle). */
function fakePlayer(id: string, name: string): PlayerConnection {
  return { id, name } as unknown as PlayerConnection;
}
