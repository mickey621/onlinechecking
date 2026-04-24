create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  user_code text unique not null,
  name text not null,
  role text not null check (role in ('admin')),
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null default 80,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  session_id uuid not null references sessions(id) on delete cascade,
  name text not null,
  checkin_time timestamptz not null default now(),
  latitude double precision not null,
  longitude double precision not null,
  device_id text null,
  ip_address text null,
  user_agent text null,
  is_suspicious boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_checkins_session_id on checkins(session_id);

-- v3: allow admins to choose whether a session requires GPS location.
alter table if exists sessions
  add column if not exists require_gps boolean not null default true;
