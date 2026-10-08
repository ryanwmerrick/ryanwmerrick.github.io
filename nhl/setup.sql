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

-- A game's time is when it was logged, by the database clock (added 2026-10-08).
-- From the page (the anon role): an insert gets created_at = now() and played_on = today
-- in the league's time zone, whatever the phone sent; an update keeps both, and can't
-- change who played (fix a wrong player by deleting the game and logging it again).
-- The SQL editor runs as postgres, so a deliberate fix there is still possible.
create or replace function public.games_stamp_time() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.played_on := (now() at time zone 'America/New_York')::date;
  else
    new.created_at := old.created_at;
    new.played_on := old.played_on;
    if new.player_a is distinct from old.player_a or new.player_b is distinct from old.player_b then
      raise exception 'players_locked: delete this game and log it again to change who played'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists games_stamp_time on public.games;
create trigger games_stamp_time
  before insert or update on public.games
  for each row execute function public.games_stamp_time();
