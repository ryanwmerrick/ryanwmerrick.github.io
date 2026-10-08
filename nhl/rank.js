// Rating math. Pure functions only, so it can be tested outside the browser.

export const START = 1000;
// K is the most a game can move a rating (before the margin bonus). New players move fast
// so they find their level; after K_STEP_GAMES games they settle to the smaller K.
export const K_NEW = 32;
export const K_SETTLED = 20;
export const K_STEP_GAMES = 20;
export const MIN_GAMES = 5;
// Different opponents needed to be ranked, so nobody gets ranked by beating one friend.
export const MIN_OPPONENTS = 3;
export const OT_WIN = 0.75;
// Home ice: Elo added to the home player (player_b) when predicting the result. It starts
// at HOME_PRIOR and leans toward what the league's games show as they pile up:
// (HOME_WEIGHT × HOME_PRIOR + games × estimate) / (HOME_WEIGHT + games), kept within 0..HOME_MAX.
export const HOME_PRIOR = 25;
export const HOME_WEIGHT = 200;
export const HOME_MAX = 50;

// Elo added to whoever uses a team in each tier, when predicting the result only.
export const TIER_BONUS = { 1: 30, 2: 10, 3: -10, 4: -30 };

// Team tiers (1 = best): ESPN's 2026-27 preseason power rankings (Sep 28, 2026),
// then adjusted by the group. Teams not listed, or no team logged, count as +0.
export const TEAM_TIERS = {
  CAR: 1, COL: 1, DAL: 1, FLA: 1, VGK: 1, MIN: 1, TOR: 1, TBL: 1,
  EDM: 2, BUF: 2, WSH: 2, NJD: 2, PHI: 2, MTL: 2, WPG: 2, LAK: 2,
  BOS: 3, OTT: 3, PIT: 3, NYI: 3, CBJ: 3, UTA: 3, SJS: 3, ANA: 3,
  NYR: 4, NSH: 4, DET: 4, CHI: 4, SEA: 4, CGY: 4, VAN: 4, STL: 4,
};

export const teamBonus = (abbr) => TIER_BONUS[TEAM_TIERS[abbr]] ?? 0;

// Local calendar date as YYYY-MM-DD.
export function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Date strings are treated as plain calendar days (UTC math avoids DST shifts).
const toDate = (s) => new Date(s + 'T00:00:00Z');
const toStr = (d) => d.toISOString().slice(0, 10);

export function addDays(s, n) {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toStr(d);
}

// Monday of the week containing s.
export function weekStart(s) {
  const d = toDate(s);
  return addDays(s, -((d.getUTCDay() + 6) % 7));
}

