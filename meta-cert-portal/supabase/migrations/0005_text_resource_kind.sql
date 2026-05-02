-- Add 'text' to the resource_kind enum so DOCX/zip imports can store
-- extracted text directly without needing a Storage upload.
--
-- Must be in its own migration: PostgreSQL forbids referencing a freshly-added
-- enum value in the same transaction it was added in. The matching check
-- constraint update lives in 0006_text_resource_constraint.sql.

alter type resource_kind add value if not exists 'text';
