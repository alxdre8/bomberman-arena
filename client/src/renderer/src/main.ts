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

  // --- Exemple de rendu PixiJS ---

  // Grille de jeu (placeholder Bomberman)
  const gridSize = 15
  const cellSize = Math.min(window.innerWidth, window.innerHeight) / (gridSize + 2)
  const offsetX = (window.innerWidth - gridSize * cellSize) / 2
  const offsetY = (window.innerHeight - gridSize * cellSize) / 2

  const grid = new Graphics()

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = offsetX + col * cellSize
      const y = offsetY + row * cellSize
      const isWall = row % 2 === 1 && col % 2 === 1

      grid
        .rect(x, y, cellSize - 1, cellSize - 1)
        .fill(isWall ? 0x16213e : 0x0f3460)
    }
  }

  app.stage.addChild(grid)

  // Titre
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

  const title = new Text({ text: '💣 Bomberman Arena', style })
  title.x = window.innerWidth / 2 - title.width / 2
  title.y = 20
  app.stage.addChild(title)

  // Redimensionnement
  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight)
  })
}

main().catch(console.error)
