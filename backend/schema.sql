-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('passenger', 'driver')),
  created_at timestamptz not null default now()
);

create table if not exists drivers (
  user_id uuid primary key references users(id) on delete cascade,
  lat double precision,
  lng double precision,
  is_online boolean not null default false,
  is_busy boolean not null default false,
  accepted_rides int not null default 0,
  completed_rides int not null default 0
);

create table if not exists rides (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references users(id),
  driver_id uuid references users(id),          -- set once committed
  offered_to uuid references users(id),         -- driver currently seeing the request
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  drop_lat double precision not null,
  drop_lng double precision not null,
  intent text not null default 'flexible'
    check (intent in ('flexible', 'important', 'time_sensitive')),
  intent_reason text check (char_length(intent_reason) <= 80),
  status text not null default 'requested'
    check (status in ('requested', 'offered', 'committed', 'completed',
                      'cancelled_by_passenger', 'no_driver')),
  fare_estimate numeric,
  match_score numeric,
  pickup_eta_min numeric,
  excluded_driver_ids uuid[] not null default '{}',
  reassign_count int not null default 0,
  reassign_started_at timestamptz,
  reassign_seconds numeric,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz
);

create table if not exists driver_events (
  id bigint generated always as identity primary key,
  driver_id uuid not null references users(id),
  ride_id uuid references rides(id),
  event_type text not null
    check (event_type in ('accept', 'decline', 'cancel_after_accept', 'complete')),
  created_at timestamptz not null default now()
);

create index if not exists idx_events_driver_time on driver_events (driver_id, created_at);
create index if not exists idx_rides_passenger_time on rides (passenger_id, created_at);

-- Realtime: lets the Expo app subscribe to ride status changes
alter publication supabase_realtime add table rides;

-- The app only listens for "something changed" and then re-fetches through the
-- FastAPI backend. For the prototype we allow anonymous read on rides so realtime
-- events are delivered. Writes stay backend-only (service_role bypasses RLS).
alter table rides enable row level security;
drop policy if exists "prototype read rides" on rides;
create policy "prototype read rides" on rides for select to anon using (true);

-- ---------- Demo seed data (replace the coordinates with your campus) ----------
insert into users (id, name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Demo Passenger', 'passenger'),
  ('22222222-2222-2222-2222-000000000001', 'Driver A (new)', 'driver'),
  ('22222222-2222-2222-2222-000000000002', 'Driver B (reliable)', 'driver'),
  ('22222222-2222-2222-2222-000000000003', 'Driver C (flaky)', 'driver'),
  ('22222222-2222-2222-2222-000000000004', 'Driver D (reliable)', 'driver'),
  ('22222222-2222-2222-2222-000000000005', 'Driver E (flaky)', 'driver')
on conflict do nothing;

-- Center point 20.0000, 77.0000 is a placeholder. Offsets of 0.01 deg are about 1.1 km.
insert into drivers (user_id, lat, lng, is_online, accepted_rides, completed_rides) values
  ('22222222-2222-2222-2222-000000000001', 20.0040, 77.0030, true,  0,  0),
  ('22222222-2222-2222-2222-000000000002', 20.0200, 77.0100, true, 60, 57),
  ('22222222-2222-2222-2222-000000000003', 20.0020, 77.0010, true, 40, 28),
  ('22222222-2222-2222-2222-000000000004', 19.9900, 77.0150, true, 80, 76),
  ('22222222-2222-2222-2222-000000000005', 20.0010, 76.9990, true, 30, 20)
on conflict do nothing;
