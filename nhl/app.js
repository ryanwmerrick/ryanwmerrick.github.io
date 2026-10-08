import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=19';
import {
  computeRatings, overallTable, weeklyTable, weekStart, addDays, today, compareGames, MIN_GAMES, MIN_OPPONENTS, TEAM_TIERS, TIER_BONUS, winChance, zaLevel,
} from './rank.js?v=19';
import {
  playerStats, headToHead, leagueStats, bigThree, winPct, games as gameCount,
} from './stats.js?v=19';

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
const ZA_NAMES = ['', 'Za', 'Double za', 'Triple za'];
const STATS_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 20V11M12 20V4M19 20v-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';
const PAGE = 15;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
// Newest-entered first. Ratings still replay in played-on order; lists show entry order.
const byEntered = (gs) => [...gs].sort((x, y) => (x.created_at < y.created_at ? 1 : x.created_at > y.created_at ? -1 : 0));
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
// Stack of open stat views, so Back returns to the previous one.
let panel = [];

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
    state.big3 = bigThree(state.calc, g.data);
  }
  state.loaded = true;
  render();
  if (form) fillPlayerOptions();
  if (panel.length) renderPanel();
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
  renderHome();
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
  <li><button type="button" class="row" data-player="${r.id}">
    <span class="rank">${rank}</span>
    <span class="who"><span class="name">${esc(r.name)}</span><span class="rec">${record(r)}</span></span>
    <span class="val ${cls}">${val}</span>
  </button></li>`;

const headHtml = (right) => `<div class="board-head"><span>Player · W-L-OTL</span><span>${right}</span></div>`;

function weekHtml() {
  const rows = weeklyTable(state.calc, state.games, state.week);
  if (!rows.length) return '<p class="empty">No games this week.</p>';
  return headHtml('Pts') + `<ol class="board">${rows
    .map((r, i) => rowHtml(i + 1, r, signed(r.points), r.points < 0 ? 'neg' : ''))
    .join('')}</ol>`;
}

const progress = (r) => `${Math.min(r.games, MIN_GAMES)}/${MIN_GAMES} games · ${Math.min(r.opponents.size, MIN_OPPONENTS)}/${MIN_OPPONENTS} opponents`;

function overallHtml() {
  const { ranked, unranked } = overallTable(state.calc);
  if (!ranked.length && !unranked.length) return '<p class="empty">No players yet. Log a game to get started.</p>';
  let html = ranked.length
    ? headHtml('Rating') + `<ol class="board">${ranked
      .map((r, i) => rowHtml(i + 1, r, Math.round(r.rating)))
      .join('')}</ol>`
    : '<p class="empty">Nobody is ranked yet.</p>';
  if (unranked.length) {
    html += `<p class="sub">Not ranked yet</p><ul class="pending">${unranked
      .map((r) => `<li><button type="button" data-player="${r.id}"><span>${esc(r.name)}</span><span>${progress(r)}</span></button></li>`)
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
  const games = byEntered(state.games);
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
  const za = zaLevel(g);
  // Tapping the card edits the game; the small stats button opens the matchup.
  return `
    <li class="result-card">
      <button type="button" class="result" data-edit="${g.id}" aria-label="Edit ${esc(playerName(g.player_a))} ${g.score_a}–${g.score_b} ${esc(playerName(g.player_b))}">
        <span class="score-line${g.ot ? ' has-ot' : ''}${za ? ` has-za za-${za}` : ''}">
          <span class="p ${aWon ? 'win' : 'lose'}">${esc(playerName(g.player_a))}</span>
          <span class="score">${za ? `<span class="za" title="${ZA_NAMES[za]}" aria-label="${ZA_NAMES[za]}">${'🍕'.repeat(za)}</span>` : ''}${g.score_a}–${g.score_b}${g.ot ? '<span class="tag">OT</span>' : ''}</span>
          <span class="p ${aWon ? 'lose' : 'win'}">${esc(playerName(g.player_b))}</span>
        </span>
        <span class="meta">
          <span class="when">${fmtDay(g.played_on)}<span class="time">${fmtTime(g.created_at)}</span></span>
          <span class="teams">${teams}</span>
          <span class="change">${change}</span>
        </span>
      </button>
      <button type="button" class="matchup" data-h2h="${g.player_a}|${g.player_b}" aria-label="${esc(playerName(g.player_a))} vs ${esc(playerName(g.player_b))} matchup stats"><span>${STATS_ICON}</span></button>
    </li>`;
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
  // A new game is stamped when it's saved; an edit can correct the time.
  $('whenNew').hidden = Boolean(form.id);
  $('whenEdit').hidden = !form.id;
  if (form.id) $('whenInput').value = toLocalInput(form.loggedAt);
}

