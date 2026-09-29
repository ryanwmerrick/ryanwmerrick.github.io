import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=8';
import {
  computeRatings, overallTable, weeklyTable, weekStart, addDays, today, compareGames, MIN_GAMES,
} from './rank.js?v=8';

const TEAMS = [
  ['ANA', 'Anaheim Ducks'], ['BOS', 'Boston Bruins'], ['BUF', 'Buffalo Sabres'],
  ['CGY', 'Calgary Flames'], ['CAR', 'Carolina Hurricanes'], ['CHI', 'Chicago Blackhawks'],
  ['COL', 'Colorado Avalanche'], ['CBJ', 'Columbus Blue Jackets'], ['DAL', 'Dallas Stars'],
  ['DET', 'Detroit Red Wings'], ['EDM', 'Edmonton Oilers'], ['FLA', 'Florida Panthers'],
  ['LAK', 'Los Angeles Kings'], ['MIN', 'Minnesota Wild'], ['MTL', 'Montréal Canadiens'],
  ['NSH', 'Nashville Predators'], ['NJD', 'New Jersey Devils'], ['NYI', 'New York Islanders'],
  ['NYR', 'New York Rangers'], ['OTT', 'Ottawa Senators'], ['PHI', 'Philadelphia Flyers'],
  ['PIT', 'Pittsburgh Penguins'], ['SJS', 'San Jose Sharks'], ['SEA', 'Seattle Kraken'],
  ['STL', 'St. Louis Blues'], ['TBL', 'Tampa Bay Lightning'], ['TOR', 'Toronto Maple Leafs'],
  ['UTA', 'Utah Mammoth'], ['VAN', 'Vancouver Canucks'], ['VGK', 'Vegas Golden Knights'],
  ['WSH', 'Washington Capitals'], ['WPG', 'Winnipeg Jets'],
];
const MAX_SCORE = 30;
const PAGE = 15;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDay = (s) => new Date(s + 'T00:00:00Z')
  .toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
const signed = (x) => {
  const n = Math.round(x);
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0';
};
const record = (r) => `${r.w}-${r.l}-${r.otl}`;

const configured = SUPABASE_URL.startsWith('https://') && !SUPABASE_ANON_KEY.startsWith('YOUR_');
const db = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const state = {
  view: 'week',
  week: weekStart(today()),
  players: [],
  games: [],
  calc: null,
  loaded: false,
  error: null,
  shown: PAGE,
};
let form = null;
let newSide = null;

// ---------- Data ----------

async function load() {
  const [p, g] = await Promise.all([
    db.from('players').select('*').order('name'),
    db.from('games').select('*'),
  ]);
  const err = p.error || g.error;
  if (err) {
    state.error = err.message;
  } else {
    state.error = null;
    state.players = p.data;
    state.games = g.data;
    state.calc = computeRatings(p.data, g.data);
  }
  state.loaded = true;
  render();
  if (form) fillPlayerOptions();
}

let reloadTimer;
function reload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(load, 150);
}

const playerName = (id) => state.calc?.stats.get(id)?.name ?? '?';

// ---------- Leaderboard ----------

function render() {
  renderBoard();
  renderResults();
}

function renderBoard() {
  const board = $('board');
  document.querySelectorAll('[data-view]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.view === state.view));
  });
  $('weekNav').hidden = state.view !== 'week';
  renderWeekNav();

  if (!configured) {
    board.innerHTML = '<p class="empty">Not connected yet. Add the Supabase URL and key to <code>config.js</code>.</p>';
    return;
  }
  if (state.error) {
    board.innerHTML = `<p class="empty">Couldn't load games: ${esc(state.error)}</p>`;
    return;
  }
  if (!state.loaded) {
    board.innerHTML = '<p class="empty">Loading…</p>';
    return;
  }
  board.innerHTML = state.view === 'week' ? weekHtml() : overallHtml();
}

function renderWeekNav() {
  const current = weekStart(today());
  const first = state.games.length
    ? weekStart(state.games.reduce((m, g) => (g.played_on < m ? g.played_on : m), state.games[0].played_on))
    : current;
  $('prevWeek').disabled = state.week <= first;
  $('nextWeek').disabled = state.week >= current;
  $('weekTag').textContent = state.week === current ? 'This week'
    : state.week === addDays(current, -7) ? 'Last week' : 'Week of';
  $('weekRange').textContent = `${fmtDay(state.week)} – ${fmtDay(addDays(state.week, 6))}`;
}

const rowHtml = (rank, r, val, cls = '') => `
  <li class="row">
    <span class="rank">${rank}</span>
    <span class="who"><span class="name">${esc(r.name)}</span><span class="rec">${record(r)}</span></span>
    <span class="val ${cls}">${val}</span>
  </li>`;

const headHtml = (right) => `<div class="board-head"><span>Player · W-L-OTL</span><span>${right}</span></div>`;

