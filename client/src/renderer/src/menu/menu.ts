// Déclare electronAPI pour TypeScript
declare const electronAPI: {
  quitApp: () => void;
};

import "../../styles.css";
import { initLobbies } from "./lobbies";
import { showLobbies, showGame, showMenu } from "./pages";

// Fonction pour rejoindre une partie
function joinGame(): void {
  showLobbies();
}

// Fonction pour créer une partie
async function createGame(): Promise<void> {
  showGame();

  // Charge le jeu PixiJS
  const { startGame } = await import("../main");
  await startGame();
}

// Fonction pour ouvrir les paramètres
function openSettings(): void {
  console.log("Ouvrir les paramètres...");
  alert("Fonctionnalité 'Paramètres' à implémenter.");
}

// Fonction pour ouvrir les crédits
function openCredits(): void {
  const modal = document.getElementById("credits-modal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

// Fonction pour fermer les crédits
function closeCredits(): void {
  const modal = document.getElementById("credits-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

// ---------- Menu ECHAP (accessible depuis n'importe quelle page) ----------
let echapOpen = false;

function openEchapMenu(): void {
  const echap = document.getElementById("echap-menu");
  if (!echap) return;
  echap.classList.add("open");
  echap.setAttribute("aria-hidden", "false");
  echapOpen = true;

  const echapToMenuBtn = document.getElementById("echap-to-menu-btn");
  const echapContinueBtn = document.getElementById("echap-continue-btn");
  const echapSettingsBtn = document.getElementById("echap-settings-btn");
  const echapQuitBtn = document.getElementById("echap-quit-btn");

  // On est sur une sous-page (salon ou jeu) => "Continuer" visible, "Retour au menu" visible
  const onSubPage =
    document.getElementById("lobbies-page") ||
    document.getElementById("app")?.classList.contains("block");

  echapContinueBtn?.classList.toggle("hidden", !onSubPage);
  echapToMenuBtn?.classList.toggle("hidden", !onSubPage);

  if (echapSettingsBtn) echapSettingsBtn.textContent = "Paramètres";
  if (echapQuitBtn) echapQuitBtn.textContent = "Quitter le jeu";
}

function closeEchapMenu(): void {
  const echap = document.getElementById("echap-menu");
  if (!echap) return;
  echap.classList.remove("open");
  echap.setAttribute("aria-hidden", "true");
  echapOpen = false;
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
document.addEventListener("DOMContentLoaded", () => {
  const joinGameBtn = document.getElementById("join-game-btn");
  const createGameBtn = document.getElementById("create-game-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const creditsBtn = document.getElementById("credits-btn");
  const quitGameBtn = document.getElementById("quit-game-btn");
  const creditsModal = document.getElementById("credits-modal");
  const creditsCloseBtn = document.getElementById("credits-close-btn");
  const creditsCloseMainBtn = document.getElementById("credits-close-main-btn");
  const creditsBackdrop = creditsModal?.querySelector(
    ".credits-modal-backdrop",
  );

  const echapModal = document.getElementById("echap-menu");
  const echapCloseBtn = document.getElementById("echap-close-btn");
  const echapBackdrop = echapModal?.querySelector(".echap-backdrop");
  const echapContinueBtn = document.getElementById("echap-continue-btn");
  const echapToMenuBtn = document.getElementById("echap-to-menu-btn");
  const echapSettingsBtn = document.getElementById("echap-settings-btn");
  const echapQuitBtn = document.getElementById("echap-quit-btn");

  joinGameBtn?.addEventListener("click", joinGame);
  createGameBtn?.addEventListener("click", createGame);
  settingsBtn?.addEventListener("click", openSettings);
  creditsBtn?.addEventListener("click", openCredits);
  quitGameBtn?.addEventListener("click", quitGame);

  creditsCloseBtn?.addEventListener("click", closeCredits);
  creditsCloseMainBtn?.addEventListener("click", closeCredits);
  creditsBackdrop?.addEventListener("click", closeCredits);

  // ---------- Écouteurs du menu ECHAP ----------
  echapCloseBtn?.addEventListener("click", closeEchapMenu);
  echapBackdrop?.addEventListener("click", closeEchapMenu);
  echapContinueBtn?.addEventListener("click", closeEchapMenu);
  echapToMenuBtn?.addEventListener("click", () => {
    (showMenu(), closeEchapMenu());
  });
  echapSettingsBtn?.addEventListener("click", openSettings);
  echapQuitBtn?.addEventListener("click", quitGame);

  // Initialise la page des salons (rendu, filtres, bouton retour, rafraîchissement)
  initLobbies();

  const hotkeys: Record<string, () => void> = {
    r: joinGame,
    n: createGame,
    e: openSettings,
    c: openCredits,
    q: quitGame,
  };

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (key === "escape") {
      if (echapOpen) {
        closeEchapMenu();
      } else if (
        document.getElementById("credits-modal")?.classList.contains("open")
      ) {
        closeCredits();
      } else if (
        !document.getElementById("menu-stage")?.classList.contains("hidden")
      ) {
        openEchapMenu();
      }
      return;
    }

    if (key in hotkeys) {
      event.preventDefault();
      hotkeys[key]();
    }
  });

  // ---------- Particules de l'arène ----------
  const arena = document.querySelector(".arena-bg") as HTMLElement;
  if (arena) {
    const palettes = ["#ff2e63", "#08f2d4", "#ff9f1c", "#7a2bff", "#ffe600"];
    let particleCount = 0;
    const target = 26;

    const spawnParticle = () => {
      if (particleCount >= target) return;
      const p = document.createElement("span");
      p.className = "particle";
      p.style.left = Math.random() * 100 + "%";
      p.style.bottom = "-10px";
      p.style.background =
        palettes[Math.floor(Math.random() * palettes.length)];
      p.style.boxShadow = `0 0 8px ${p.style.background}`;
      const size = 4 + Math.random() * 5;
      p.style.width = size + "px";
      p.style.height = size + "px";
      p.style.animationDuration = 4 + Math.random() * 5 + "s";
      arena.appendChild(p);
      particleCount++;
      setTimeout(spawnParticle, 40);
    };

    spawnParticle();
  }
});
