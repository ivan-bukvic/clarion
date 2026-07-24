-- Faza 4: generated_reports schema
-- RLS enabled with no policies and no grants to anon/authenticated —
-- table is accessible only via service_role (SECURITY.md §3).

create table generated_reports (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null unique references comparisons(id) on delete cascade,
  -- Storage object path in the private documents bucket (e.g. reports/{id}.docx),
  -- not a public URL — column name matches BACKEND_MASTER.md §3.
  file_url text not null,
  created_at timestamptz not null default now()
);

alter table generated_reports enable row level security;

-- Locked to service_role only (SECURITY.md §3). No policies for anon/authenticated.
revoke all on table generated_reports from anon, authenticated;
grant select, insert, update, delete on table generated_reports to service_role;
