/** Configuration applicative du serveur. */
export interface AppConfig {
  port: number;
  clientOrigin: string;
}

/** Valeurs par défaut utilisées hors environnement Docker. */
const DEFAULT_PORT = 3000;
const DEFAULT_CLIENT_ORIGIN = '*';

/**
 * Charge la configuration depuis les variables d'environnement.
 *
 * @param env Variables d'environnement (injectables pour les tests).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rawPort = env.PORT ?? '';
  const port = rawPort === '' ? DEFAULT_PORT : Number.parseInt(rawPort, 10);

  if (Number.isNaN(port) || port < 0) {
    throw new Error(`Variable PORT invalide : "${rawPort}".`);
  }

  return {
    port,
    clientOrigin: env.CLIENT_ORIGIN ?? DEFAULT_CLIENT_ORIGIN,
  };
}
