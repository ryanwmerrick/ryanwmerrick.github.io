// Rating math. Pure functions only, so it can be tested outside the browser.

export const START = 1000;
export const K = 32;
export const TEAM_K = 4;
export const TEAM_CAP = 40;
export const MIN_GAMES = 5;
// Different opponents needed to be ranked, so nobody gets ranked by beating one friend.
export const MIN_OPPONENTS = 3;
export const OT_WIN = 0.75;
// Rating points added to the home player (player_b) when predicting the result.
export const HOME_ADV = 25;

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

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

export function compareGames(a, b) {
  if (a.played_on !== b.played_on) return a.played_on < b.played_on ? -1 : 1;
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
  return 0;
}

// winnerGap is the winner's rating minus the loser's (with team and home bonuses).
// The FiveThirtyEight-style factor shrinks the bonus when the favourite wins big and
// grows it when the underdog does, so blowing out weaker players isn't a free farm.
export function marginMultiplier(margin, ot, winnerGap = 0) {
  if (ot) return 1;
  const bonus = Math.min(2, 1 + 0.5 * Math.log(margin));
  return bonus * (2.2 / Math.max(1, winnerGap * 0.001 + 2.2));
}

// Replays the full history in date order. player_a is away, player_b is home.
// Returns per-player totals, hidden team strengths, and each game's rating change.
export function computeRatings(players, games) {
  const stats = new Map(players.map((p) => [p.id, {
    id: p.id, name: p.name, rating: START, games: 0, w: 0, l: 0, otl: 0, opponents: new Set(),
  }]));
  const teams = new Map();
  const perGame = new Map();

  for (const g of [...games].sort(compareGames)) {
    const a = stats.get(g.player_a);
    const b = stats.get(g.player_b);
    if (!a || !b || g.score_a === g.score_b) continue;

    const ta = g.team_a ? teams.get(g.team_a) ?? 0 : 0;
    const tb = g.team_b ? teams.get(g.team_b) ?? 0 : 0;
    const gapA = a.rating + ta - (b.rating + tb + HOME_ADV);
    const expA = 1 / (1 + 10 ** (-gapA / 400));

    const aWon = g.score_a > g.score_b;
    const sA = aWon ? (g.ot ? OT_WIN : 1) : (g.ot ? 1 - OT_WIN : 0);
    const mult = marginMultiplier(Math.abs(g.score_a - g.score_b), g.ot, aWon ? gapA : -gapA);
    const delta = K * mult * (sA - expA);

    a.rating += delta;
    b.rating -= delta;
    a.games++;
    b.games++;
    a.opponents.add(b.id);
    b.opponents.add(a.id);
    const [winner, loser] = aWon ? [a, b] : [b, a];
    winner.w++;
    if (g.ot) loser.otl++; else loser.l++;

    // Mirror matches (same team on both sides) tell us nothing about the team.
    if (g.team_a !== g.team_b) {
      const surprise = sA - expA;
      if (g.team_a) teams.set(g.team_a, clamp(ta + TEAM_K * surprise, -TEAM_CAP, TEAM_CAP));
      if (g.team_b) teams.set(g.team_b, clamp(tb - TEAM_K * surprise, -TEAM_CAP, TEAM_CAP));
    }

    perGame.set(g.id, { a: delta, b: -delta });
  }

  return { stats, teams, perGame };
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
