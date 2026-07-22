-- Faza 1: documents + document_chunks schema
-- RLS enabled with no policies and no grants to anon/authenticated —
-- tables are accessible only via service_role (SECURITY.md §3).

create type document_file_type as enum ('pdf', 'docx', 'txt');
create type document_purpose as enum ('corpus', 'comparison');
create type document_status as enum ('processing', 'ready', 'failed');

create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_file text not null,
  file_type document_file_type not null,
  purpose document_purpose not null,
  storage_path text not null,
  status document_status not null default 'processing',
  created_at timestamptz not null default now()
);

create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  heading text,
  content text not null,
  embedding extensions.vector(512),
  created_at timestamptz not null default now()
);

create index document_chunks_embedding_idx on document_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

alter table documents enable row level security;
alter table document_chunks enable row level security;

-- Locked to service_role only (SECURITY.md §3). No policies for anon/authenticated.
revoke all on table documents from anon, authenticated;
revoke all on table document_chunks from anon, authenticated;
grant select, insert, update, delete on table documents to service_role;
grant select, insert, update, delete on table document_chunks to service_role;
