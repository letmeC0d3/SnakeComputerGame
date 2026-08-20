-- Create the game_scores table
create table public.game_scores (
    id bigint generated always as identity primary key,
    game_session_id uuid not null,
    client_id uuid,
    display_name text not null,
    score integer not null check (score >= 0),
    game_mode text not null check (game_mode in ('classic', 'daily')),
    challenge_date date,
    duration_ms integer not null check (duration_ms > 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.game_scores enable row level security;

-- Create Indexes for fast leaderboard querying
create index idx_game_scores_classic on public.game_scores(game_mode, score desc, created_at asc) 
where game_mode = 'classic';

create index idx_game_scores_daily on public.game_scores(game_mode, challenge_date, score desc, created_at asc) 
where game_mode = 'daily';

create unique index idx_game_scores_session_unique on public.game_scores(game_session_id);

-- RLS Policies
-- Note: The application API uses the service_role key to insert and query scores,
-- which bypasses RLS. If you plan to read/write directly from the frontend client in the future,
-- you will need the following policies:

-- Allow public read access to scores
create policy "Allow public read access"
on public.game_scores
for select
using (true);

-- Allow anonymous inserts (if not using the service role key server-side endpoint)
-- create policy "Allow anonymous inserts"
-- on public.game_scores
-- for insert
-- with check (true);
