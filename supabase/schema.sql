-- =============================================
-- re:read — Supabase Schema
-- Run this in the Supabase SQL editor
-- =============================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- -------------------------
-- Books
-- -------------------------
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  total_pages integer not null check (total_pages > 0),
  start_page integer not null default 1 check (start_page >= 1),
  readable_pages integer not null generated always as (total_pages - (start_page - 1)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table books enable row level security;
create policy "Users manage their own books" on books
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -------------------------
-- Reading Sets
-- -------------------------
create table if not exists reading_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  reread_count integer not null default 1 check (reread_count >= 1),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  rest_days integer[] not null default '{}', -- 0=Sun..6=Sat
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table reading_sets enable row level security;
create policy "Users manage their own sets" on reading_sets
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -------------------------
-- Reading Set Items (books in a set, ordered)
-- -------------------------
create table if not exists reading_set_items (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references reading_sets(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  unique (set_id, book_id)
);

alter table reading_set_items enable row level security;
create policy "Users access items of their sets" on reading_set_items
  using (
    exists (
      select 1 from reading_sets rs
      where rs.id = reading_set_items.set_id
        and rs.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from reading_sets rs
      where rs.id = reading_set_items.set_id
        and rs.user_id = auth.uid()
    )
  );

-- -------------------------
-- Reading Logs (one per day per set)
-- -------------------------
create table if not exists reading_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  set_id uuid not null references reading_sets(id) on delete cascade,
  book_id uuid not null references books(id) on delete cascade,
  log_date date not null,
  target_start_page integer not null,
  target_end_page integer not null,
  book_occurrence integer not null default 0, -- position in the set's full reread sequence
  actual_page integer, -- last page actually read (null = not recorded / passed)
  status text not null default 'not_done'
    check (status in ('completed', 'partial', 'not_done', 'passed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, set_id, log_date)
);

alter table reading_logs add column if not exists book_occurrence integer not null default 0;

alter table reading_logs enable row level security;
create policy "Users manage their own logs" on reading_logs
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -------------------------
-- User Settings
-- -------------------------
create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  notification_time time, -- e.g. '21:00:00'
  rest_days integer[] not null default '{}', -- default rest days, pre-fills new sets
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_settings add column if not exists rest_days integer[] not null default '{}';

alter table user_settings enable row level security;
create policy "Users manage their own settings" on user_settings
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -------------------------
-- Auto-update updated_at trigger
-- -------------------------
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger books_updated_at before update on books
  for each row execute function update_updated_at();
create trigger reading_sets_updated_at before update on reading_sets
  for each row execute function update_updated_at();
create trigger reading_logs_updated_at before update on reading_logs
  for each row execute function update_updated_at();
create trigger user_settings_updated_at before update on user_settings
  for each row execute function update_updated_at();

-- -------------------------
-- Indexes
-- -------------------------
create index on books (user_id);
create index on reading_sets (user_id);
create index on reading_set_items (set_id);
create index on reading_logs (user_id, log_date);
create index on reading_logs (set_id, log_date);
