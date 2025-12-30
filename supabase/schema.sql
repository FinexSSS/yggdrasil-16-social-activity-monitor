-- DEMO SCHEMA SETUP (FULL RESET)
-- This schema is designed for the client-side Facebook demo.
-- It will DROP existing tables and recreate them.

-- ==========================================
-- 1. RESET (Caution: Deletes all data)
-- ==========================================
drop table if exists realm_journals;
drop table if exists user_goals;
drop table if exists garden_history;
drop table if exists profiles;

-- ==========================================
-- 2. CREATE TABLES
-- ==========================================

-- PROFILES
-- Stores user identity, current realm, assigned tree, runes, purchased trees/realms, and latest Facebook data
create table profiles (
  id text primary key, -- Facebook ID
  username text unique, -- Unique handle (e.g. @thor)
  assigned_model text default 'tree/1-young-oak-seedling.glb', -- The 3D tree model file (equipped)
  realm text, -- The Norse realm assigned during onboarding (e.g. Asgard)
  active_realm text, -- The currently selected/active realm to display (can switch between purchased realms)
  rune_points integer default 0, -- Total rune points earned from milestones
  purchased_trees text[] default array['tree/1-young-oak-seedling.glb']::text[], -- Array of purchased/unlocked tree models
  purchased_realms text[] default array[]::text[], -- Array of purchased/unlocked realms (assigned realm is free, others must be purchased)
  milestones_claimed jsonb default '{
    "friends_100": false,
    "friends_500": false,
    "friends_1000": false,
    "friends_5000": false,
    "posts_100": false,
    "posts_500": false,
    "posts_1000": false,
    "posts_5000": false
  }'::jsonb, -- Tracks which milestones have been claimed
  facebook_data jsonb, -- Full latest JSON blob from FB
  weather_settings jsonb, -- User's weather preferences (mode, manualWeather)
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- GARDEN HISTORY
-- Stores daily snapshots of a user's Facebook data for "Time Travel"
create table garden_history (
  id uuid default gen_random_uuid() primary key,
  user_id text references profiles(id) not null,
  snapshot_date date not null,
  facebook_data jsonb, -- The FB data state on that day
  weather_auto text, -- Auto-generated weather based on time/season
  weather_manual text, -- User-selected weather (if any)
  rune_points integer default 0, -- Rune points at the time of snapshot
  assigned_model text, -- The tree model equipped at the time of snapshot
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, snapshot_date) -- One snapshot per user per day
);

