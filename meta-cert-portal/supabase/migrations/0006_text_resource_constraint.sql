-- Update the per-kind field constraint to allow the new 'text' kind.
-- A text resource only needs extracted_text (no storage path, no URL).

alter table resources drop constraint if exists resource_kind_fields;

alter table resources add constraint resource_kind_fields check (
  (kind = 'link'  and url is not null) or
  (kind = 'pdf'   and storage_bucket is not null and storage_path is not null) or
  (kind = 'video' and (video_playback_id is not null or video_url is not null)) or
  (kind = 'text'  and extracted_text is not null)
);