function openSheet(game) {
  form = game
    ? {
      id: game.id,
      a: { player: game.player_a, team: game.team_a || '', score: game.score_a },
      b: { player: game.player_b, team: game.team_b || '', score: game.score_b },
      ot: game.ot,
      playedOn: game.played_on,
      loggedAt: game.created_at,
    }
    : {
      id: null,
      a: { player: '', team: '', score: 0 },
      b: { player: '', team: '', score: 0 },
      ot: false,
      playedOn: null,
      loggedAt: null,
    };
  $('sheetTitle').textContent = game ? 'Edit game' : 'Log a game';
  $('saveBtn').textContent = game ? 'Save changes' : 'Save game';
  $('deleteBtn').hidden = !game;
  $('formError').textContent = '';
  hideNewPlayer();
  fillPlayerOptions();

  const sheet = $('sheet');
  slideIn(sheet);
}

function closeSheet() {
  form = null;
  slideOut($('sheet'), () => !form);
}

function slideIn(el) {
  el.hidden = false;
  el.offsetHeight; // commit the start position so the slide-in animates
  el.classList.add('open');
  lockScroll();
}

function slideOut(el, stillClosed) {
  el.classList.remove('open');
  lockScroll();
  setTimeout(() => { if (stillClosed()) el.hidden = true; }, 280);
}

function lockScroll() {
  document.body.style.overflow = form || panel.length ? 'hidden' : '';
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
  if (form.id && Number.isNaN(Date.parse(form.loggedAt))) return 'Pick when the game was played.';
  if (form.id && Date.parse(form.loggedAt) > Date.now() + 60000) return "That time hasn't happened yet.";
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
  };
  // A new game's time is when it's saved: the database fills in created_at itself. An edit
  // sends the (possibly corrected) time, with the date that goes with it.
  const btn = $('saveBtn');
  btn.disabled = true;
  const { error } = form.id
    ? await db.from('games').update({ ...row, created_at: form.loggedAt, played_on: dayOf(Date.parse(form.loggedAt)) }).eq('id', form.id)
    : await db.from('games').insert({ ...row, played_on: today() });
  btn.disabled = false;
  if (error) {
    $('formError').textContent = error.message;
    return;
  }
  state.week = weekStart(form.id ? dayOf(Date.parse(form.loggedAt)) : today());
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
// Players, matchups and edit buttons appear in the standings, results and stat panels.
document.addEventListener('click', (e) => {
  const edit = e.target.closest('[data-edit]');
  if (edit) {
    const game = state.games.find((g) => g.id === edit.dataset.edit);
    if (game) openSheet(game);
    return;
  }
  if (e.target.closest('[data-big3]')) {
    openPanel({ type: 'big3' });
    return;
  }
  const h2h = e.target.closest('[data-h2h]');
  if (h2h) {
    const [x, y] = h2h.dataset.h2h.split('|');
    openPanel({ type: 'h2h', x, y });
    return;
  }
  const player = e.target.closest('[data-player]');
  if (player) {
    openPanel({ type: 'player', id: player.dataset.player });
  }
});
$('leagueBtn').addEventListener('click', () => { if (state.loaded) openPanel({ type: 'league' }); });
$('panel').addEventListener('click', (e) => {
  if (e.target.closest('[data-close-panel]')) closePanel();
});
$('panelBack').addEventListener('click', () => {
  panel.pop();
  renderPanel();
});

$('sheet').addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) closeSheet();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (form) closeSheet();
  else if (panel.length) closePanel();
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

$('whenInput').addEventListener('change', (e) => {
  const t = new Date(e.target.value);
  form.loggedAt = Number.isNaN(t.getTime()) ? '' : t.toISOString();
});
$('newPlayer').addEventListener('submit', (e) => { e.preventDefault(); addPlayer(); });
$('cancelNew').addEventListener('click', hideNewPlayer);
$('saveBtn').addEventListener('click', save);
$('deleteBtn').addEventListener('click', remove);

// ---------- Stat panels ----------

