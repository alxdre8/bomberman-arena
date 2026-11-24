// ---------- Navigation entre les pages ----------
// Ce module centralise l'affichage/cachage des différentes vues
// (menu, salon, jeu) pour éviter que le menu reste par dessus tout.

export function hideMenu(): void {
  document.querySelector<HTMLElement>('.menu-stage')?.classList.add('hidden');
  document.querySelector<HTMLElement>('.menu-footer')?.classList.add('hidden');
  document.getElementById('itchio-link')?.classList.add('hidden');
}

export function showMenu(): void {
  document.querySelector<HTMLElement>('.menu-stage')?.classList.remove('hidden');
  document.querySelector<HTMLElement>('.menu-footer')?.classList.remove('hidden');
  document.getElementById('itchio-link')?.classList.remove('hidden');
  document.getElementById('lobbies-page')?.classList.add('hidden');
}

export function showLobbies(): void {
  hideMenu();
  document.getElementById('lobbies-page')?.classList.remove('hidden');
}

export function showGame(): void {
  hideMenu();
  document.getElementById('lobbies-page')?.classList.add('hidden');
}
