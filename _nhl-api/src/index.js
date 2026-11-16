// API for ryan-merrick.com/nhl/. No login on purpose: anyone with the page can add players
// and add, edit or delete games, the same as the old Supabase setup.
//
//   GET    /version         { version }                  cheap "anything new?" check
//   GET    /data            { version, players, games }
//   POST   /players         { name }                     -> player
//   POST   /games           game fields                  -> game (time stamped here)
//   PATCH  /games/:id       any game fields, created_at  -> game
//   DELETE /games/:id

const ALLOWED_ORIGINS = new Set([
  'https://ryan-merrick.com',
  'https://www.ryan-merrick.com',
  'http://localhost:8766',
]);
const LEAGUE_TIME_ZONE = 'America/New_York';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TEAM = /^[A-Z]{3}$/;

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      const res = await route(request, env.nhl);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      const message = err instanceof HttpError ? err.message : 'Something went wrong. Try again.';
      if (!(err instanceof HttpError)) console.error(err);
      return json({ error: message, code: err.code ?? null }, status, cors);
    }
  },
};

async function route(request, db) {
  const { pathname } = new URL(request.url);
  const method = request.method;

  if (method === 'GET' && pathname === '/version') {
    return json({ version: await version(db) });
  }
  if (method === 'GET' && pathname === '/data') {
    const [v, players, games] = await db.batch([
      db.prepare('select version from meta where id = 1'),
      db.prepare('select id, name, created_at from players order by name collate nocase'),
      db.prepare('select * from games order by created_at, id'),
    ]);
    return json({ version: v.results[0].version, players: players.results, games: games.results.map(gameOut) });
  }
  if (method === 'POST' && pathname === '/players') {
    return addPlayer(db, await body(request));
  }
  if (method === 'POST' && pathname === '/games') {
    return addGame(db, await body(request));
  }
  const m = pathname.match(/^\/games\/([^/]+)$/);
  if (m && method === 'PATCH') return editGame(db, m[1], await body(request));
  if (m && method === 'DELETE') return deleteGame(db, m[1]);
  throw new HttpError(404, 'Not found.');
}

// ---------- Players ----------

async function addPlayer(db, input) {
  const name = String(input.name ?? '').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 40) throw new HttpError(400, 'Names are 1 to 40 characters.');
  const taken = await db.prepare('select 1 from players where lower(trim(name)) = lower(?)').bind(name).first();
  if (taken) throw new HttpError(409, `${name} is already a player.`, 'duplicate');

  const player = { id: crypto.randomUUID(), name, created_at: new Date().toISOString() };
  try {
    await write(db, db.prepare('insert into players (id, name, created_at) values (?, ?, ?)')
      .bind(player.id, player.name, player.created_at));
  } catch (err) {
    if (/UNIQUE/i.test(String(err))) throw new HttpError(409, `${name} is already a player.`, 'duplicate');
    throw err;
  }
  return json(player, 201);
}

// ---------- Games ----------

async function addGame(db, input) {
  const now = new Date();
  const game = await checkGame(db, {
    ...pickGame(input),
    id: crypto.randomUUID(),
    // A new game's time is when it reaches the server, never the phone's clock.
    created_at: now.toISOString(),
    played_on: leagueDay(now),
  });
  await write(db, db.prepare(`insert into games
    (id, player_a, player_b, score_a, score_b, team_a, team_b, ot, played_on, created_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(...row(game)));
  return json(gameOut(game), 201);
}

async function editGame(db, id, input) {
  const old = await db.prepare('select * from games where id = ?').bind(id).first();
  if (!old) throw new HttpError(404, 'That game no longer exists.');

  const next = { ...gameOut(old), ...pickGame(input), id };
  // An edit may correct when the game was played; its date always follows that time.
  if (input.created_at !== undefined) {
    const t = new Date(input.created_at);
    if (Number.isNaN(t.getTime())) throw new HttpError(400, 'Pick when the game was played.');
    if (t.getTime() > Date.now() + 60_000) throw new HttpError(400, "That time hasn't happened yet.");
    next.created_at = t.toISOString();
    next.played_on = leagueDay(t);
  }
  const game = await checkGame(db, next);
  await write(db, db.prepare(`update games set player_a = ?, player_b = ?, score_a = ?, score_b = ?,
    team_a = ?, team_b = ?, ot = ?, played_on = ?, created_at = ? where id = ?`)
    .bind(...row(game).slice(1), game.id));
  return json(gameOut(game));
}

async function deleteGame(db, id) {
  // Check first, so deleting a game that's already gone doesn't bump the version.
  const exists = await db.prepare('select 1 from games where id = ?').bind(id).first();
  if (!exists) throw new HttpError(404, 'That game no longer exists.');
  await write(db, db.prepare('delete from games where id = ?').bind(id));
  return new Response(null, { status: 204 });
}

// Only the fields a person can set; anything else in the request is ignored.
function pickGame(input) {
  const out = {};
  for (const k of ['player_a', 'player_b', 'score_a', 'score_b', 'team_a', 'team_b', 'ot']) {
    if (input[k] !== undefined) out[k] = input[k];
  }
  return out;
}

// The same rules the page checks, so the API can't be used to save a game the page would refuse.
async function checkGame(db, g) {
  const score = (x) => (Number.isInteger(x) && x >= 0 && x <= 99 ? x : null);
  const team = (x) => (x == null || x === '' ? null : TEAM.test(x) ? x : undefined);
  const game = {
    id: g.id,
    player_a: String(g.player_a ?? ''),
    player_b: String(g.player_b ?? ''),
    score_a: score(g.score_a),
    score_b: score(g.score_b),
    team_a: team(g.team_a),
    team_b: team(g.team_b),
    ot: Boolean(g.ot),
    played_on: g.played_on,
    created_at: g.created_at,
  };
  if (!UUID.test(game.player_a) || !UUID.test(game.player_b)) throw new HttpError(400, 'Pick both players.');
  if (game.player_a === game.player_b) throw new HttpError(400, 'Pick two different players.');
  if (game.score_a === null || game.score_b === null) throw new HttpError(400, 'Scores are 0 to 99.');
  if (game.score_a === game.score_b) throw new HttpError(400, 'No ties. Someone has to win.');
  if (game.ot && Math.abs(game.score_a - game.score_b) !== 1) {
    throw new HttpError(400, 'OT and shootout games are decided by one goal.');
  }
  if (game.team_a === undefined || game.team_b === undefined) throw new HttpError(400, 'Unknown team.');
  const { results } = await db.prepare('select id from players where id in (?, ?)').bind(game.player_a, game.player_b).all();
  if (results.length !== 2) throw new HttpError(400, 'One of those players no longer exists.');
  return game;
}

const row = (g) => [g.id, g.player_a, g.player_b, g.score_a, g.score_b, g.team_a, g.team_b, g.ot ? 1 : 0, g.played_on, g.created_at];
const gameOut = (g) => ({ ...g, ot: Boolean(g.ot) });

// ---------- Helpers ----------

// Every write also bumps the version, in one transaction, so a poller never misses a change.
async function write(db, statement) {
  const [result] = await db.batch([statement, db.prepare('update meta set version = version + 1 where id = 1')]);
  return result;
}

async function version(db) {
  return (await db.prepare('select version from meta where id = 1').first('version')) ?? 0;
}

function leagueDay(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: LEAGUE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(date);
}

async function body(request) {
  const text = await request.text();
  if (text.length > 4096) throw new HttpError(413, 'Request too large.');
  try {
    const parsed = JSON.parse(text || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }
  throw new HttpError(400, 'Bad request.');
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://ryan-merrick.com',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}
