import { Application, Assets, Graphics, Rectangle, Sprite, Text, TextStyle, Texture } from 'pixi.js'
import soldierIdlePath from './assets/sprites/Soldier_Idle.png'
import soldierWalkPath from './assets/sprites/Soldier_Walk.png'

// ── Spritesheet helpers ─────────────────────────────────────────────────────

const FRAME_SIZE = 100 // chaque frame = 100×100 px

/** Découpe un spritesheet horizontal en frames de 100×100. */
function splitSpritesheet(baseTexture: Texture, frameCount: number): Texture[] {
  const frames: Texture[] = []
  for (let i = 0; i < frameCount; i++) {
    const frame = new Rectangle(i * FRAME_SIZE, 0, FRAME_SIZE, FRAME_SIZE)
    frames.push(new Texture({ source: baseTexture.source, frame }))
  }
  return frames
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

  // ── Chargement des spritesheets ─────────────────────────────────────────

  let idleFrames: Texture[] = []
  let walkFrames: Texture[] = []
  let useSpritesheet = false

  try {
    const idleTexture = await Assets.load(soldierIdlePath) as Texture
    const walkTexture = await Assets.load(soldierWalkPath) as Texture

    idleFrames = splitSpritesheet(idleTexture, 6)
    walkFrames = splitSpritesheet(walkTexture, 8)
    useSpritesheet = idleFrames.length > 0 && walkFrames.length > 0
  } catch (err) {
    console.warn('Impossible de charger les sprites, fallback cercle:', err)
  }

  // ── Grille ──────────────────────────────────────────────────────────────

  const gridSize = 15
  const cellSize =
    Math.min(window.innerWidth, window.innerHeight) / (gridSize + 2)

  const offsetX = (window.innerWidth - gridSize * cellSize) / 2
  const offsetY = (window.innerHeight - gridSize * cellSize) / 2

  const grid = new Graphics()

  // On garde les murs dans un tableau.
  // true = mur
  // false = case libre
  const walls: boolean[][] = []

  for (let row = 0; row < gridSize; row++) {
    walls[row] = []

    for (let col = 0; col < gridSize; col++) {
      const x = offsetX + col * cellSize
      const y = offsetY + row * cellSize

      const isWall = row % 2 === 1 && col % 2 === 1

      walls[row][col] = isWall

      grid
        .rect(x, y, cellSize - 1, cellSize - 1)
        .fill(isWall ? 0x16213e : 0x0f3460)
    }
  }

  app.stage.addChild(grid)

  // ── Joueur (sprite animé ou fallback cercle) ────────────────────────────

  let playerRow = 0
  let playerCol = 0

  // État d'animation
  let currentFrames = idleFrames
  let currentFrameIndex = 0
  const animSpeed = 0.12 // frames par tick (≈ 7 fps à 60 fps)
  let animAccumulator = 0
  let isMoving = false

  // Création du personnage
  let player: Sprite | Graphics
  const spriteScale = (cellSize * 4.7) / FRAME_SIZE

  if (useSpritesheet) {
    const s = new Sprite(idleFrames[0])
    s.anchor.set(0.5, 0.5)
    s.scale.set(spriteScale)
    player = s
  } else {
    const g = new Graphics()
    g.circle(0, 0, cellSize * 0.35).fill(0xe94560)
    player = g
  }

  // Position initiale
  player.x = offsetX + playerCol * cellSize + cellSize / 2
  player.y = offsetY + playerRow * cellSize + cellSize / 2

  app.stage.addChild(player)

  // ── Animation loop ──────────────────────────────────────────────────────

  let idleTimer = 0

  if (useSpritesheet) {
    app.ticker.add(() => {
      animAccumulator += 1

      // Quand on bouge : parcourir les frames walk rapidement
      if (isMoving) {
        if (animAccumulator >= 1 / animSpeed) {
          animAccumulator = 0
          currentFrameIndex = (currentFrameIndex + 1) % currentFrames.length
          ;(player as Sprite).texture = currentFrames[currentFrameIndex]
        }
      } else {
        // Idle : animation plus lente
        idleTimer += 1
        if (idleTimer >= 10) {
          idleTimer = 0
          currentFrameIndex = (currentFrameIndex + 1) % currentFrames.length
          ;(player as Sprite).texture = currentFrames[currentFrameIndex]
        }
      }
    })
  }

  // Retour à idle après un court délai sans mouvement
  let moveTimeout: ReturnType<typeof setTimeout> | null = null

  function setMoving(): void {
    if (!isMoving) {
      isMoving = true
      currentFrames = walkFrames
      currentFrameIndex = 0
      animAccumulator = 0
    }
    if (moveTimeout) clearTimeout(moveTimeout)
    moveTimeout = setTimeout(() => {
      isMoving = false
      currentFrames = idleFrames
      currentFrameIndex = 0
      animAccumulator = 0
    }, 200)
  }

  // ── Déplacement ─────────────────────────────────────────────────────────

  function movePlayer(rowDirection: number, colDirection: number): void {
    const newRow = playerRow + rowDirection
    const newCol = playerCol + colDirection

    // Vérifie qu'on reste dans la grille
    if (
      newRow < 0 ||
      newRow >= gridSize ||
      newCol < 0 ||
      newCol >= gridSize
    ) {
      return
    }

    // Vérifie si la nouvelle case est un mur
    if (walls[newRow][newCol]) {
      return
    }

    // Flip horizontal selon la direction (sprite uniquement)
    if (useSpritesheet) {
      if (colDirection < 0) {
        player.scale.x = -Math.abs(spriteScale)
      } else if (colDirection > 0) {
        player.scale.x = Math.abs(spriteScale)
      }
    }

    // Mise à jour de la position logique
    playerRow = newRow
    playerCol = newCol

    // Mise à jour de la position graphique
    player.x = offsetX + playerCol * cellSize + cellSize / 2
    player.y = offsetY + playerRow * cellSize + cellSize / 2

    // Active l'animation de marche
    setMoving()
  }

  // Écoute du clavier
  window.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
      case 'w':
      case 'z':
        movePlayer(-1, 0)
        break

      case 's':
        movePlayer(1, 0)
        break

      case 'a':
      case 'q':
        movePlayer(0, -1)
        break

      case 'd':
        movePlayer(0, 1)
        break
    }
  })

  // ── Titre ───────────────────────────────────────────────────────────────

  const style = new TextStyle({
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

  const title = new Text({
    text: '💣 Bomberman Arena',
    style
  })

  title.x = window.innerWidth / 2 - title.width / 2
  title.y = 20

  app.stage.addChild(title)

  // ── Redimensionnement ───────────────────────────────────────────────────

  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
  })
}

main().catch(console.error)