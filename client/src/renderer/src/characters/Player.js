class Player {
    constructor(app, gridSize) {
        this.gridSize = gridSize;

        // Position dans la grille
        this.gridX = 1;
        this.gridY = 1;

        // Création du personnage
        this.sprite = new PIXI.Graphics();

        this.sprite.beginFill(0x3498db);
        this.sprite.drawRect(5, 5, gridSize - 10, gridSize - 10);
        this.sprite.endFill();

        // Position initiale en pixels
        this.updatePixelPosition();

        // Ajout à la scène
        app.stage.addChild(this.sprite);
    }

    updatePixelPosition() {
        this.sprite.x = this.gridX * this.gridSize;
        this.sprite.y = this.gridY * this.gridSize;
    }

    move(dx, dy) {
        this.gridX += dx;
        this.gridY += dy;

        this.updatePixelPosition();
    }
}