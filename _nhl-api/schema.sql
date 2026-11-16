-- NHL 27 1v1 rankings (D1 / SQLite). Same rules the Supabase tables had.
-- Apply with: npx wrangler d1 execute nhl --remote --file=schema.sql

create table if not exists players (
  id text primary key,
  name text not null check (length(trim(name)) between 1 and 40),
  created_at text not null
);

-- "Mike" and "mike" count as the same name.
create unique index if not exists players_name_ci on players (lower(trim(name)));

create table if not exists games (
  id text primary key,
  player_a text not null references players (id),
  player_b text not null references players (id),
  score_a integer not null check (score_a between 0 and 99),
  score_b integer not null check (score_b between 0 and 99),
  team_a text,
  team_b text,
  ot integer not null default 0 check (ot in (0, 1)),
  played_on text not null,
  -- ISO 8601 UTC with milliseconds (2026-10-08T17:55:00.000Z), so text order is time order.
  created_at text not null,
  check (player_a <> player_b),
  check (score_a <> score_b),
  check (ot = 0 or abs(score_a - score_b) = 1)
);

create index if not exists games_created_at on games (created_at);

-- One row: bumped on every write, so pages can ask "has anything changed?" with a single-row read.
create table if not exists meta (
  id integer primary key check (id = 1),
  version integer not null
);
insert or ignore into meta (id, version) values (1, 0);
