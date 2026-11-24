import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280, // Largeur par défaut (ajuste si besoin)
    height: 720,
    title: 'Bomberman Arena',
    fullscreen: true, // Plein écran
    webPreferences: {
      preload: join(__dirname, './preload.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Écouteur pour quitter l'application
  ipcMain.on('quit-app', () => {
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});