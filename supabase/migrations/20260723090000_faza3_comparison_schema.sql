-- Faza 3: comparisons + comparison_findings schema
-- RLS enabled with no policies and no grants to anon/authenticated —
-- tables are accessible only via service_role (SECURITY.md §3).

create type comparison_status as enum ('processing', 'completed', 'failed');
create type finding_category as enum (
  'price_difference',
  'missing_item',
  'scope_difference',
  'term_difference',
  'other'
);

create table comparisons (
  id uuid primary key default gen_random_uuid(),
  document_a_id uuid not null references documents(id),
  document_b_id uuid not null references documents(id),
  status comparison_status not null default 'processing',
  summary text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table comparison_findings (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references comparisons(id) on delete cascade,
  category finding_category not null,
  description text not null,
  source_a_ref text,
  source_b_ref text
);

alter table comparisons enable row level security;
alter table comparison_findings enable row level security;

-- Locked to service_role only (SECURITY.md §3). No policies for anon/authenticated.
revoke all on table comparisons from anon, authenticated;
revoke all on table comparison_findings from anon, authenticated;
grant select, insert, update, delete on table comparisons to service_role;
grant select, insert, update, delete on table comparison_findings to service_role;
