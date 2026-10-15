-- Znayu v0.9 — private analytics. Run ONCE in Supabase SQL Editor.
-- No secret API keys, no public read access, no raw exercise answers.
-- All browser events require explicit ADULT consent (the JS app enforces consent).
-- Consent itself cannot be verified server-side; public writes can be spammed.
-- Dashboard numbers are indicative and may exclude visitors who opted out.
-- Session/visitor UUIDs are pseudonymous; treat them as personal data.
--
-- After running this script:
-- 1) Replace YOUR_LOGIN_EMAIL below with your existing Znayu adult-login email.
-- 2) Run the entire script again (idempotent); log out and back in.
-- 3) Open https://radnass.github.io/Znayu/#analytics

create table if not exists public.znayu_analytics_events (
 id uuid primary key default gen_random_uuid(),
 occurred_at timestamptz not null default now(),
 visitor_id uuid not null,
 session_id uuid not null,
 event_name text not null check(event_name in (
  'visit','heartbeat','auth_login','diagnostic_started','diagnostic_completed',
  'lesson_started','lesson_completed','challenge_started','challenge_completed'
 )),
 activity text not null default 'browse' check(activity in ('browse','lesson','diagnostic','challenge')),
 learner_mode text not null default 'adult' check(learner_mode='adult'),
 auth_user_id uuid null
);
create index if not exists znayu_analytics_events_time_idx on public.znayu_analytics_events(occurred_at desc);
create index if not exists znayu_analytics_events_visit_idx on public.znayu_analytics_events(event_name,occurred_at desc);
create index if not exists znayu_analytics_events_visitor_idx on public.znayu_analytics_events(visitor_id,occurred_at desc);

alter table public.znayu_analytics_events enable row level security;
revoke all on public.znayu_analytics_events from public,anon,authenticated;
grant insert on public.znayu_analytics_events to anon,authenticated;
drop policy if exists znayu_analytics_insert on public.znayu_analytics_events;
create policy znayu_analytics_insert on public.znayu_analytics_events
 for insert to anon,authenticated
 with check (
  learner_mode='adult'
  and occurred_at between now()-interval '2 minutes' and now()+interval '1 minute'
  and (auth_user_id is null or auth_user_id=auth.uid())
  and (event_name<>'auth_login' or (auth.uid() is not null and auth_user_id=auth.uid()))
 );

create table if not exists public.znayu_analytics_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.znayu_analytics_admins enable row level security;
revoke all on public.znayu_analytics_admins from public,anon,authenticated;

-- The only thing the client can learn is whether its OWN account is an admin.
create or replace function public.znayu_is_analytics_admin()
 returns boolean
 language sql stable security definer set search_path=''
 as $$
  select auth.uid() is not null and exists(
   select 1 from public.znayu_analytics_admins a where a.user_id=auth.uid()
  );
 $$;
revoke execute on function public.znayu_is_analytics_admin() from public,anon,authenticated;
grant execute on function public.znayu_is_analytics_admin() to authenticated;

-- Admin-only aggregate; no event rows, emails or visitor identifiers are exposed.
create or replace function public.znayu_analytics_dashboard(p_days integer default 7)
 returns jsonb
 language plpgsql stable security definer set search_path=''
 as $$
 declare
  day_end date:=timezone('Asia/Almaty',now())::date;
  day_start date;
  after_ts timestamptz;
  result jsonb;
  daily jsonb;
  total_accounts bigint;
  registered_recent bigint;
  online_count bigint;
  learning_count bigint;
 begin
  if auth.uid() is null or not exists(
   select 1 from public.znayu_analytics_admins a where a.user_id=auth.uid()
  ) then
   raise exception 'Analytics access denied' using errcode='42501';
  end if;
  if p_days is null or p_days not in (1,7,30) then
   raise exception 'Unsupported analytics period' using errcode='22023';
  end if;
  day_start:=day_end-(p_days-1);
  after_ts:=day_start::timestamp at time zone 'Asia/Almaty';
  select count(*) into total_accounts from auth.users;
  select count(*) into registered_recent from auth.users u where u.created_at>=after_ts;
  -- Online means a consenting adult sent a heartbeat in the last 150 seconds.
  with latest as (
   select distinct on (e.visitor_id) e.visitor_id,e.activity
   from public.znayu_analytics_events e
   where e.event_name='heartbeat' and e.occurred_at>=now()-interval '150 seconds'
   order by e.visitor_id,e.occurred_at desc
  )
  select count(*),count(*) filter(where latest.activity in ('lesson','diagnostic','challenge'))
   into online_count,learning_count from latest;

  select jsonb_build_object(
   'generated_at',now(),
   'period_days',p_days,
   'visits',count(*) filter(where event_name='visit'),
   'unique_visitors',count(distinct visitor_id) filter(where event_name='visit'),
   'authorized_users',count(distinct auth_user_id) filter(where auth_user_id is not null),
   'logins',count(*) filter(where event_name='auth_login'),
   'diagnostics_started',count(*) filter(where event_name='diagnostic_started'),
   'diagnostics_completed',count(*) filter(where event_name='diagnostic_completed'),
   'lessons_started',count(*) filter(where event_name='lesson_started'),
   'lessons_completed',count(*) filter(where event_name='lesson_completed'),
   'challenges_started',count(*) filter(where event_name='challenge_started'),
   'challenges_completed',count(*) filter(where event_name='challenge_completed'),
   'accounts_total',total_accounts,
   'accounts_registered',registered_recent,
   'online_now',online_count,
   'learning_now',learning_count
  ) into result
  from public.znayu_analytics_events
  where occurred_at>=after_ts;

  with days as (
   select gs::date as day from generate_series(day_start::timestamp,day_end::timestamp,interval '1 day') gs
  ), counts as (
   select days.day,
    count(e.id) filter(where e.event_name='visit') as visits,
    count(distinct e.visitor_id) filter(where e.event_name='visit') as visitors,
    count(e.id) filter(where e.event_name='diagnostic_started') as diagnostics,
    count(e.id) filter(where e.event_name='lesson_started') as lessons
   from days left join public.znayu_analytics_events e
    on e.occurred_at >= (days.day::timestamp at time zone 'Asia/Almaty')
    and e.occurred_at < ((days.day+1)::timestamp at time zone 'Asia/Almaty')
   group by days.day
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'date',counts.day,'visits',counts.visits,'visitors',counts.visitors,
    'diagnostics',counts.diagnostics,'lessons',counts.lessons
   ) order by counts.day),'[]'::jsonb) into daily
  from counts;
  return result||jsonb_build_object('daily',daily);
 end;
 $$;
revoke execute on function public.znayu_analytics_dashboard(integer) from public,anon,authenticated;
grant execute on function public.znayu_analytics_dashboard(integer) to authenticated;

-- Set the admin to the *existing* Google/email account used to sign in.
-- IMPORTANT: replace YOUR_LOGIN_EMAIL with your actual address when running.
-- If you leave the placeholder unchanged, the dashboard remains inaccessible.
insert into public.znayu_analytics_admins(user_id)
select id from auth.users
where lower(email)=lower('YOUR_LOGIN_EMAIL')
on conflict (user_id) do nothing;

-- Maintenance: aggregated reports use raw events only for 30 days.
-- Keep at most 90 days; schedule in Supabase Cron if desired.
-- delete from public.znayu_analytics_events where occurred_at<now()-interval '90 days';