function openPanel(view) {
  const wasOpen = panel.length > 0;
  if (JSON.stringify(panel.at(-1)) !== JSON.stringify(view)) panel.push(view);
  if (!wasOpen) slideIn($('panel'));
  renderPanel();
}

function closePanel() {
  panel = [];
  slideOut($('panel'), () => !panel.length);
}

function renderPanel() {
  const view = panel.at(-1);
  if (!view || !state.calc) return;
  $('panelBack').hidden = panel.length < 2;
  const body = $('panelBody');
  const known = (id) => state.calc.stats.has(id);
  if (view.type === 'player' && known(view.id)) {
    $('panelTitle').textContent = playerName(view.id);
    body.innerHTML = playerHtml(view.id);
    mountChart(body.querySelector('.chart'), view.id);
  } else if (view.type === 'h2h' && known(view.x) && known(view.y)) {
    $('panelTitle').textContent = `${playerName(view.x)} vs ${playerName(view.y)}`;
    body.innerHTML = h2hHtml(view.x, view.y);
  } else if (view.type === 'league') {
    $('panelTitle').textContent = 'League stats';
    body.innerHTML = leagueHtml();
  } else if (view.type === 'big3') {
    $('panelTitle').textContent = 'The Big 3';
    body.innerHTML = big3Html();
  } else {
    body.innerHTML = '<p class="empty">Nothing to show.</p>';
  }
  body.closest('.panel').scrollTop = 0;
}

const pct = (x) => `${Math.round(x * 100)}%`;
const perGame = (x, n) => (n ? (x / n).toFixed(1) : '0.0');
const tile = (val, label, note = '') => `<div class="tile"><span class="tile-val">${val}</span><span class="tile-label">${label}</span>${note ? `<span class="tile-note">${note}</span>` : ''}</div>`;
const kv = (label, val) => `<div class="kv"><span>${label}</span><span>${val}</span></div>`;
const section = (title, inner) => `<h3 class="panel-h">${title}</h3>${inner}`;
const scoreVs = (s) => `${s.us}–${s.them} vs ${esc(playerName(s.opp))} · ${fmtDay(s.game.played_on)}`;
const teamName = (abbr) => TEAMS.find(([a]) => a === abbr)?.[1] ?? abbr;
const streakText = (st) => (st ? `${st.won ? 'W' : 'L'}${st.n}` : '—');
const resultsList = (gs) => `<ul class="results">${gs.map(resultHtml).join('')}</ul>`;

function playerHtml(id) {
  const ps = playerStats(state.calc, state.games, id);
  const p = ps.player;
  const { ranked } = overallTable(state.calc);
  const rank = ranked.findIndex((r) => r.id === id);
  const standing = rank >= 0
    ? `${rank < 3 ? '<span class="big3-chip">Big 3</span>' : ''}#${rank + 1} of ${ranked.length} ranked`
    : `Not ranked yet<br>${progress(p)}`;
  const b3 = state.big3?.board.find((x) => x.id === id);
  const scalps = state.big3?.scalps.find((x) => x.id === id)?.n ?? 0;

  let html = `
    <div class="hero">
      <div><span class="hero-num">${Math.round(p.rating)}</span><span class="hero-label">Rating</span></div>
      <div class="hero-side">${standing}<br>Peak ${Math.round(p.peak)}</div>
    </div>`;
  if (!p.games) return html + '<p class="empty">No games yet.</p>';

  const rec = ps.record;
  html += `<div class="tiles">
    ${tile(record(rec), 'W-L-OTL')}
    ${tile(pct(winPct(rec)), 'Win %')}
    ${tile(p.games, 'Games')}
    ${tile(perGame(ps.gf, p.games), 'Goals for / gm')}
    ${tile(perGame(ps.ga, p.games), 'Goals against / gm')}
    ${tile(signed(ps.gf - ps.ga), 'Goal diff')}
    ${tile(streakText(ps.current), 'Streak')}
    ${tile(ps.longest, 'Best win streak')}
    ${tile(signed(ps.weekPts), 'This week')}
  </div>`;

  html += section('Rating', '<div class="chart"></div>');

  html += section('Splits', `<div class="kvs">
    ${kv('Home', record(ps.home))}
    ${kv('Away', record(ps.away))}
    ${kv('OT / shootout', `${ps.ot.w}-${ps.ot.l}`)}
    ${ps.favTeam && gameCount(ps.favTeam) > 1 ? kv('Most-used team', `${esc(teamName(ps.favTeam.abbr))} · ${record(ps.favTeam)}`) : ''}
    ${ps.biggestWin ? kv('Biggest win', scoreVs(ps.biggestWin)) : ''}
    ${ps.worstLoss ? kv('Worst loss', scoreVs(ps.worstLoss)) : ''}
    ${ps.zasWon || ps.zasOwed ? kv('Zas 🍕', `${ps.zasWon} won · ${ps.zasOwed} owed`) : ''}
    ${b3 ? kv('Time in the Big 3', `${duration(b3.ms)}${b3.active ? ' · in it now' : ''}`) : ''}
    ${scalps ? kv('Wins over the Big 3', scalps) : ''}
  </div>`);

  html += section('Vs opponents', `<ul class="opps">${ps.opponents.map((o) => `
    <li><button type="button" data-h2h="${id}|${o.id}">
      <span class="name">${esc(playerName(o.id))}</span>
      <span class="rec">${record(o)}</span>
      <span class="elo ${o.elo < 0 ? 'neg' : ''}">${signed(o.elo)}</span>
    </button></li>`).join('')}</ul>
    <p class="hint">Record and Elo won or lost against each opponent. Tap for the full matchup.</p>`);

  html += section('Recent games', resultsList(byEntered(ps.sides.map((s) => s.game)).slice(0, 10)));
  return html;
}

