import { loadConfig } from './config.js';
import { GameServer } from './server/GameServer.js';

const config = loadConfig();
const server = new GameServer(config);

let shuttingDown = false;

/** Arrêt propre du serveur (SIGINT / SIGTERM). */
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[bomberman] ${signal} reçu, arrêt du serveur...`);
  await server.stop();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

async function main(): Promise<void> {
  await server.start();
  console.log(`[bomberman] Serveur démarré sur http://localhost:${server.port}`);
}

main().catch((error: unknown) => {
  console.error('[bomberman] Erreur au démarrage :', error);
  process.exit(1);
});
