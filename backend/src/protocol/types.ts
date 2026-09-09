/**
 * Typage complet du contrat Socket.IO.
 *
 * Le format exact de chaque message JSON.
 * Ces interfaces servent de source de vérité au typage
 * du serveur comme aux futurs tests d'intégration.
 */

/** --- Payloads envoyés au client ------------------------------------------- */

/** Erreur applicative renvoyée au client. */
export interface ErrorPayload {
  message: string;
}

/** --- Contrats Socket.IO ---------------------------------------------------- */

export interface ClientToServerEvents {
  'player:ready': () => void;
}

export interface ServerToClientEvents {
  error: (payload: ErrorPayload) => void;
}