function weekHtml() {
  const rows = weeklyTable(state.calc, state.games, state.week);
  if (!rows.length) return '<p class="empty">No games this week.</p>';
  return headHtml('Pts') + `<ol class="board">${rows
    .map((r, i) => rowHtml(i + 1, r, signed(r.points), r.points < 0 ? 'neg' : ''))
    .join('')}</ol>`;
}

function overallHtml() {
  const { ranked, unranked } = overallTable(state.calc);
  if (!ranked.length && !unranked.length) return '<p class="empty">No players yet. Log a game to get started.</p>';
  let html = ranked.length
    ? headHtml('Rating') + `<ol class="board">${ranked
      .map((r, i) => rowHtml(i + 1, r, Math.round(r.rating)))
      .join('')}</ol>`
    : `<p class="empty">Nobody has ${MIN_GAMES} games yet.</p>`;
  if (unranked.length) {
    html += `<p class="sub">Not ranked yet</p><ul class="pending">${unranked
      .map((r) => `<li><span>${esc(r.name)}</span><span>${r.games}/${MIN_GAMES} games</span></li>`)
      .join('')}</ul>`;
  }
  return html;
}

// ---------- Recent results ----------

function renderResults() {
  const list = $('results');
  if (!configured || !state.loaded || state.error) {
    list.innerHTML = '';
    $('moreBtn').hidden = true;
    return;
  }
  const games = [...state.games].sort(compareGames).reverse();
  if (!games.length) {
    list.innerHTML = '<li class="empty">No games yet.</li>';
    $('moreBtn').hidden = true;
    return;
  }
  list.innerHTML = games.slice(0, state.shown).map(resultHtml).join('');
  $('moreBtn').hidden = games.length <= state.shown;
}

function resultHtml(g) {
  // Scoreboard order: away on the left, home on the right, winner in bold.
  const aWon = g.score_a > g.score_b;
  const d = state.calc.perGame.get(g.id);
  const change = d ? signed(aWon ? d.a : d.b) : '';
  const teams = g.team_a || g.team_b ? `${g.team_a || '—'} @ ${g.team_b || '—'}` : '';
  return `
    <li><button type="button" class="result" data-game="${g.id}">
      <span class="score-line">
        <span class="p ${aWon ? 'win' : 'lose'}">${esc(playerName(g.player_a))}</span>
        <span class="score">${g.score_a}–${g.score_b}</span>
        <span class="p ${aWon ? 'lose' : 'win'}">${esc(playerName(g.player_b))}</span>
      </span>
      <span class="meta">
        <span>${fmtDay(g.played_on)}${teams ? ` · ${teams}` : ''}${g.ot ? ' · <span class="tag">OT</span>' : ''}</span>
        <span>${change}</span>
      </span>
    </button></li>`;
}

// ---------- Sheet ----------

function fillTeamOptions() {
  const opts = '<option value="">Team (optional)</option>'
    + TEAMS.map(([abbr, name]) => `<option value="${abbr}">${esc(name)}</option>`).join('');
  document.querySelectorAll('select.team').forEach((s) => { s.innerHTML = opts; });
}

function fillPlayerOptions() {
  const opts = '<option value="">Select player</option>'
    + state.players.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')
    + '<option value="__new">+ New player…</option>';
  document.querySelectorAll('select.player').forEach((s) => { s.innerHTML = opts; });
  syncForm();
}

function syncForm() {
  for (const side of ['a', 'b']) {
    const f = form[side];
    document.querySelector(`select.player[data-side="${side}"]`).value = f.player;
    document.querySelector(`select.team[data-side="${side}"]`).value = f.team;
    $(`score-${side}`).textContent = f.score;
    document.querySelector(`[data-side="${side}"][data-step="-1"]`).disabled = f.score <= 0;
    document.querySelector(`[data-side="${side}"][data-step="1"]`).disabled = f.score >= MAX_SCORE;
  }
  $('ot').checked = form.ot;
  $('date').value = form.date;
}

function openSheet(game) {
  form = game
    ? {
      id: game.id,
      a: { player: game.player_a, team: game.team_a || '', score: game.score_a },
      b: { player: game.player_b, team: game.team_b || '', score: game.score_b },
      ot: game.ot,
      date: game.played_on,
    }
    : {
      id: null,
      a: { player: '', team: '', score: 0 },
      b: { player: '', team: '', score: 0 },
      ot: false,
      date: today(),
    };
  $('sheetTitle').textContent = game ? 'Edit game' : 'Log a game';
  $('saveBtn').textContent = game ? 'Save changes' : 'Save game';
  $('deleteBtn').hidden = !game;
  $('formError').textContent = '';
  hideNewPlayer();
  fillPlayerOptions();

  const sheet = $('sheet');
  sheet.hidden = false;
  document.body.style.overflow = 'hidden';
  sheet.offsetHeight; // commit the start position so the slide-in animates
  sheet.classList.add('open');
}

function closeSheet() {
  const sheet = $('sheet');
  sheet.classList.remove('open');
  document.body.style.overflow = '';
  form = null;
  setTimeout(() => { if (!form) sheet.hidden = true; }, 280);
}

