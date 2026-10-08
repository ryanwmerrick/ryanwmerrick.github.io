// Stats for the player, head-to-head and league panels. Pure functions over the
// games list and the output of computeRatings, so it can be tested outside the browser.

import {
  compareGames, TEAM_TIERS, weekStart, today, zaLevel, START, MIN_GAMES, MIN_OPPONENTS,
} from './rank.js?v=18';

const emptyRec = () => ({ w: 0, l: 0, otl: 0 });

// One game from a player's point of view.
export function side(g, id) {
  const isA = g.player_a === id;
  const us = isA ? g.score_a : g.score_b;
  const them = isA ? g.score_b : g.score_a;
  return {
    game: g,
    home: !isA,
    opp: isA ? g.player_b : g.player_a,
    team: isA ? g.team_a : g.team_b,
    us,
    them,
    won: us > them,
    ot: g.ot,
  };
}

function tally(rec, s) {
  if (s.won) rec.w++;
  else if (s.ot) rec.otl++;
  else rec.l++;
}

export const games = (rec) => rec.w + rec.l + rec.otl;
export const winPct = (rec) => (games(rec) ? rec.w / games(rec) : 0);

// Current streak and longest win streak from games in date order.
function streaks(sides) {
  let longest = 0;
  let run = 0;
  for (const s of sides) {
    run = s.won ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const last = sides.at(-1);
  let current = 0;
  for (let i = sides.length - 1; i >= 0 && sides[i].won === last?.won; i--) current++;
  return { current: last ? { won: last.won, n: current } : null, longest };
}

export function playerStats(calc, allGames, id) {
  const p = calc.stats.get(id);
  const mine = allGames.filter((g) => g.player_a === id || g.player_b === id).sort(compareGames);
  const sides = mine.map((g) => side(g, id));

  const home = emptyRec();
  const away = emptyRec();
  const otRec = { w: 0, l: 0 };
  const vs = new Map();
  const teams = new Map();
  let gf = 0;
  let ga = 0;
  let biggestWin = null;
  let worstLoss = null;
  // Zas are counted in pizzas: a double za is two.
  let zasWon = 0;
  let zasOwed = 0;

  for (const s of sides) {
    tally(s.home ? home : away, s);
    const za = zaLevel(s.game);
    if (s.won) zasWon += za;
    else zasOwed += za;
    if (s.ot) s.won ? otRec.w++ : otRec.l++;
    gf += s.us;
    ga += s.them;
    const margin = s.us - s.them;
    if (s.won && (!biggestWin || margin > biggestWin.us - biggestWin.them)) biggestWin = s;
    if (!s.won && (!worstLoss || margin < worstLoss.us - worstLoss.them)) worstLoss = s;

    if (!vs.has(s.opp)) vs.set(s.opp, { id: s.opp, ...emptyRec(), gf: 0, ga: 0, elo: 0 });
    const v = vs.get(s.opp);
    tally(v, s);
    v.gf += s.us;
    v.ga += s.them;
    const d = calc.perGame.get(s.game.id);
    if (d) v.elo += s.home ? d.b : d.a;

    if (s.team) {
      if (!teams.has(s.team)) teams.set(s.team, { abbr: s.team, ...emptyRec() });
      tally(teams.get(s.team), s);
    }
  }

  const monday = weekStart(today());
  const weekPts = sides
    .filter((s) => s.game.played_on >= monday)
    .reduce((sum, s) => {
      const d = calc.perGame.get(s.game.id);
      return sum + (d ? (s.home ? d.b : d.a) : 0);
    }, 0);

  const favTeam = [...teams.values()].sort((x, y) => games(y) - games(x) || y.w - x.w)[0] ?? null;

  return {
    player: p,
    sides,
    record: { w: p.w, l: p.l, otl: p.otl },
    gf,
    ga,
    home,
    away,
    ot: otRec,
    biggestWin,
    worstLoss,
    ...streaks(sides),
    weekPts,
    favTeam,
    zasWon,
    zasOwed,
    opponents: [...vs.values()].sort((x, y) => games(y) - games(x) || y.w - x.w),
  };
}

export function headToHead(calc, allGames, x, y) {
  const meetings = allGames
    .filter((g) => (g.player_a === x && g.player_b === y) || (g.player_a === y && g.player_b === x))
    .sort(compareGames);
  const sx = meetings.map((g) => side(g, x));

  const recX = emptyRec();
  const recY = emptyRec();
  let goalsX = 0;
  let goalsY = 0;
  let otGames = 0;
  let eloX = 0;
  let bestX = null;
  let bestY = null;
  const homeX = emptyRec();
  let zasX = 0;
  let zasY = 0;

  for (const s of sx) {
    tally(recX, s);
    if (s.won) zasX += zaLevel(s.game);
    else zasY += zaLevel(s.game);
    tally(recY, { won: !s.won, ot: s.ot });
    goalsX += s.us;
    goalsY += s.them;
    if (s.ot) otGames++;
    if (s.home) tally(homeX, s);
    const d = calc.perGame.get(s.game.id);
    if (d) eloX += s.home ? d.b : d.a;
    const m = s.us - s.them;
    if (m > 0 && (!bestX || m > bestX.us - bestX.them)) bestX = s;
    if (m < 0 && (!bestY || -m > bestY.them - bestY.us)) bestY = s;
  }

  return {
    meetings,
    sides: sx,
    recX,
    recY,
    goalsX,
    goalsY,
    otGames,
    eloX,
    bestX,
    bestY,
    zasX,
    zasY,
    streak: streaks(sx).current,
  };
}

export function leagueStats(calc, allGames) {
  const gs = [...allGames].sort(compareGames);
  const n = gs.length;
  let goals = 0;
  let ot = 0;
  let homeWins = 0;
  let blowout = null;
  let shootout = null;
  let upset = null;
  const pairs = new Map();
  const tiers = new Map([1, 2, 3, 4].map((t) => [t, { tier: t, picks: 0, w: 0 }]));
  const teams = new Map();
  const za = { games: 0, pizzas: 0, levels: [0, 0, 0, 0], biggest: null, ledger: new Map() };
  const ledger = (id) => {
    if (!za.ledger.has(id)) za.ledger.set(id, { id, won: 0, owed: 0 });
    return za.ledger.get(id);
  };

  for (const g of gs) {
    const total = g.score_a + g.score_b;
    const level = zaLevel(g);
    if (level) {
      za.games++;
      za.pizzas += level;
      za.levels[level]++;
      const aWon = g.score_a > g.score_b;
      ledger(aWon ? g.player_a : g.player_b).won += level;
      ledger(aWon ? g.player_b : g.player_a).owed += level;
      if (!za.biggest || Math.abs(g.score_a - g.score_b) > Math.abs(za.biggest.score_a - za.biggest.score_b)) za.biggest = g;
    }
    const margin = Math.abs(g.score_a - g.score_b);
    goals += total;
    if (g.ot) ot++;
    const homeWon = g.score_b > g.score_a;
    if (homeWon) homeWins++;
    if (!blowout || margin > Math.abs(blowout.score_a - blowout.score_b)) blowout = g;
    if (!shootout || total > shootout.score_a + shootout.score_b) shootout = g;

    const d = calc.perGame.get(g.id);
    if (d) {
      const winnerChance = homeWon ? 1 - d.expA : d.expA;
      if (!upset || winnerChance < upset.chance) upset = { game: g, chance: winnerChance };
    }

    const key = [g.player_a, g.player_b].sort().join('|');
    if (!pairs.has(key)) pairs.set(key, { ids: key.split('|'), games: 0 });
    pairs.get(key).games++;

    for (const [team, won] of [[g.team_a, !homeWon], [g.team_b, homeWon]]) {
      if (!team) continue;
      const t = tiers.get(TEAM_TIERS[team]);
      if (t) {
        t.picks++;
        if (won) t.w++;
      }
      if (!teams.has(team)) teams.set(team, { abbr: team, picks: 0, w: 0 });
      const tm = teams.get(team);
      tm.picks++;
      if (won) tm.w++;
    }
  }

  const players = [...calc.stats.values()].filter((p) => p.games > 0);
  let peak = null;
  for (const p of players) {
    for (const h of p.history) {
      if (!peak || h.rating > peak.rating) peak = { player: p, ...h };
    }
  }
  let streak = null;
  for (const p of players) {
    const s = streaks(gs.filter((g) => g.player_a === p.id || g.player_b === p.id).map((g) => side(g, p.id)));
    if (s.longest && (!streak || s.longest > streak.n)) streak = { player: p, n: s.longest };
  }
  const mostGames = players.sort((x, y) => y.games - x.games)[0] ?? null;
  const rivalry = [...pairs.values()].sort((x, y) => y.games - x.games)[0] ?? null;

  return {
    games: n,
    players: players.length,
    goals,
    ot,
    homeWins,
    blowout,
    shootout,
    upset,
    peak,
    streak,
    mostGames,
    rivalry,
    za: { ...za, ledger: [...za.ledger.values()].sort((x, y) => y.won - y.owed - (x.won - x.owed) || y.won - x.won) },
    tiers: [...tiers.values()],
    teams: [...teams.values()].sort((x, y) => y.picks - x.picks || y.w - x.w),
  };
}

// The Big 3: the top three ranked players. Replays the history to know who was in it after
// every game, so it can tell how long each player has spent there, who knocked whom out,
// and who beat the Big 3 most. Times come from created_at (when games were logged).
export function bigThree(calc, allGames, now = Date.now()) {
  const gs = [...allGames].sort(compareGames);
  const st = new Map();
  const get = (id) => {
    if (!st.has(id)) st.set(id, { games: 0, opps: new Set(), rating: START });
    return st.get(id);
  };
  const totals = new Map();
  const total = (id) => {
    if (!totals.has(id)) totals.set(id, { id, ms: 0, entries: 0, longest: 0 });
    return totals.get(id);
  };
  const stintStart = new Map();
  const scalps = new Map();
  const events = [];
  let current = [];
  let formedAt = null;
  let first = null;

  const top3 = () => [...st.entries()]
    .filter(([, s]) => s.games >= MIN_GAMES && s.opps.size >= MIN_OPPONENTS)
    .sort((x, y) => y[1].rating - x[1].rating)
    .slice(0, 3)
    .map(([id]) => id);

  for (const g of gs) {
    const d = calc.perGame.get(g.id);
    if (!d) continue;
    const t = Date.parse(g.created_at);
    const aWon = g.score_a > g.score_b;
    const winner = aWon ? g.player_a : g.player_b;
    const loser = aWon ? g.player_b : g.player_a;
    if (current.includes(loser)) scalps.set(winner, (scalps.get(winner) ?? 0) + 1);

    const a = get(g.player_a);
    const b = get(g.player_b);
    a.games++;
    b.games++;
    a.opps.add(g.player_b);
    b.opps.add(g.player_a);
    a.rating = d.ratingA;
    b.rating = d.ratingB;

    const next = top3();
    const joined = next.filter((id) => !current.includes(id));
    const left = current.filter((id) => !next.includes(id));
    for (const id of left) {
      const ms = t - stintStart.get(id);
      const tot = total(id);
      tot.ms += ms;
      tot.longest = Math.max(tot.longest, ms);
      events.push({ t, id, type: 'out', by: joined[0] ?? null });
    }
    for (const id of joined) {
      stintStart.set(id, t);
      total(id).entries++;
      events.push({ t, id, type: 'in', replaced: left[0] ?? null });
    }
    if (joined.length || left.length) formedAt = t;
    if (!first && next.length === 3) first = { t, ids: next };
    current = next;
  }

  // Stints still running count up to now.
  const board = [...totals.values()].map((x) => {
    const open = current.includes(x.id) ? now - stintStart.get(x.id) : 0;
    return { ...x, ms: x.ms + open, longest: Math.max(x.longest, open), active: current.includes(x.id) };
  }).sort((x, y) => y.ms - x.ms);

  return {
    current: current.map((id) => ({ id, since: stintStart.get(id), rating: st.get(id).rating })),
    formedAt: current.length === 3 ? formedAt : null,
    first,
    board,
    scalps: [...scalps.entries()].map(([id, n]) => ({ id, n })).sort((x, y) => y.n - x.n),
    events: events.slice(-8).reverse(),
  };
}