function h2hHtml(x, y) {
  const h = headToHead(state.calc, state.games, x, y);
  const nx = esc(playerName(x));
  const ny = esc(playerName(y));
  if (!h.meetings.length) return '<p class="empty">These two haven\'t played yet.</p>';

  const lead = h.recX.w === h.recY.w ? 'Series tied'
    : `${h.recX.w > h.recY.w ? nx : ny} leads the series`;
  const n = h.meetings.length;
  const rx = state.calc.stats.get(x).rating;
  const ry = state.calc.stats.get(y).rating;
  const chanceX = winChance(rx, ry);
  // Home records from each player's side (x's away games are y's home games).
  const homeX = { w: 0, l: 0, otl: 0 };
  const homeY = { w: 0, l: 0, otl: 0 };
  for (const s of h.sides) {
    const [rec, won] = s.home ? [homeX, s.won] : [homeY, !s.won];
    if (won) rec.w++;
    else if (s.ot) rec.otl++;
    else rec.l++;
  }
  const streak = h.streak ? `${h.streak.won ? nx : ny} W${h.streak.n}` : '—';
  const swing = Math.round(h.eloX) === 0 ? 'Even'
    : `${h.eloX > 0 ? nx : ny} +${Math.round(Math.abs(h.eloX))}`;

  let html = `
    <div class="series">
      <div class="series-side"><span class="name">${nx}</span><span class="rec">${record(h.recX)}</span></div>
      <div class="series-score">${h.recX.w}<span>–</span>${h.recY.w}</div>
      <div class="series-side"><span class="name">${ny}</span><span class="rec">${record(h.recY)}</span></div>
    </div>
    <p class="series-lead">${lead}</p>
    <div class="tiles">
      ${tile(n, 'Games')}
      ${tile(`${h.goalsX}–${h.goalsY}`, 'Goals')}
      ${tile(`${perGame(h.goalsX, n)}–${perGame(h.goalsY, n)}`, 'Avg score')}
      ${tile(h.otGames, 'OT games')}
      ${tile(streak, 'Streak')}
      ${tile(swing, 'Elo swing')}
    </div>`;

  html += section('Details', `<div class="kvs">
    ${gameCount(homeX) ? kv(`${nx} at home`, record(homeX)) : ''}
    ${gameCount(homeY) ? kv(`${ny} at home`, record(homeY)) : ''}
    ${h.bestX ? kv(`${nx}'s biggest win`, `${h.bestX.us}–${h.bestX.them} · ${fmtDay(h.bestX.game.played_on)}`) : ''}
    ${h.bestY ? kv(`${ny}'s biggest win`, `${h.bestY.them}–${h.bestY.us} · ${fmtDay(h.bestY.game.played_on)}`) : ''}
    ${h.zasX || h.zasY ? kv('Zas 🍕', `${nx} ${h.zasX} · ${ny} ${h.zasY}`) : ''}
    ${kv('If they played now', `${nx} ${pct(chanceX)} · ${ny} ${pct(1 - chanceX)}`)}
  </div>
  <p class="hint">"If they played now" uses current ratings on neutral ice, with no team bonus.</p>`);

  html += section('All games', resultsList(byEntered(h.meetings)));
  return html;
}

function leagueHtml() {
  const L = leagueStats(state.calc, state.games);
  if (!L.games) return '<p class="empty">No games yet.</p>';
  const gameLine = (g) => `${esc(playerName(g.player_a))} ${g.score_a}–${g.score_b} ${esc(playerName(g.player_b))} · ${fmtDay(g.played_on)}`;
  const link = (g, text) => `<button type="button" class="kv-link" data-h2h="${g.player_a}|${g.player_b}">${text}</button>`;

  let html = `<div class="tiles">
    ${tile(L.games, 'Games')}
    ${tile(L.players, 'Players')}
    ${tile(L.goals, 'Goals')}
    ${tile(perGame(L.goals, L.games), 'Goals / game')}
    ${tile(pct(L.ot / L.games), 'Went to OT')}
    ${tile(pct(L.homeWins / L.games), 'Home wins', `Home bonus ${homeText()}`)}
  </div>`;

  const upset = L.upset && L.upset.chance < 0.5 ? L.upset : null;
  html += section('Records', `<div class="kvs">
    ${L.peak ? kv('Highest rating', `${esc(L.peak.player.name)} · ${Math.round(L.peak.rating)} · ${fmtDay(L.peak.played_on)}`) : ''}
    ${L.streak ? kv('Longest win streak', `${esc(L.streak.player.name)} · ${L.streak.n}`) : ''}
    ${L.mostGames ? kv('Most games', `${esc(L.mostGames.name)} · ${L.mostGames.games}`) : ''}
    ${kv('Biggest blowout', link(L.blowout, gameLine(L.blowout)))}
    ${kv('Highest-scoring game', link(L.shootout, gameLine(L.shootout)))}
    ${upset ? kv('Biggest upset', link(upset.game, `${gameLine(upset.game)} · winner had a ${pct(upset.chance)} chance`)) : ''}
    ${L.rivalry ? kv('Busiest rivalry', `<button type="button" class="kv-link" data-h2h="${L.rivalry.ids[0]}|${L.rivalry.ids[1]}">${esc(playerName(L.rivalry.ids[0]))} vs ${esc(playerName(L.rivalry.ids[1]))} · ${L.rivalry.games} games</button>`) : ''}
  </div>`);

  const b = state.big3;
  if (b?.current.length) {
    html += section('The Big 3', `<button type="button" class="big3-link" data-big3>
      <span>${b.current.map((x) => esc(playerName(x.id))).join(' · ')}</span><span>›</span>
    </button>`);
  }

  const Z = L.za;
  html += section('Za ledger 🍕', `<div class="tiles">
    ${tile(Z.levels[1], 'Zas')}
    ${tile(Z.levels[2], 'Double zas')}
    ${tile(Z.levels[3], 'Triple zas')}
  </div>
  <p class="hint">Lose by 7 or more and you owe the winner a pizza. 11+ is a double za (two pizzas), 14+ a triple. Zas don't change ratings.</p>
  ${Z.biggest ? `<div class="kvs ledger-top">${kv('Biggest za', link(Z.biggest, gameLine(Z.biggest)))}</div>` : ''}
  ${Z.ledger.length ? `<table class="stat-table">
    <thead><tr><th>Player</th><th>Won</th><th>Owed</th><th>Net</th></tr></thead>
    <tbody>${Z.ledger.map((x) => `<tr><td>${esc(playerName(x.id))}</td><td>${x.won}</td><td>${x.owed}</td><td>${signed(x.won - x.owed)}</td></tr>`).join('')}</tbody>
  </table>` : '<p class="hint">No zas yet.</p>'}`);

  html += section('Team tiers', `<table class="stat-table">
    <thead><tr><th>Tier</th><th>Picks</th><th>Win %</th></tr></thead>
    <tbody>${L.tiers.map((t) => `<tr><td>Tier ${t.tier}</td><td>${t.picks}</td><td>${t.picks ? pct(t.w / t.picks) : '—'}</td></tr>`).join('')}</tbody>
  </table>
  <p class="hint">How often a player using a team in each tier won.</p>`);

  html += section('Most-used teams', `<table class="stat-table">
    <thead><tr><th>Team</th><th>Picks</th><th>Wins</th></tr></thead>
    <tbody>${L.teams.slice(0, 8).map((t) => `<tr><td>${esc(teamName(t.abbr))}</td><td>${t.picks}</td><td>${t.w}</td></tr>`).join('')}</tbody>
  </table>`);
  return html;
}

// Rating after each game, starting from 1000. Hover, tap or arrow keys show each point.
function mountChart(el, id) {
  if (!el) return;
  const p = state.calc.stats.get(id);
  const pts = [{ rating: 1000, label: 'Start' }, ...p.history.map((h) => {
    const g = state.games.find((x) => x.id === h.id);
    const s = g.player_a === id
      ? { us: g.score_a, them: g.score_b, opp: g.player_b }
      : { us: g.score_b, them: g.score_a, opp: g.player_a };
    return { rating: h.rating, label: `${fmtDay(h.played_on)} · ${s.us > s.them ? 'W' : 'L'} ${s.us}–${s.them} vs ${playerName(s.opp)}` };
  })];
  if (pts.length < 2) {
    el.innerHTML = '<p class="hint">Play a game to start the chart.</p>';
    return;
  }

  const W = Math.max(260, el.clientWidth);
  const H = 140;
  const pad = { l: 8, r: 44, t: 14, b: 14 };
  const vals = pts.map((d) => d.rating);
  const lo = Math.min(1000, ...vals) - 10;
  const hi = Math.max(1000, ...vals) + 10;
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / (pts.length - 1);
  const y = (v) => pad.t + ((hi - v) * (H - pad.t - pad.b)) / (hi - lo);
  const path = pts.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.rating).toFixed(1)}`).join('');
  const lastI = pts.length - 1;

  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" tabindex="0" role="img"
      aria-label="Rating after each game, from 1000 to ${Math.round(vals[lastI])}. Use arrow keys to step through games.">
      <line class="base" x1="${pad.l}" x2="${W - pad.r}" y1="${y(1000)}" y2="${y(1000)}"/>
      <text class="axis" x="${W - pad.r + 6}" y="${y(1000) + 4}">1000</text>
      <path class="line" d="${path}"/>
      <text class="end" x="${W - pad.r + 6}" y="${y(vals[lastI]) + 4}">${Math.round(vals[lastI])}</text>
      <line class="hair" y1="${pad.t - 6}" y2="${H - pad.b + 6}" visibility="hidden"/>
      <circle class="dot" r="4" visibility="hidden"/>
      <rect class="hit" x="0" y="0" width="${W}" height="${H}"/>
    </svg>
    <div class="tip" hidden><strong></strong><span></span></div>`;

  const svg = el.querySelector('svg');
  const hair = svg.querySelector('.hair');
  const dot = svg.querySelector('.dot');
  const tip = el.querySelector('.tip');
  let cur = null;
  const show = (i) => {
    cur = Math.max(0, Math.min(lastI, i));
    const cx = x(cur);
    const cy = y(pts[cur].rating);
    hair.setAttribute('x1', cx);
    hair.setAttribute('x2', cx);
    dot.setAttribute('cx', cx);
    dot.setAttribute('cy', cy);
    hair.setAttribute('visibility', 'visible');
    dot.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.querySelector('strong').textContent = Math.round(pts[cur].rating);
    tip.querySelector('span').textContent = pts[cur].label;
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.max(0, Math.min(W - tw, cx - tw / 2))}px`;
  };
  const hide = () => {
    cur = null;
    hair.setAttribute('visibility', 'hidden');
    dot.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  };
  const nearest = (e) => {
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    return Math.round(((px - pad.l) / (W - pad.l - pad.r)) * lastI);
  };
  svg.addEventListener('pointermove', (e) => show(nearest(e)));
  svg.addEventListener('pointerdown', (e) => show(nearest(e)));
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
  svg.addEventListener('focus', () => show(lastI));
  svg.addEventListener('blur', hide);
  svg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { show((cur ?? lastI) - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { show((cur ?? lastI) + 1); e.preventDefault(); }
  });
}


