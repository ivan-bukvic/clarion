-- Faza 2: chat_sessions + chat_messages + match_document_chunks RPC
-- RLS enabled with no policies and no grants to anon/authenticated —
-- tables are accessible only via service_role (SECURITY.md §3).

create type message_role as enum ('user', 'assistant');

create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_session_id uuid not null references chat_sessions(id) on delete cascade,
  role message_role not null,
  content text not null,
  cited_chunk_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

-- Locked to service_role only (SECURITY.md §3). No policies for anon/authenticated.
revoke all on table chat_sessions from anon, authenticated;
revoke all on table chat_messages from anon, authenticated;
grant select, insert, update, delete on table chat_sessions to service_role;
grant select, insert, update, delete on table chat_messages to service_role;

-- Cosine similarity search over corpus-ready chunks (BACKEND_MASTER.md §6).
-- Uses the same <=> / vector_cosine_ops path as the HNSW index from Faza 1.
create or replace function match_document_chunks(
  query_embedding extensions.vector(512),
  match_count int,
  min_similarity float
)
returns table (
  id uuid,
  document_id uuid,
  heading text,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.heading,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where d.purpose = 'corpus'
    and d.status = 'ready'
    and dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding) >= min_similarity
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

revoke all on function match_document_chunks(extensions.vector(512), int, float)
  from public, anon, authenticated;
grant execute on function match_document_chunks(extensions.vector(512), int, float)
  to service_role;