// Team the player used most recently, ignoring the game being edited.
function lastTeam(playerId, excludeId) {
  let best = null;
  for (const g of state.games) {
    if (g.id === excludeId) continue;
    const team = g.player_a === playerId ? g.team_a : g.player_b === playerId ? g.team_b : null;
    if (team && (!best || compareGames(g, best.g) > 0)) best = { g, team };
  }
  return best?.team ?? '';
}

function showNewPlayer(side) {
  newSide = side;
  $('newLabel').textContent = `New ${side === 'a' ? 'away' : 'home'} player`;
  $('newPlayer').hidden = false;
  $('newName').value = '';
  $('newName').focus();
}

function hideNewPlayer() {
  newSide = null;
  $('newPlayer').hidden = true;
}

async function addPlayer() {
  const name = $('newName').value.trim().replace(/\s+/g, ' ');
  if (!name) return;
  if (state.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    $('formError').textContent = `${name} is already a player.`;
    return;
  }
  const { data, error } = await db.from('players').insert({ name }).select().single();
  if (error) {
    $('formError').textContent = error.code === '23505' ? `${name} is already a player.` : error.message;
    return;
  }
  $('formError').textContent = '';
  state.players = [...state.players, data].sort((x, y) => x.name.localeCompare(y.name));
  if (form && newSide) form[newSide] = { ...form[newSide], player: data.id };
  hideNewPlayer();
  fillPlayerOptions();
  reload();
}

function validate() {
  const { a, b } = form;
  if (!a.player || !b.player) return 'Pick both players.';
  if (a.player === b.player) return 'Pick two different players.';
  if (a.score === b.score) return 'No ties. Someone has to win.';
  if (form.ot && Math.abs(a.score - b.score) !== 1) return 'OT and shootout games are decided by one goal.';
  if (!form.date) return 'Pick a date.';
  return null;
}

async function save() {
  const problem = validate();
  $('formError').textContent = problem ?? '';
  if (problem) return;

  const row = {
    player_a: form.a.player,
    player_b: form.b.player,
    score_a: form.a.score,
    score_b: form.b.score,
    team_a: form.a.team || null,
    team_b: form.b.team || null,
    ot: form.ot,
    played_on: form.date,
  };
  const btn = $('saveBtn');
  btn.disabled = true;
  const { error } = form.id
    ? await db.from('games').update(row).eq('id', form.id)
    : await db.from('games').insert(row);
  btn.disabled = false;
  if (error) {
    $('formError').textContent = error.message;
    return;
  }
  state.week = weekStart(row.played_on);
  closeSheet();
  await load();
}

async function remove() {
  if (!form?.id || !confirm('Delete this game?')) return;
  const { error } = await db.from('games').delete().eq('id', form.id);
  if (error) {
    $('formError').textContent = error.message;
    return;
  }
  closeSheet();
  await load();
}

// ---------- Wiring ----------

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  state.view = b.dataset.view;
  renderBoard();
}));
$('prevWeek').addEventListener('click', () => { state.week = addDays(state.week, -7); renderBoard(); });
$('nextWeek').addEventListener('click', () => { state.week = addDays(state.week, 7); renderBoard(); });
$('moreBtn').addEventListener('click', () => { state.shown += PAGE; renderResults(); });

$('logBtn').addEventListener('click', () => {
  if (!configured) return alert('Connect Supabase in config.js first.');
  openSheet(null);
});
$('results').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-game]');
  const game = btn && state.games.find((g) => g.id === btn.dataset.game);
  if (game) openSheet(game);
});

$('sheet').addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) closeSheet();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && form) closeSheet();
});

document.querySelectorAll('select.player').forEach((s) => s.addEventListener('change', () => {
  const side = s.dataset.side;
  if (s.value === '__new') {
    s.value = form[side].player;
    showNewPlayer(side);
    return;
  }
  form[side].player = s.value;
  const team = s.value && lastTeam(s.value, form.id);
  if (team) form[side].team = team;
  syncForm();
}));
document.querySelectorAll('select.team').forEach((s) => s.addEventListener('change', () => {
  form[s.dataset.side].team = s.value;
}));
document.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
  const f = form[b.dataset.side];
  f.score = Math.min(MAX_SCORE, Math.max(0, f.score + Number(b.dataset.step)));
  syncForm();
}));
$('ot').addEventListener('change', (e) => { form.ot = e.target.checked; });
$('date').addEventListener('change', (e) => { form.date = e.target.value; });

$('newPlayer').addEventListener('submit', (e) => { e.preventDefault(); addPlayer(); });
$('cancelNew').addEventListener('click', hideNewPlayer);
$('saveBtn').addEventListener('click', save);
$('deleteBtn').addEventListener('click', remove);

fillTeamOptions();
render();

if (db) {
  load();
  db.channel('nhl')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, reload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, reload)
    .subscribe();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) reload(); });
}
