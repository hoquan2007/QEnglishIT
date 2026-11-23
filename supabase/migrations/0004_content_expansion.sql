-- Additive content expansion; see Plandataenglish.md sections 0-3.
-- Keep legacy columns and defaults so the existing TOEIC UI and seeds still work.
begin;

create table if not exists public.content_sources (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title text not null,
  url text,
  license text not null,
  attribution text,
  notes text
);

alter table public.tests
  add column if not exists exam_type text not null default 'toeic_full',
  add column if not exists level text,
  add column if not exists difficulty smallint check (difficulty between 1 and 5),
  add column if not exists cefr text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists sections jsonb not null default '[]';
create index if not exists tests_exam_type_idx on public.tests(exam_type, difficulty);

-- Part 0 and section numbers through 20 support exams beyond TOEIC.
alter table public.question_groups drop constraint if exists question_groups_part_check;
alter table public.question_groups add constraint question_groups_part_check check (part between 0 and 20);
alter table public.question_groups
  add column if not exists section text,
  add column if not exists instructions text,
  add column if not exists audio_duration_seconds int;

alter table public.questions drop constraint if exists questions_part_check;
alter table public.questions add constraint questions_part_check check (part between 0 and 20);
alter table public.questions
  add column if not exists question_type text not null default 'mcq',
  add column if not exists answer_data jsonb,
  add column if not exists difficulty smallint check (difficulty between 1 and 5),
  add column if not exists skill_tags text[] not null default '{}',
  add column if not exists fingerprint text;
-- correct_answer is already unrestricted TEXT NOT NULL in 0001: retain it for
-- legacy clients, T/F/NG, Y/N/NG, matching labels and free-text canonical answers.
-- Alternative accepted answers and structured answers belong in answer_data.
-- Supported question_type values: mcq, gap_fill, tfng, ynng, matching,
-- short_answer, sentence_insert, error_identification, reorder.
create unique index if not exists questions_fingerprint_uidx
  on public.questions(fingerprint) where fingerprint is not null;
-- test_id already leads the existing UNIQUE (test_id, number) index.
create index if not exists questions_group_id_idx on public.questions(group_id);

alter table public.vocab_words
  add column if not exists lemma text,
  add column if not exists ipa_us text,
  add column if not exists ipa_uk text,
  add column if not exists audio_us_url text,
  add column if not exists audio_uk_url text,
  add column if not exists syllables text,
  add column if not exists stress smallint,
  add column if not exists frequency_rank int,
  add column if not exists word_family jsonb default '[]',
  add column if not exists synonyms text[] default '{}',
  add column if not exists antonyms text[] default '{}',
  add column if not exists collocations jsonb default '[]',
  add column if not exists examples jsonb default '[]',
  add column if not exists topics text[] default '{}',
  add column if not exists lists text[] default '{}',
  add column if not exists register text,
  add column if not exists reviewed boolean not null default false;
update public.vocab_words set lemma = lower(word) where lemma is null;
update public.vocab_words set ipa_us = ipa where ipa_us is null and ipa is not null;
-- Preserve ipa and its existing values; new importers should also populate ipa
-- from ipa_us for legacy clients. Do not fabricate UK IPA from US IPA.
create index if not exists vocab_words_lemma_idx on public.vocab_words(lemma);
create index if not exists vocab_words_rank_idx on public.vocab_words(frequency_rank);
create index if not exists vocab_words_lists_idx on public.vocab_words using gin(lists);
create index if not exists vocab_words_topics_idx on public.vocab_words using gin(topics);

create table if not exists public.pronunciation_lessons (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  symbol text not null,
  kind text not null,
  title text not null,
  description_md text,
  example_words jsonb not null default '[]',
  minimal_pairs jsonb not null default '[]',
  practice_sentences jsonb default '[]',
  audio_url text,
  sort_order int not null default 0
);

create table if not exists public.phrases (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  phrase text not null,
  meaning_vi text not null,
  definition_en text,
  examples jsonb not null default '[]',
  level text,
  topics text[] default '{}',
  audio_url text,
  unique (kind, phrase)
);

