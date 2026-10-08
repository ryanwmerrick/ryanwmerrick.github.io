-- NHL 27 1v1 rankings: run once in the Supabase SQL editor.
-- There is no login on purpose: anyone with the link can read and write.

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);

-- "Mike" and "mike" count as the same name.
create unique index players_name_ci on public.players (lower(btrim(name)));

create table public.games (
  id uuid primary key default gen_random_uuid(),
  player_a uuid not null references public.players (id),
  player_b uuid not null references public.players (id),
  score_a smallint not null check (score_a between 0 and 99),
  score_b smallint not null check (score_b between 0 and 99),
  team_a text,
  team_b text,
  ot boolean not null default false,
  played_on date not null default current_date,
  created_at timestamptz not null default now(),
  constraint different_players check (player_a <> player_b),
  constraint no_ties check (score_a <> score_b),
  constraint ot_by_one check (not ot or abs(score_a - score_b) = 1)
);

create index games_played_on on public.games (played_on, created_at);

-- Row level security with open policies for the anon (no-login) role.
alter table public.players enable row level security;
alter table public.games enable row level security;

create policy "anyone can read players" on public.players for select to anon using (true);
create policy "anyone can add players" on public.players for insert to anon with check (true);

create policy "anyone can read games" on public.games for select to anon using (true);
create policy "anyone can add games" on public.games for insert to anon with check (true);
create policy "anyone can edit games" on public.games for update to anon using (true) with check (true);
create policy "anyone can delete games" on public.games for delete to anon using (true);

-- Newer projects don't always expose new tables to the API automatically.
grant select, insert on public.players to anon;
grant select, insert, update, delete on public.games to anon;

-- Live updates.
alter publication supabase_realtime add table public.players, public.games;

