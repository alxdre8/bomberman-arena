import { showLobbies, showMenu } from './pages';

// ---------- Données des salons ----------
interface Lobby {
  id: string;
  host: string;
  map: string;
  mode: '1v1' | '2v2';
  players: number;
  maxPlayers: number;
  status: 'waiting' | 'in-progress';
  password: string | null;
  latency: number;
}

const LOBBIES: Lobby[] = [
  {
    id: 'arena-2a9f',
    host: 'Bastien Souris',
    map: 'Chantiers',
    mode: '2v2',
    players: 2,
    maxPlayers: 4,
    status: 'waiting',
    password: 'arena',
    latency: 24,
  },
  {
    id: 'arena-5c11',
    host: 'Sacha Mulawa',
    map: 'Ruines',
    mode: '1v1',
    players: 1,
    maxPlayers: 2,
    status: 'waiting',
    password: null,
    latency: 41,
  },
  {
    id: 'arena-8e44',
    host: 'Mattéo Lucas',
    map: 'Grottes',
    mode: '2v2',
    players: 4,
    maxPlayers: 4,
    status: 'in-progress',
    password: 'grottes',
    latency: 12,
  },
  {
    id: 'arena-1b77',
    host: 'Mathis Brongniart',
    map: 'Cité',
    mode: '1v1',
    players: 1,
    maxPlayers: 2,
    status: 'waiting',
    password: null,
    latency: 58,
  },
  {
    id: 'arena-9d33',
    host: 'Amaury Le Van',
    map: 'Désert',
    mode: '2v2',
    players: 3,
    maxPlayers: 4,
    status: 'waiting',
    password: 'd3s3rt',
    latency: 33,
  },
  {
    id: 'arena-4f66',
    host: 'Jules',
    map: 'Volcan',
    mode: '1v1',
    players: 1,
    maxPlayers: 2,
    status: 'in-progress',
    password: null,
    latency: 19,
  },
];

// ---------- État ----------
let activeFilter = 'all';

// ---------- Helpers ----------
function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c as string] ?? c),
  );
}

function statusLabel(l: Lobby): string {
  return l.status === 'waiting' ? 'En attente' : 'En cours';
}

function statusColor(l: Lobby): string {
  return l.status === 'waiting' ? '#ffe600' : '#ff2e63';
}

function dotPulse(): string {
  return 'scale(1)';
}

function formatPlayers(l: Lobby): string {
  const filled = Array.from({ length: l.maxPlayers }, (_, i) =>
    i < l.players ? '🟢' : '⬛',
  );
  return filled.join('');
}

function joinLabel(l: Lobby): string {
  return l.status === 'waiting' ? 'Rejoindre' : 'Plein';
}

function playerCountLabel(l: Lobby): string {
  return `${l.players}/${l.maxPlayers}`;
}

// ---------- Rendu ----------
function renderLobby(l: Lobby): HTMLElement {
  const el = document.createElement('div');
  el.className = 'lobby-card';
  if (l.status === 'in-progress') {
    el.classList.add('lobby-card-critical');
  }

  const badge = l.status === 'waiting' ? 'EN ATTENTE' : 'EN JEU';
  const badgeClass = l.status === 'waiting' ? 'lobby-badge-waiting' : 'lobby-badge-live';

  const row = document.createElement('div');
  row.className = 'lobby-row';

  const dot = document.createElement('span');
  dot.className = 'lobby-dot';
  dot.style.animationDelay = `${(l.id.length * 7) % 10}s`;

  const info = document.createElement('div');
  info.className = 'lobby-info';

  const host = document.createElement('span');
  host.className = 'lobby-host';
  host.textContent = `${esc(l.host)} (Host)`;

  const meta = document.createElement('span');
  meta.className = 'lobby-meta';
  meta.textContent = `${esc(l.map)} · ${l.mode} · ${esc(l.password ? `🔒 ${l.password}` : 'Ouvert')}`;

  info.append(host, meta);

  const statusWrap = document.createElement('div');
  statusWrap.className = 'lobby-status-wrap';

  const badgeEl = document.createElement('span');
  badgeEl.className = `lobby-badge ${badgeClass}`;
  badgeEl.textContent = badge;

  const latency = document.createElement('span');
  latency.className = 'lobby-latency';
  latency.textContent = `📡 ${l.latency} ms`;

  statusWrap.append(badgeEl, latency);

  const players = document.createElement('div');
  players.className = 'lobby-players';
  players.textContent = formatPlayers(l);

  row.append(dot, info, statusWrap, players);

  const actions = document.createElement('div');
  actions.className = 'lobby-actions';

  const joinBtn = document.createElement('button');
  joinBtn.className = l.status === 'waiting' ? 'lobby-join' : 'lobby-full';
  joinBtn.textContent = joinLabel(l);

  actions.append(joinBtn);

  el.append(row, actions);
  return el;
}

function renderList(): void {
  const listEl = document.getElementById('lobbies-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  const filtered =
    activeFilter === 'all'
      ? LOBBIES
      : LOBBIES.filter((l) => l.status === activeFilter);

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'lobbies-empty';
    empty.textContent = 'Aucun salon trouvé';
    listEl.appendChild(empty);
    return;
  }

  for (const lobby of filtered) {
    listEl.appendChild(renderLobby(lobby));
  }
}

function setFilter(filter: string): void {
  activeFilter = filter;
  document.querySelectorAll<HTMLElement>('.lobbies-filter').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderList();
}

// ---------- Écouteurs ----------
export function initLobbies(): void {
  const backBtn = document.getElementById('back-to-menu-btn');
  backBtn?.addEventListener('click', () => {
    showMenu();
  });

  document.querySelectorAll<HTMLElement>('.lobbies-filter').forEach((btn) => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter as string));
  });

  const listEl = document.getElementById('lobbies-list');
  if (listEl) renderList();

  setInterval(() => {
    if (!document.getElementById('lobbies-page')) return;
    const latencies = document.querySelectorAll<HTMLElement>('.lobby-latency');
    latencies.forEach((el) => {
      const base = parseInt(el.dataset.base ?? '0', 10);
      const jitter = Math.round((Math.random() * 20 - 10) % 21) - 10;
      el.dataset.base = String(base);
      el.textContent = `📡 ${base + jitter} ms`;
    });
  }, 2500);
}
