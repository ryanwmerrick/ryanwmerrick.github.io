// Stats for the player, head-to-head and league panels. Pure functions over the
// games list and the output of computeRatings, so it can be tested outside the browser.

import { compareGames, TEAM_TIERS, weekStart, today } from './rank.js?v=14';

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

  for (const s of sides) {
    tally(s.home ? home : away, s);
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

  for (const s of sx) {
    tally(recX, s);
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

  for (const g of gs) {
    const total = g.score_a + g.score_b;
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
    tiers: [...tiers.values()],
    teams: [...teams.values()].sort((x, y) => y.picks - x.picks || y.w - x.w),
  };
}
