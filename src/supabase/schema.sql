-- Core extensions
create extension if not exists "pgcrypto";

-- Updated-at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  status text check (status in ('student', 'pgwp')),
  expiry_date date,
  city text,
  pro boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- reminders
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  due_at timestamptz not null,
  run_at timestamptz,
  reminder_type text,
  related_date_type text,
  target_date date,
  notes text,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  doc_type text,
  created_at timestamptz not null default now()
);

-- notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  resolved boolean not null default false
);

-- Triggers
create or replace trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace trigger trg_reminders_updated_at
before update on public.reminders
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.reminders enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;

-- Profiles policies
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id);

-- Reminders policies
create policy "reminders_select_own" on public.reminders
for select using (auth.uid() = user_id);

create policy "reminders_insert_own" on public.reminders
for insert with check (auth.uid() = user_id);

create policy "reminders_update_own" on public.reminders
for update using (auth.uid() = user_id);

create policy "reminders_delete_own" on public.reminders
for delete using (auth.uid() = user_id);

-- Documents policies
create policy "documents_select_own" on public.documents
for select using (auth.uid() = user_id);

create policy "documents_insert_own" on public.documents
for insert with check (auth.uid() = user_id);

create policy "documents_delete_own" on public.documents
for delete using (auth.uid() = user_id);

-- Notifications policies
create policy "notifications_select_own" on public.notifications
for select using (auth.uid() = user_id);

create policy "notifications_insert_own" on public.notifications
for insert with check (auth.uid() = user_id);

create policy "notifications_update_own" on public.notifications
for update using (auth.uid() = user_id);

-- Storage bucket (run once)
insert into storage.buckets (id, name, public)
values ('vault', 'vault', false)
on conflict (id) do nothing;

-- Storage policies: user folder must match auth.uid()
create policy "vault_select_own" on storage.objects
for select using (
  bucket_id = 'vault' and split_part(name, '/', 1) = auth.uid()::text
);

create policy "vault_insert_own" on storage.objects
for insert with check (
  bucket_id = 'vault' and split_part(name, '/', 1) = auth.uid()::text
);

create policy "vault_delete_own" on storage.objects
for delete using (
  bucket_id = 'vault' and split_part(name, '/', 1) = auth.uid()::text
);

-- PGWP Risk v0.1 additions
alter table public.profiles add column if not exists study_permit_expiry_date date;
alter table public.profiles add column if not exists knows_expiry boolean not null default false;
alter table public.profiles add column if not exists program_end_date date;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'done')),
  category text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pgwp_risk (
  user_id uuid primary key references auth.users(id) on delete cascade,
  risk_level text not null check (risk_level in ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN')),
  risk_score int not null check (risk_score >= 0 and risk_score <= 100),
  days_to_permit_expiry int,
  days_to_program_end int,
  days_since_program_end int,
  reasons jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  version text not null default 'pgwp-v0.1'
);

create table if not exists public.pgwp_risk_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  risk_score int not null check (risk_score >= 0 and risk_score <= 100),
  risk_level text not null check (risk_level in ('LOW', 'MEDIUM', 'HIGH', 'UNKNOWN')),
  permit_days_left int,
  program_days_to_end int,
  program_days_since_end int,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create table if not exists public.weekly_review_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  viewed_at timestamptz not null default now(),
  primary key (user_id, week_start_date)
);

create or replace trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.pgwp_risk enable row level security;
alter table public.pgwp_risk_history enable row level security;
alter table public.weekly_review_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks_select_own'
  ) then
    create policy "tasks_select_own" on public.tasks
    for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks_insert_own'
  ) then
    create policy "tasks_insert_own" on public.tasks
    for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks_update_own'
  ) then
    create policy "tasks_update_own" on public.tasks
    for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks_delete_own'
  ) then
    create policy "tasks_delete_own" on public.tasks
    for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'pgwp_risk' and policyname = 'pgwp_risk_select_own'
  ) then
    create policy "pgwp_risk_select_own" on public.pgwp_risk
    for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'pgwp_risk' and policyname = 'pgwp_risk_insert_own'
  ) then
    create policy "pgwp_risk_insert_own" on public.pgwp_risk
    for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'pgwp_risk' and policyname = 'pgwp_risk_update_own'
  ) then
    create policy "pgwp_risk_update_own" on public.pgwp_risk
    for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'pgwp_risk_history' and policyname = 'pgwp_risk_history_select_own'
  ) then
    create policy "pgwp_risk_history_select_own" on public.pgwp_risk_history
    for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'pgwp_risk_history' and policyname = 'pgwp_risk_history_insert_own'
  ) then
    create policy "pgwp_risk_history_insert_own" on public.pgwp_risk_history
    for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'pgwp_risk_history' and policyname = 'pgwp_risk_history_update_own'
  ) then
    create policy "pgwp_risk_history_update_own" on public.pgwp_risk_history
    for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'pgwp_risk_history' and policyname = 'pgwp_risk_history_delete_own'
  ) then
    create policy "pgwp_risk_history_delete_own" on public.pgwp_risk_history
    for delete using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'weekly_review_log' and policyname = 'weekly_review_log_select_own'
  ) then
    create policy "weekly_review_log_select_own" on public.weekly_review_log
    for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'weekly_review_log' and policyname = 'weekly_review_log_insert_own'
  ) then
    create policy "weekly_review_log_insert_own" on public.weekly_review_log
    for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'weekly_review_log' and policyname = 'weekly_review_log_update_own'
  ) then
    create policy "weekly_review_log_update_own" on public.weekly_review_log
    for update using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'weekly_review_log' and policyname = 'weekly_review_log_delete_own'
  ) then
    create policy "weekly_review_log_delete_own" on public.weekly_review_log
    for delete using (auth.uid() = user_id);
  end if;
end $$;

-- PGWP Risk v0.2 updates
alter table public.tasks add column if not exists notes text;
alter table public.tasks add column if not exists sort_order int;
alter table public.profiles add column if not exists crs_score int;
alter table public.profiles add column if not exists crs_score_updated_at timestamptz;
alter table public.profiles add column if not exists plan text not null default 'free';
alter table public.profiles add column if not exists plan_updated_at timestamptz not null default now();
alter table public.pgwp_risk add column if not exists days_to_permit_expiry int;
alter table public.pgwp_risk add column if not exists days_to_program_end int;
alter table public.pgwp_risk add column if not exists days_since_program_end int;

update public.profiles
set plan = 'pro', plan_updated_at = now()
where pro = true and plan is distinct from 'pro';

alter table public.reminders add column if not exists run_at timestamptz;
alter table public.reminders add column if not exists reminder_type text;
alter table public.reminders add column if not exists related_date_type text;
alter table public.reminders add column if not exists target_date date;
alter table public.documents add column if not exists doc_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_doc_type_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_doc_type_check
      check (doc_type in ('passport', 'study_permit', 'program_proof', 'transcript_or_completion', 'address_proof', 'other'));
  end if;
end $$;

update public.documents
set doc_type = 'other'
where doc_type is null;

create unique index if not exists reminders_user_reminder_type_unique
  on public.reminders(user_id, reminder_type)
  where reminder_type is not null;

alter table public.pgwp_risk alter column version set default 'pgwp-v0.2';
update public.pgwp_risk set version = 'pgwp-v0.2' where version is distinct from 'pgwp-v0.2';
