# Supabase authentication setup — Znayu

This migration creates only adult learning-progress storage. It **does not** enroll minors or create a parent/child relationship.

## Step 1 — database security (required before cloud sync)
1. In Supabase project `znayu-production`, navigate to **SQL Editor → New query**.
2. Paste `supabase/migrations/20261011_znayu_adult_progress.sql` and click Run.
3. Inspect Table Editor for `public.learner_progress` and confirm RLS enabled.
4. Run Supabase Database Advisor / security checks. Do not disable RLS.

## Project browser configuration
Project URL: `https://hanyhyujcitwjlispwlq.supabase.co`.
The `sb_publishable_...` key is public and can be included in browser config, but privileged `sb_secret_`, `service_role`, and the database password must **never** be published.

Auth → URL Configuration: `https://radnass.github.io/Znayu/`.
Auth → Sign In / Providers: Email enabled, email confirmation enabled.
Google requires a separate Google Cloud OAuth client; do not switch Google on until that is configured.

## Data policy
The first milestone will sync adult progress only; local browser progress remains available as fallback and backup. Keep the child/student path offline until privacy, guardian consent and the children's data model are reviewed.

Users can create accounts only after the website's authentication UI is implemented. This migration alone does not change the existing website.
