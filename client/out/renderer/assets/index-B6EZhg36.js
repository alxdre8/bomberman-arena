const scriptRel = /* @__PURE__ */ (function detectScriptRel() {
  const relList = typeof document !== "undefined" && document.createElement("link").relList;
  return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
})();
const assetsURL = function(dep, importerUrl) {
  return new URL(dep, importerUrl).href;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    let allSettled = function(promises$2) {
      return Promise.all(promises$2.map((p) => Promise.resolve(p).then((value$1) => ({
        status: "fulfilled",
        value: value$1
      }), (reason) => ({
        status: "rejected",
        reason
      }))));
    };
    const links = document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = allSettled(deps.map((dep) => {
      dep = assetsURL(dep, importerUrl);
      if (dep in seen) return;
      seen[dep] = true;
      const isCss = dep.endsWith(".css");
      const cssSelector = isCss ? '[rel="stylesheet"]' : "";
      if (!!importerUrl) for (let i$1 = links.length - 1; i$1 >= 0; i$1--) {
        const link$1 = links[i$1];
        if (link$1.href === dep && (!isCss || link$1.rel === "stylesheet")) return;
      }
      else if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) return;
      const link = document.createElement("link");
      link.rel = isCss ? "stylesheet" : scriptRel;
      if (!isCss) link.as = "script";
      link.crossOrigin = "";
      link.href = dep;
      if (cspNonce) link.setAttribute("nonce", cspNonce);
      document.head.appendChild(link);
      if (isCss) return new Promise((res, rej) => {
        link.addEventListener("load", res);
        link.addEventListener("error", () => rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`)));
      });
    }));
  }
  function handlePreloadError(err$2) {
    const e$1 = new Event("vite:preloadError", { cancelable: true });
    e$1.payload = err$2;
    window.dispatchEvent(e$1);
    if (!e$1.defaultPrevented) throw err$2;
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
function joinGame() {
  console.log("Rejoindre une partie...");
  alert("Fonctionnalité 'Rejoindre une partie' à implémenter.");
}
async function createGame() {
  console.log("Créer une partie...");
  const menuContainer = document.querySelector(".menu-container");
  menuContainer.style.display = "none";
  const itchioLink = document.getElementById("itchio-link");
  if (itchioLink) itchioLink.style.display = "none";
  const { startGame } = await __vitePreload(async () => {
    const { startGame: startGame2 } = await import("./main-CY5ZHvl4.js").then((n) => n.au);
    return { startGame: startGame2 };
  }, true ? [] : void 0, import.meta.url);
  await startGame();
}
function openSettings() {
  console.log("Ouvrir les paramètres...");
  alert("Fonctionnalité 'Paramètres' à implémenter.");
}
function openCredits() {
  const modal = document.getElementById("credits-modal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}
function closeCredits() {
  const modal = document.getElementById("credits-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}
function quitGame() {
  if (electronAPI) {
    electronAPI.quitApp();
  } else {
    window.close();
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const joinGameBtn = document.getElementById("join-game-btn");
  const createGameBtn = document.getElementById("create-game-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const creditsBtn = document.getElementById("credits-btn");
  const quitGameBtn = document.getElementById("quit-game-btn");
  const creditsModal = document.getElementById("credits-modal");
  const creditsCloseBtn = document.getElementById("credits-close-btn");
  const creditsCloseMainBtn = document.getElementById("credits-close-main-btn");
  const creditsBackdrop = creditsModal?.querySelector(".credits-modal-backdrop");
  joinGameBtn?.addEventListener("click", joinGame);
  createGameBtn?.addEventListener("click", createGame);
  settingsBtn?.addEventListener("click", openSettings);
  creditsBtn?.addEventListener("click", openCredits);
  quitGameBtn?.addEventListener("click", quitGame);
  creditsCloseBtn?.addEventListener("click", closeCredits);
  creditsCloseMainBtn?.addEventListener("click", closeCredits);
  creditsBackdrop?.addEventListener("click", closeCredits);
  const hotkeys = {
    r: joinGame,
    n: createGame,
    e: openSettings,
    c: openCredits,
    q: quitGame
  };
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "escape") {
      closeCredits();
      return;
    }
    if (key in hotkeys) {
      event.preventDefault();
      hotkeys[key]();
    }
  });
  const arena = document.querySelector(".arena-bg");
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
      p.style.background = palettes[Math.floor(Math.random() * palettes.length)];
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
export {
  __vitePreload as _
};
