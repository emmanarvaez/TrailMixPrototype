-- TrailMix migration 003: remember who has finished (or skipped) Cashew's tour
-- Run once in the Supabase SQL editor (Database → SQL Editor → New query).

alter table profiles add column if not exists has_onboarded boolean not null default false;

-- Accounts made before the tour existed are returning users, so mark them as done
update profiles set has_onboarded = true;
