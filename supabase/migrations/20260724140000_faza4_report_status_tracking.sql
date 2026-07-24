-- Faza 4 follow-up: track report lifecycle for async after() generation + UI polling.
-- Existing table stays service_role-only (SECURITY.md §3) — no new grants.

create type report_status as enum ('pending', 'ready', 'failed');

alter table generated_reports
  add column status report_status not null default 'pending',
  add column error_message text,
  alter column file_url drop not null;

-- Pre-existing rows were only ever written on success.
update generated_reports set status = 'ready' where file_url is not null;
