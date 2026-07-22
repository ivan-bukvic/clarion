-- Ensure service_role can CRUD documents tables after revoke from anon/authenticated.
-- Intentionally repeats GRANT already present in 20260722143022_faza1_documents_schema.sql.
-- Applied as a follow-up after the initial revoke left service_role without CRUD;
-- left as a separate applied migration (immutable history) rather than rewriting the prior one.
grant select, insert, update, delete on table documents to service_role;
grant select, insert, update, delete on table document_chunks to service_role;
