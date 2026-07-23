-- Faza 3 review fix: comparisons.document_a_id/document_b_id had no ON
-- DELETE clause (defaulting to RESTRICT), inconsistent with every other
-- FK in the schema (comparison_findings.comparison_id, document_chunks.
-- document_id) which cascade. No document-deletion feature exists yet,
-- but this closes the gap before one is added instead of leaving it as
-- silent, undocumented debt.

alter table comparisons
  drop constraint comparisons_document_a_id_fkey,
  add constraint comparisons_document_a_id_fkey
    foreign key (document_a_id) references documents(id) on delete cascade;

alter table comparisons
  drop constraint comparisons_document_b_id_fkey,
  add constraint comparisons_document_b_id_fkey
    foreign key (document_b_id) references documents(id) on delete cascade;
