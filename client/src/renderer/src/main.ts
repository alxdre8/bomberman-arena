import { Application, Graphics, Text, TextStyle } from 'pixi.js'

async function main(): Promise<void> {
  // Crée l'application PixiJS
  const app = new Application()

  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1a1a2e,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  })

  // Ajoute le canvas au DOM
  document.getElementById('app')!.appendChild(app.canvas)

  // --------------------------------------------------
  // GRILLE
  // --------------------------------------------------

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

  // --------------------------------------------------
  // JOUEUR
  // --------------------------------------------------

  // Position du joueur dans la grille
  let playerRow = 0
  let playerCol = 0

  // Création du personnage
  const player = new Graphics()

  player
    .circle(0, 0, cellSize * 0.35)
    .fill(0xe94560)

  // Position initiale du personnage
  player.x = offsetX + playerCol * cellSize + cellSize / 2
  player.y = offsetY + playerRow * cellSize + cellSize / 2

  app.stage.addChild(player)

  // --------------------------------------------------
  // DÉPLACEMENT
  // --------------------------------------------------

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

    // Mise à jour de la position logique
    playerRow = newRow
    playerCol = newCol

    // Mise à jour de la position graphique
    player.x = offsetX + playerCol * cellSize + cellSize / 2
    player.y = offsetY + playerRow * cellSize + cellSize / 2
  }

  // Écoute du clavier
  window.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
      case 'w':
        movePlayer(-1, 0)
        break

      case 's':
        movePlayer(1, 0)
        break

      case 'a':
        movePlayer(0, -1)
        break

      case 'd':
        movePlayer(0, 1)
        break
    }
  })

  // --------------------------------------------------
  // TITRE
  // --------------------------------------------------

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

  // --------------------------------------------------
  // REDIMENSIONNEMENT
  // --------------------------------------------------

  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
  })
}

main().catch(console.error);