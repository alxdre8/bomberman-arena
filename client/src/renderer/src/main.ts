import { Application, Graphics, Text, TextStyle } from 'pixi.js';

let gameApp: Application | null = null;

export async function startGame(): Promise<void> {
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error("Le conteneur #app est introuvable !");
    return;
  }

  appContainer.style.display = 'block';

  gameApp = new Application();

  await gameApp.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x0b1129,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  appContainer.appendChild(gameApp.canvas);

  const w = window.innerWidth;
  const h = window.innerHeight;
  const gridSize = 15;
  const cellSize = Math.min(w, h) / (gridSize + 2);
  const offsetX = (w - gridSize * cellSize) / 2;
  const offsetY = (h - gridSize * cellSize) / 2;

  // Terrain
  const ground = new Graphics();
  ground
    .rect(0, 0, w, h)
    .fill(0x0a0f26);
  ground.stroke(0x2a3b8f);
  ground.lineStyle(4, 0x2a3b8f, 0.25);
  gameApp.stage.addChild(ground);

  // Grille de lignes néon
  const grid = new Graphics();
  for (let i = 0; i <= gridSize; i++) {
    const pos = offsetX + i * cellSize;
    grid.moveTo(pos, offsetY);
    grid.lineTo(pos, offsetY + gridSize * cellSize);
    grid.moveTo(offsetX, pos);
    grid.lineTo(offsetX + gridSize * cellSize, pos);
  }
  grid.stroke({ color: 0x1e2b6e, width: 2, alpha: 0.5 });
  gameApp.stage.addChild(grid);

  // Cases de bombes + tuyaux
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = offsetX + col * cellSize;
      const y = offsetY + row * cellSize;
      const isWall = row % 2 === 1 && col % 2 === 1;
      const isOpen = (row + col) % 3 === 0;

      if (isWall) {
        const brick = new Graphics();
        brick
          .rect(x + 2, y + 2, cellSize - 4, cellSize - 4)
          .fill(0x1b2450);
        brick.stroke(0x3a4d9e);
        brick.lineStyle(2, 0x3a4d9e, 0.85);
        gameApp.stage.addChild(brick);

        // Tuyau décoratif sur certains murs
        if (isOpen && (row * 7 + col * 5) % 4 === 0) {
          const pipe = new Graphics();
          pipe
            .roundRect(x + 6, y + 6, cellSize - 12, cellSize - 12, 8)
            .fill(0x08f2d4);
          pipe.stroke(0x16f2dc);
          pipe.lineStyle(2, 0x16f2dc, 0.6);
          gameApp.stage.addChild(pipe);
        }
      }
    }
  }

  // Bombes décoratives flottantes
  const bombStyle = new TextStyle({
    fontFamily: 'Arial',
    fontSize: 30,
    fontWeight: 'bold',
    fill: '#ff2e63',
    stroke: { color: '#ffffff', width: 3 },
    dropShadow: {
      color: '#ff2e63',
      blur: 16,
      distance: 0,
    },
  });

  for (let i = 0; i < 6; i++) {
    const bomb = new Text({
      text: '💣',
      style: bombStyle,
      x: Math.random() * (w - 120) + 60,
      y: Math.random() * (h - 120) + 60,
    });
    gameApp.stage.addChild(bomb);
  }

  // Effet de scintillement au centre
  const flare = new Graphics();
  flare.alpha = 0.5;
  flare.beginFill(0xffe600, 0.5);
  flare.drawCircle(w / 2, h / 2, Math.min(w, h) * 0.25);
  flare.endFill();
  gameApp.stage.addChild(flare);

  // Titre
  const titleStyle = new TextStyle({
    fontFamily: 'Impact, Arial Black',
    fontSize: 40,
    fontWeight: 'bold',
    fill: '#ff2e63',
    stroke: { color: '#ffffff', width: 6 },
    dropShadow: {
      color: '#ff2e63',
      blur: 14,
      distance: 0,
    },
  });

  const title = new Text({ text: 'Bomberman Arena', style: titleStyle });
  title.x = w / 2 - title.width / 2;
  title.y = 30;
  gameApp.stage.addChild(title);

  // Redimensionnement
  window.addEventListener('resize', () => {
    if (gameApp) {
      gameApp.renderer.resize(window.innerWidth, window.innerHeight);
    }
  });

  if (gameApp) {
    gameApp.renderer.resize(window.innerWidth, window.innerHeight);
  }
}