-- USER GOALS
-- Stores user-defined personal goals (e.g., "Reach 25 friends")
create table user_goals (
  id uuid default gen_random_uuid() primary key,
  user_id text references profiles(id) not null unique, -- One goal per user
  goal_type text not null check (goal_type in ('friends', 'photos', 'posts', 'albums', 'likes', 'videos')),
  target_value integer not null check (target_value > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- REALM JOURNALS
-- Stores journal entries for each of the 9 Norse realms
create table realm_journals (
  id uuid default gen_random_uuid() primary key,
  user_id text references profiles(id) not null,
  realm text not null check (realm in ('Asgard', 'Vanaheim', 'Alfheim', 'Midgard', 'Jötunheim', 'Svartalfheim', 'Niflheim', 'Muspelheim', 'Helheim')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster lookups by user and realm
create index idx_realm_journals_user_realm on realm_journals(user_id, realm);

-- ==========================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ==========================================
alter table profiles enable row level security;
alter table garden_history enable row level security;
alter table user_goals enable row level security;
alter table realm_journals enable row level security;

-- ==========================================
-- 4. POLICIES (PERMISSIVE FOR DEMO)
-- ==========================================

-- PROFILES POLICIES
create policy "Public profiles are viewable by everyone" 
  on profiles for select using (true);

create policy "Enable insert for anon (Demo)" 
  on profiles for insert with check (true);

create policy "Enable update for anon (Demo)" 
  on profiles for update using (true);

create policy "Enable delete for anon (Demo)" 
  on profiles for delete using (true);

-- HISTORY POLICIES
create policy "Public history is viewable by everyone" 
  on garden_history for select using (true);

create policy "Enable insert for anon (Demo)" 
  on garden_history for insert with check (true);

create policy "Enable update for anon (Demo)" 
  on garden_history for update using (true);

create policy "Enable delete for anon (Demo)" 
  on garden_history for delete using (true);

-- GOALS POLICIES
create policy "Public goals are viewable by everyone" 
  on user_goals for select using (true);

create policy "Enable insert for anon (Demo)" 
  on user_goals for insert with check (true);

create policy "Enable update for anon (Demo)" 
  on user_goals for update using (true);

create policy "Enable delete for anon (Demo)" 
  on user_goals for delete using (true);

-- REALM JOURNALS POLICIES
create policy "Journals are viewable by owner" 
  on realm_journals for select using (true);

create policy "Enable insert for anon (Demo)" 
  on realm_journals for insert with check (true);

create policy "Enable delete for anon (Demo)" 
  on realm_journals for delete using (true);

-- ==========================================
-- VERIFICATION QUERIES (Run these to check data)
-- ==========================================

-- 1. See all profiles with runes and milestones
-- select id, username, realm, assigned_model, rune_points, purchased_trees, milestones_claimed from profiles;

-- 2. Check usernames and realms
-- select id, username, realm, assigned_model, rune_points from profiles;

-- 3. See all history snapshots
-- select * from garden_history order by snapshot_date desc;

-- 4. Check specific Facebook fields (JSON extraction)
-- select 
--   id, 
--   username,
--   facebook_data->>'name' as name, 
--   facebook_data->>'email' as email, 
--   jsonb_array_length(facebook_data->'additional_data'->'friends'->'data') as friend_count
-- from profiles;

-- 5. DETAILED INSPECTION: See all requested fields including runes
-- select 
--   id,
--   username,
--   realm,
--   assigned_model,
--   rune_points,
--   purchased_trees,
--   milestones_claimed,
--   weather_settings,
--   facebook_data->>'name' as name,
--   facebook_data->>'email' as email,
--   facebook_data->'additional_data'->'friends' as friends_full_data,
--   facebook_data->'additional_data'->'photos' as photos_full_data,
--   facebook_data->'additional_data'->'albums' as albums_full_data,
--   facebook_data->'additional_data'->'posts' as posts_full_data,
--   facebook_data->'additional_data'->'likes' as likes_full_data,
--   facebook_data->'additional_data'->'videos' as videos_full_data
-- from profiles;

-- 6. VIEW GARDEN HISTORY WITH WEATHER
-- select 
--   gh.user_id,
--   p.username,
--   gh.snapshot_date,
--   COALESCE(gh.weather_manual, gh.weather_auto) as displayed_weather,
--   gh.weather_auto as auto_weather,
--   gh.weather_manual as manual_weather,
--   gh.facebook_data->>'name' as user_name,
--   jsonb_array_length(gh.facebook_data->'additional_data'->'posts'->'data') as post_count,
--   jsonb_array_length(gh.facebook_data->'additional_data'->'friends'->'data') as friend_count,
--   gh.created_at
-- from garden_history gh
-- left join profiles p on gh.user_id = p.id
-- order by gh.snapshot_date desc, gh.user_id;

-- ==========================================
-- 7. VIEW ALL USERS' JOURNAL ENTRIES (ADMIN)
-- ==========================================
-- This query shows all journal entries from all users
-- with user details and realm information

-- select 
--   rj.id as journal_id,
--   rj.user_id,
--   p.username,
--   p.facebook_data->>'name' as user_name,
--   rj.realm,
--   rj.content,
--   rj.created_at
-- from realm_journals rj
-- left join profiles p on rj.user_id = p.id
-- order by rj.created_at desc;

-- 8. VIEW JOURNALS BY REALM (grouped summary)
-- select 
--   realm,
--   count(*) as entry_count,
--   count(distinct user_id) as unique_users
-- from realm_journals
-- group by realm
-- order by entry_count desc;

-- 9. VIEW SPECIFIC USER'S ALL JOURNALS
-- select 
--   rj.realm,
--   rj.content,
--   rj.created_at
-- from realm_journals rj
-- where rj.user_id = 'REPLACE_WITH_USER_ID'
-- order by rj.realm, rj.created_at desc;