create table if not exists public.irregular_verbs (
  base text primary key,
  past text not null,
  past_participle text not null,
  meaning_vi text not null,
  ipa jsonb,
  level text
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  kind text not null,
  owner_table text,
  owner_id text,
  duration_seconds real,
  bytes int,
  voice text,
  generator text,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

create table if not exists public.content_qa (
  id uuid primary key default gen_random_uuid(),
  item_table text not null,
  item_id text not null,
  check_name text not null,
  status text not null,
  detail text,
  created_at timestamptz not null default now()
);

-- Nullable provenance preserves existing rows. Do not relabel legacy material
-- as "original" without review. RESTRICT keeps attribution from being deleted
-- while referenced. Every added FK gets a leading-column index.
-- Link authored entities, not relationship rows or user activity/QA records.
do $$
declare t text;
begin
  foreach t in array array[
    'tests', 'question_groups', 'questions', 'vocab_words',
    'grammar_topics', 'grammar_questions', 'vocab_collections', 'vocab_lessons',
    'reading_passages', 'listening_lessons', 'speaking_tasks', 'writing_tasks',
    'courses', 'course_lessons', 'blog_posts', 'documents',
    'pronunciation_lessons', 'phrases', 'irregular_verbs', 'media_assets'
  ] loop
    execute format('alter table public.%I add column if not exists source_id uuid', t);
    if not exists (
      select 1 from pg_catalog.pg_constraint
      where conrelid = format('public.%I', t)::regclass
        and conname = t || '_source_id_fkey'
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (source_id) references public.content_sources(id) on delete restrict',
        t, t || '_source_id_fkey'
      );
    end if;
    execute format('create index if not exists %I on public.%I(source_id)', t || '_source_id_idx', t);
  end loop;
end $$;

-- Explicit privileges are necessary even when RLS policies exist. Reset only
-- these new tables, avoiding inherited broad default grants (e.g. TRUNCATE).
-- DROP/CREATE of named policies makes replays safe without duplicate policies.
do $$
declare t text;
begin
  foreach t in array array[
    'content_sources', 'pronunciation_lessons', 'phrases', 'irregular_verbs',
    'media_assets', 'content_qa'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);

    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('drop policy if exists "admin read" on public.%I', t);
    if t in ('media_assets', 'content_qa') then
      execute format('create policy "admin read" on public.%I for select to authenticated using ((select public.has_role(''admin'')))', t);
    else
      execute format('grant select on table public.%I to anon', t);
      execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    end if;

    execute format('drop policy if exists "admin insert" on public.%I', t);
    execute format('create policy "admin insert" on public.%I for insert to authenticated with check ((select public.has_role(''admin'')))', t);
    execute format('drop policy if exists "admin update" on public.%I', t);
    execute format('create policy "admin update" on public.%I for update to authenticated using ((select public.has_role(''admin''))) with check ((select public.has_role(''admin'')))', t);
    execute format('drop policy if exists "admin delete" on public.%I', t);
    execute format('create policy "admin delete" on public.%I for delete to authenticated using ((select public.has_role(''admin'')))', t);
  end loop;
end $$;

-- Replace the permissive legacy SELECT policies: drafts must not be reachable
-- through direct slugs, child-table requests or nested PostgREST selects.
-- Existing admin write policies remain intact. Existing published rows retain
-- their visibility. Unlinked/mismatched child records are hidden from learners.
drop policy if exists "public read" on public.tests;
create policy "public read" on public.tests for select to anon, authenticated
  using (is_published or (select public.has_role('admin')));

drop policy if exists "public read" on public.question_groups;
create policy "public read" on public.question_groups for select to anon, authenticated
  using (
    (select public.has_role('admin'))
    or exists (select 1 from public.tests t where t.id = question_groups.test_id and t.is_published)
  );

drop policy if exists "public read" on public.questions;
create policy "public read" on public.questions for select to anon, authenticated
  using (
    (select public.has_role('admin'))
    or (
      exists (select 1 from public.tests t where t.id = questions.test_id and t.is_published)
      and (
        group_id is null
        or exists (
          select 1 from public.question_groups g
          where g.id = questions.group_id and g.test_id = questions.test_id
        )
      )
    )
  );

-- Public delivery, admin-only uploads/overwrites/deletes. Asset metadata stays
-- admin-only even though the published media URLs themselves are public.
-- Leave an existing bucket's visibility unchanged on replay.
insert into storage.buckets (id, name, public)
values ('media', 'media', true) on conflict (id) do nothing;
drop policy if exists "media admin read" on storage.objects;
create policy "media admin read" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (select public.has_role('admin')));
drop policy if exists "media admin insert" on storage.objects;
create policy "media admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select public.has_role('admin')));
drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select public.has_role('admin')))
  with check (bucket_id = 'media' and (select public.has_role('admin')));
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select public.has_role('admin')));

-- Retain JSON return type, existing keys and the intentional SECURITY DEFINER
-- boundary: learners remains an aggregate without granting profile row access.
-- CREATE OR REPLACE preserves the existing function's ownership and grants.
-- Only TOEIC L/R exams contribute to part-based TOEIC question counts, so
-- IELTS section numbers are not accidentally counted as TOEIC parts.
create or replace function public.get_site_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'learners', (select count(*) from public.profiles),
    'listening_questions', (
      select count(*) from public.questions q
      join public.tests t on t.id = q.test_id
      where t.is_published
        and t.exam_type in ('toeic_full', 'toeic_mini', 'toeic_listening', 'toeic_part')
        and q.part between 1 and 4
    ),
    'grammar_questions', (select count(*) from public.grammar_questions) + (
      select count(*) from public.questions q
      join public.tests t on t.id = q.test_id
      where t.is_published
        and t.exam_type in ('toeic_full', 'toeic_mini', 'toeic_reading', 'toeic_part')
        and q.part in (5, 6)
    ),
    'tests', (select count(*) from public.tests where is_published),
    'words', (select count(distinct coalesce(lemma, lower(word))) from public.vocab_words),
    'grammar_topics', (select count(*) from public.grammar_topics),
    'phrases', (select count(*) from public.phrases),
    'pronunciation_lessons', (select count(*) from public.pronunciation_lessons)
  );
$$;

commit;
