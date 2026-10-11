-- Znayu v0.5 — adult learner cloud progress, restricted by Supabase Auth identity.
-- Run once in Supabase SQL Editor after reviewing. The app never uses a service_role key.
create table if not exists public.learner_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  adult_progress jsonb not null default '{}'::jsonb,
  adult_sessions jsonb not null default '[]'::jsonb,
  adult_active_lesson jsonb,
  updated_at timestamptz not null default now(),
  constraint adult_progress_object check (jsonb_typeof(adult_progress) = 'object'),
  constraint adult_sessions_array check (jsonb_typeof(adult_sessions) = 'array')
);

alter table public.learner_progress enable row level security;
alter table public.learner_progress force row level security;

revoke all on table public.learner_progress from public, anon;
grant select, insert, update, delete on table public.learner_progress to authenticated;

drop policy if exists "Learner can read own adult progress" on public.learner_progress;
create policy "Learner can read own adult progress"
on public.learner_progress for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Learner can create own adult progress" on public.learner_progress;
create policy "Learner can create own adult progress"
on public.learner_progress for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Learner can update own adult progress" on public.learner_progress;
create policy "Learner can update own adult progress"
on public.learner_progress for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Learner can delete own adult progress" on public.learner_progress;
create policy "Learner can delete own adult progress"
on public.learner_progress for delete to authenticated
using ((select auth.uid()) = user_id);

-- Check with Supabase database linter after running.
-- Do not create a policy that grants access to every user.
