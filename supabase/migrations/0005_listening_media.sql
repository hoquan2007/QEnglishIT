-- The planned uploader also targets standalone listening lessons, whose
-- legacy table only stored segments. Keep existing browser TTS compatible.
alter table public.listening_lessons
  add column if not exists audio_url text,
  add column if not exists audio_duration_seconds int
    check (audio_duration_seconds >= 0);