// Local calendar day (YYYY-MM-DD) of a timestamp, for fmtDay.
// Timestamp as the value a datetime-local input wants, in the phone's local time.
const toLocalInput = (ts) => {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const dayOf = (ms) => {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const duration = (ms) => {
  const h = ms / 36e5;
  if (h < 1) return 'under an hour';
  if (h < 24) return `${Math.floor(h)} hour${Math.floor(h) === 1 ? '' : 's'}`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'}`;
};

function big3Html() {
  const b = state.big3;
  if (!b || !b.current.length) return '<p class="empty">Nobody is ranked yet. The Big 3 forms once three players are ranked.</p>';
  const now = Date.now();
  // Podium order: 2nd, 1st, 3rd.
  const spot = (i) => {
    const m = b.current[i];
    if (!m) return '<div class="podium-spot empty"></div>';
    return `<button type="button" class="podium-spot p${i + 1}" data-player="${m.id}">
      <span class="podium-name">${esc(playerName(m.id))}</span>
      <span class="podium-rating">${Math.round(m.rating)}</span>
      <span class="podium-block"><span class="podium-rank">${i + 1}</span></span>
      <span class="podium-since">in for ${duration(now - m.since)}</span>
    </button>`;
  };
  let html = `<div class="podium">${spot(1)}${spot(0)}${spot(2)}</div>
    <p class="big3-tagline">${b.formedAt ? `This trio has held the Big 3 since ${fmtDay(dayOf(b.formedAt))}, ${fmtTime(b.formedAt)}.` : 'The top three ranked players.'}</p>`;

  html += section('Time in the Big 3', `<table class="stat-table">
    <thead><tr><th>Player</th><th>Total</th><th>Longest</th><th>Times in</th></tr></thead>
    <tbody>${b.board.map((x) => `<tr><td>${esc(playerName(x.id))}${x.active ? ' <span class="big3-dot" aria-label="in the Big 3 now"></span>' : ''}</td><td>${duration(x.ms)}</td><td>${duration(x.longest)}</td><td>${x.entries}</td></tr>`).join('')}</tbody>
  </table>`);

  if (b.scalps.length) {
    html += section('Big 3 slayers', `<table class="stat-table">
      <thead><tr><th>Player</th><th>Wins over a Big 3 member</th></tr></thead>
      <tbody>${b.scalps.slice(0, 6).map((x) => `<tr><td>${esc(playerName(x.id))}</td><td>${x.n}</td></tr>`).join('')}</tbody>
    </table>
    <p class="hint">Counts wins over anyone who was in the Big 3 at the time of the game.</p>`);
  }

  if (b.events.length) {
    const line = (e) => e.type === 'in'
      ? `<strong>${esc(playerName(e.id))}</strong> entered the Big 3${e.replaced ? `, knocking out ${esc(playerName(e.replaced))}` : ''}`
      : `<strong>${esc(playerName(e.id))}</strong> dropped out`;
    const shown = b.events.filter((e) => e.type === 'in' || !b.events.some((x) => x.type === 'in' && x.t === e.t && x.replaced === e.id));
    html += section('Changes', `<ul class="b3-events">${shown.map((e) => `<li><span>${line(e)}</span><span class="when-ago">${fmtDay(dayOf(e.t))}</span></li>`).join('')}</ul>`);
  }

  if (b.first) {
    html += section('The first Big 3', `<p class="b3-first">${b.first.ids.map((id) => esc(playerName(id))).join(' · ')}<br><span class="hint">Formed ${fmtDay(dayOf(b.first.t))}</span></p>`);
  }
  return html;
}

const homeText = () => `+${Math.round(state.calc?.home ?? 25)}`;

// Keeps the live home-ice numbers in "How rankings work" in sync with the ratings.
function renderHome() {
  if (!state.calc) return;
  const h = state.calc.home;
  $('homeNow').textContent = `+${Math.round(h)} Elo`;
  $('homeBasis').textContent = ` (based on ${state.calc.counted} game${state.calc.counted === 1 ? '' : 's'})`;
  $('homePct').textContent = pct(winChance(1000 + h, 1000));
}

function renderTiers() {
  const html = [1, 2, 3, 4].map((t) => {
    const names = TEAMS.filter(([abbr]) => TEAM_TIERS[abbr] === t).map(([, name]) => esc(name));
    if (!names.length) return '';
    const bonus = TIER_BONUS[t] > 0 ? `+${TIER_BONUS[t]}` : `\u2212${-TIER_BONUS[t]}`;
    return `<p><strong>Tier ${t} (${bonus})</strong> ${names.join(', ')}</p>`;
  }).join('');
  $('tiers').innerHTML = html;
}

fillTeamOptions();
renderTiers();
render();

if (db) {
  load();
  db.channel('nhl')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, reload)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, reload)
    .subscribe();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) reload(); });
}