// Games happen in the order they were logged. created_at is stamped by the database clock
// (a trigger in setup.sql sets it on insert and never lets it change), so no phone's clock
// or date picker can move a game in the history.
export function compareGames(a, b) {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// Lose by 7+ and you owe the winner a pizza (a "za"). 11+ is a double za, 14+ a triple.
export const ZA_STEPS = [7, 11, 14];
export const zaLevel = (g) => ZA_STEPS.filter((m) => Math.abs(g.score_a - g.score_b) >= m).length;

// winnerGap is the winner's rating minus the loser's (with team tier and home bonuses).
// The bonus is 1 + 0.25·ln(margin), up to 1.5×. The FiveThirtyEight-style factor shrinks it
// when the favourite wins big and grows it when the underdog does, so blowing out weaker
// players isn't a free farm.
export function marginMultiplier(margin, ot, winnerGap = 0) {
  if (ot) return 1;
  const bonus = Math.min(1.5, 1 + 0.25 * Math.log(margin));
  return bonus * (2.2 / Math.max(1, winnerGap * 0.001 + 2.2));
}

export const kFor = (gamesPlayed) => (gamesPlayed < K_STEP_GAMES ? K_NEW : K_SETTLED);

// Replays the full history in date order with home bonus `home`. player_a is away,
// player_b is home. Returns per-player totals and rating history; each game's rating
// changes, the away player's pre-game win chance, and both ratings after the game; and
// homeSurprise, how much better home did than ratings alone (no home bonus) predicted.
function replay(players, games, home) {
  const stats = new Map(players.map((p) => [p.id, {
    id: p.id, name: p.name, rating: START, games: 0, w: 0, l: 0, otl: 0, opponents: new Set(),
    history: [], peak: START,
  }]));
  const perGame = new Map();
  let homeSurprise = 0;
  let counted = 0;

  for (const g of [...games].sort(compareGames)) {
    const a = stats.get(g.player_a);
    const b = stats.get(g.player_b);
    if (!a || !b || g.score_a === g.score_b) continue;

    const rawGap = a.rating + teamBonus(g.team_a) - (b.rating + teamBonus(g.team_b));
    const gapA = rawGap - home;
    const expA = 1 / (1 + 10 ** (-gapA / 400));

    const aWon = g.score_a > g.score_b;
    const sA = aWon ? (g.ot ? OT_WIN : 1) : (g.ot ? 1 - OT_WIN : 0);
    homeSurprise += (1 - sA) - 1 / (1 + 10 ** (rawGap / 400));
    counted++;

    // Each player moves by their own K, so a settled player and a new player can move different amounts.
    const swing = marginMultiplier(Math.abs(g.score_a - g.score_b), g.ot, aWon ? gapA : -gapA) * (sA - expA);
    const deltaA = kFor(a.games) * swing;
    const deltaB = -kFor(b.games) * swing;

    a.rating += deltaA;
    b.rating += deltaB;
    a.games++;
    b.games++;
    a.opponents.add(b.id);
    b.opponents.add(a.id);
    const [winner, loser] = aWon ? [a, b] : [b, a];
    winner.w++;
    if (g.ot) loser.otl++; else loser.l++;

    a.history.push({ id: g.id, played_on: g.played_on, rating: a.rating });
    b.history.push({ id: g.id, played_on: g.played_on, rating: b.rating });
    a.peak = Math.max(a.peak, a.rating);
    b.peak = Math.max(b.peak, b.rating);

    perGame.set(g.id, { a: deltaA, b: deltaB, expA, ratingA: a.rating, ratingB: b.rating });
  }

  return { stats, perGame, homeSurprise: counted ? homeSurprise / counted : 0, counted };
}

// The home bonus depends on ratings and ratings depend on the home bonus, so settle both
// by replaying a few times (it converges in two or three passes).
export function computeRatings(players, games) {
  let home = HOME_PRIOR;
  let calc = replay(players, games, home);
  for (let i = 0; i < 4; i++) {
    const e = Math.max(-0.45, Math.min(0.45, calc.homeSurprise));
    const estimate = 400 * Math.log10((0.5 + e) / (0.5 - e));
    const n = calc.counted;
    const next = Math.max(0, Math.min(HOME_MAX, (HOME_WEIGHT * HOME_PRIOR + n * estimate) / (HOME_WEIGHT + n)));
    if (Math.abs(next - home) < 0.05) break;
    home = next;
    calc = replay(players, games, home);
  }
  return { ...calc, home };
}

export function overallTable(calc) {
  const all = [...calc.stats.values()];
  const isRanked = (p) => p.games >= MIN_GAMES && p.opponents.size >= MIN_OPPONENTS;
  const ranked = all.filter(isRanked)
    .sort((x, y) => y.rating - x.rating);
  const unranked = all.filter((p) => !isRanked(p))
    .sort((x, y) => y.games - x.games || y.opponents.size - x.opponents.size || x.name.localeCompare(y.name));
  return { ranked, unranked };
}

// Rating points gained in the week starting on `monday`, with that week's record.
export function weeklyTable(calc, games, monday) {
  const end = addDays(monday, 6);
  const rows = new Map();
  const row = (id) => {
    if (!rows.has(id)) rows.set(id, { id, name: calc.stats.get(id).name, points: 0, w: 0, l: 0, otl: 0 });
    return rows.get(id);
  };

  for (const g of games) {
    if (g.played_on < monday || g.played_on > end) continue;
    const d = calc.perGame.get(g.id);
    if (!d) continue;
    const a = row(g.player_a);
    const b = row(g.player_b);
    a.points += d.a;
    b.points += d.b;
    const [winner, loser] = g.score_a > g.score_b ? [a, b] : [b, a];
    winner.w++;
    if (g.ot) loser.otl++; else loser.l++;
  }

  return [...rows.values()].sort((x, y) => y.points - x.points || y.w - x.w);
}

// Win chance for `a` against `b` on neutral ice with no team bonus.
export function winChance(ratingA, ratingB) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}
