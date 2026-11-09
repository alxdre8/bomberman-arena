// Déclare electronAPI pour TypeScript
declare const electronAPI: {
  quitApp: () => void;
};

// Fonction pour rejoindre une partie
function joinGame(): void {
  console.log("Rejoindre une partie...");
  alert("Fonctionnalité 'Rejoindre une partie' à implémenter.");
}

// Fonction pour créer une partie
async function createGame(): Promise<void> {
  console.log("Créer une partie...");

  // Masque le menu
  const menuContainer = document.querySelector('.menu-container') as HTMLElement;
  menuContainer.style.display = 'none';

  // Masque le lien itch.io (réservé au menu principal)
  const itchioLink = document.getElementById('itchio-link');
  if (itchioLink) itchioLink.style.display = 'none';

  // Charge le jeu PixiJS
  const { startGame } = await import('../main');
  await startGame();
}

// Fonction pour ouvrir les paramètres
function openSettings(): void {
  console.log("Ouvrir les paramètres...");
  alert("Fonctionnalité 'Paramètres' à implémenter.");
}

// Fonction pour ouvrir les crédits
function openCredits(): void {
  const modal = document.getElementById('credits-modal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

// Fonction pour fermer les crédits
function closeCredits(): void {
  const modal = document.getElementById('credits-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
}

// Fonction pour quitter le jeu
function quitGame(): void {
  if (electronAPI) {
    electronAPI.quitApp();
  } else {
    window.close();
  }
}

// Écouteurs d'événements pour les boutons
document.addEventListener('DOMContentLoaded', () => {
  const joinGameBtn = document.getElementById('join-game-btn');
  const createGameBtn = document.getElementById('create-game-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const creditsBtn = document.getElementById('credits-btn');
  const quitGameBtn = document.getElementById('quit-game-btn');
  const creditsModal = document.getElementById('credits-modal');
  const creditsCloseBtn = document.getElementById('credits-close-btn');
  const creditsCloseMainBtn = document.getElementById('credits-close-main-btn');
  const creditsBackdrop = creditsModal?.querySelector('.credits-modal-backdrop');

  joinGameBtn?.addEventListener('click', joinGame);
  createGameBtn?.addEventListener('click', createGame);
  settingsBtn?.addEventListener('click', openSettings);
  creditsBtn?.addEventListener('click', openCredits);
  quitGameBtn?.addEventListener('click', quitGame);

  creditsCloseBtn?.addEventListener('click', closeCredits);
  creditsCloseMainBtn?.addEventListener('click', closeCredits);
  creditsBackdrop?.addEventListener('click', closeCredits);

  const hotkeys: Record<string, () => void> = {
    r: joinGame,
    n: createGame,
    e: openSettings,
    c: openCredits,
    q: quitGame,
  };

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    if (key === 'escape') {
      closeCredits();
      return;
    }

    if (key in hotkeys) {
      event.preventDefault();
      hotkeys[key]();
    }
  });

  // ---------- Particules de l'arène ----------
  const arena = document.querySelector('.arena-bg') as HTMLElement;
  if (arena) {
    const palettes = ['#ff2e63', '#08f2d4', '#ff9f1c', '#7a2bff', '#ffe600'];
    let particleCount = 0;
    const target = 26;

    const spawnParticle = () => {
      if (particleCount >= target) return;
      const p = document.createElement('span');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.bottom = '-10px';
      p.style.background = palettes[Math.floor(Math.random() * palettes.length)];
      p.style.boxShadow = `0 0 8px ${p.style.background}`;
      const size = 4 + Math.random() * 5;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.animationDuration = (4 + Math.random() * 5) + 's';
      arena.appendChild(p);
      particleCount++;
      setTimeout(spawnParticle, 40);
    };

    spawnParticle();
  }
});