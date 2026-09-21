import { Application, Graphics, Text, TextStyle } from 'pixi.js'
import { GameSocketService } from './network/GameSocketService'
import { InputHandler } from './input/InputHandler'
import type {
  GameStatePayload,
  PlayerState,
  PlayerId,
  Position,
  PositionUpdatedPayload
} from './protocol/types'

// ── Couleurs des joueurs ────────────────────────────────────────────────────

const PLAYER_COLORS = [0xe94560, 0x00d2ff, 0x7bed9f, 0xffa502]

// ── État local ──────────────────────────────────────────────────────────────

interface LocalGameState {
  gridWidth: number
  gridHeight: number
  tiles: string[][]
  players: Map<PlayerId, PlayerState>
}

async function main(): Promise<void> {
  // ── PixiJS ──────────────────────────────────────────────────────────────

  const app = new Application()

  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1a1a2e,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  })

  document.getElementById('app')!.appendChild(app.canvas)

  // ── Couches de rendu ────────────────────────────────────────────────────

  const gridLayer = new Graphics()
  const playerLayer = new Graphics()
  app.stage.addChild(gridLayer)
  app.stage.addChild(playerLayer)

  // ── Titre ───────────────────────────────────────────────────────────────

  const titleStyle = new TextStyle({
    fontFamily: 'Arial',
    fontSize: 28,
    fontWeight: 'bold',
    fill: '#e94560',
    dropShadow: {
      color: '#e94560',
      blur: 10,
      distance: 0
    }
  })

  const title = new Text({ text: '💣 Bomberman Arena', style: titleStyle })
  title.x = window.innerWidth / 2 - title.width / 2
  title.y = 20
  app.stage.addChild(title)

  // ── Indicateur de connexion ─────────────────────────────────────────────

  const statusStyle = new TextStyle({
    fontFamily: 'Arial',
    fontSize: 16,
    fill: '#aaaaaa'
  })

  const statusText = new Text({ text: '⏳ Connexion au serveur…', style: statusStyle })
  statusText.x = 20
  statusText.y = window.innerHeight - 40
  app.stage.addChild(statusText)

  // ── État de la partie ───────────────────────────────────────────────────

  let gameState: LocalGameState | null = null
  let myPlayerId: PlayerId | null = null
  let cellSize = 0
  let offsetX = 0
  let offsetY = 0

  // ── Fonctions de rendu ──────────────────────────────────────────────────

  function computeLayout(): void {
    if (!gameState) return
    const { gridWidth, gridHeight } = gameState
    cellSize = Math.min(
      (window.innerWidth - 80) / gridWidth,
      (window.innerHeight - 120) / gridHeight
    )
    offsetX = (window.innerWidth - gridWidth * cellSize) / 2
    offsetY = (window.innerHeight - gridHeight * cellSize) / 2 + 30
  }

  function drawGrid(): void {
    if (!gameState) return
    gridLayer.clear()

    const { gridWidth, gridHeight, tiles } = gameState
    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridWidth; col++) {
        const x = offsetX + col * cellSize
        const y = offsetY + row * cellSize
        const tile = tiles[row]?.[col] ?? 'empty'

        let color: number
        switch (tile) {
          case 'indestructible_wall':
            color = 0x16213e
            break
          case 'destructible_wall':
            color = 0x533483
            break
          default:
            color = 0x0f3460
        }

        gridLayer.rect(x, y, cellSize - 1, cellSize - 1).fill(color)
      }
    }
  }

  function drawPlayers(): void {
    if (!gameState) return
    playerLayer.clear()

    let colorIndex = 0
    for (const [, player] of gameState.players) {
      if (!player.alive) {
        colorIndex++
        continue
      }

      const cx = offsetX + player.position.x * cellSize + cellSize / 2
      const cy = offsetY + player.position.y * cellSize + cellSize / 2
      const radius = cellSize * 0.35
      const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length]

      // Halo lumineux
      playerLayer.circle(cx, cy, radius + 4).fill({ color, alpha: 0.25 })
      // Corps du joueur
      playerLayer.circle(cx, cy, radius).fill(color)
      // Indicateur « c'est moi »
      if (player.id === myPlayerId) {
        playerLayer.circle(cx, cy, radius + 6)
        playerLayer.stroke({ color: 0xffffff, width: 2, alpha: 0.6 })
      }

      colorIndex++
    }
  }

  function renderAll(): void {
    computeLayout()
    drawGrid()
    drawPlayers()
  }

  // ── Grille placeholder (avant connexion) ────────────────────────────────

  function drawPlaceholderGrid(): void {
    gridLayer.clear()
    const gridSize = 15
    const cs = Math.min(window.innerWidth, window.innerHeight) / (gridSize + 2)
    const ox = (window.innerWidth - gridSize * cs) / 2
    const oy = (window.innerHeight - gridSize * cs) / 2

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = ox + col * cs
        const y = oy + row * cs
        const isWall = row % 2 === 1 && col % 2 === 1
        gridLayer.rect(x, y, cs - 1, cs - 1).fill(isWall ? 0x16213e : 0x0f3460)
      }
    }
  }

  drawPlaceholderGrid()

  // ── WebSocket ───────────────────────────────────────────────────────────

  const socketService = new GameSocketService()

  socketService.setCallbacks({
    onConnected() {
      statusText.text = '🟢 Connecté — en attente d\u0027une room…'
      statusText.style.fill = '#7bed9f'
    },

    onDisconnected(reason) {
      statusText.text = `🔴 Déconnecté : ${reason}`
      statusText.style.fill = '#e94560'
      gameState = null
      drawPlaceholderGrid()
      playerLayer.clear()
    },

    onRoomJoined(payload) {
      myPlayerId = payload.playerId
      statusText.text = `🏠 Lobby ${payload.lobbyId} — ${payload.playerNames.length}/${payload.maxPlayers} joueurs`
      statusText.style.fill = '#00d2ff'
    },

    onRoomPlayers(payload) {
      statusText.text = `🏠 Lobby ${payload.lobbyId} — ${payload.playerNames.length}/${payload.maxPlayers} joueurs`
    },

    onGameStart(payload: GameStatePayload) {
      applyGameState(payload)
      statusText.text = '🎮 Partie en cours !'
      statusText.style.fill = '#7bed9f'
    },

    onGameState(payload: GameStatePayload) {
      applyGameState(payload)
    },

    onPositionUpdated(payload: PositionUpdatedPayload) {
      if (!gameState) return
      const player = gameState.players.get(payload.playerId)
      if (player) {
        player.position = { ...payload.position }
        drawPlayers()
      }
    },

    onPlayerDead(payload) {
      if (!gameState) return
      const player = gameState.players.get(payload.playerId)
      if (player) {
        player.alive = false
        drawPlayers()
      }
    },

    onGameEnd(payload) {
      const msg = payload.winnerId
        ? `🏆 Victoire : ${payload.winnerId}`
        : '💀 Égalité !'
      statusText.text = msg
      statusText.style.fill = '#ffa502'
    },

    onError(payload) {
      console.error('[Game] Erreur:', payload.message)
      statusText.text = `⚠️ ${payload.message}`
      statusText.style.fill = '#e94560'
    }
  })

  function applyGameState(payload: GameStatePayload): void {
    const playersMap = new Map<PlayerId, PlayerState>()
    for (const p of payload.players) {
      playersMap.set(p.id, { ...p })
    }
    gameState = {
      gridWidth: payload.grid.width,
      gridHeight: payload.grid.height,
      tiles: payload.grid.tiles,
      players: playersMap
    }
    renderAll()
  }

  // ── Input clavier ───────────────────────────────────────────────────────

  const inputHandler = new InputHandler(socketService)
  inputHandler.bind()

  // ── Connexion ───────────────────────────────────────────────────────────

  socketService.connect()

  // ── Redimensionnement ───────────────────────────────────────────────────

  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
    title.x = window.innerWidth / 2 - title.width / 2
    statusText.y = window.innerHeight - 40

    if (gameState) {
      renderAll()
    } else {
      drawPlaceholderGrid()
    }
  })
}

main().catch(console.error)
