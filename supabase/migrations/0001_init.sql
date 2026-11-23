-- QEnglishIT initial schema
create extension if not exists pgcrypto;

-- ===== Users =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  target_score int default 650,
  xp int not null default 0,
  streak int not null default 0,
  longest_streak int not null default 0,
  last_study_date date,
  referral_code text unique default substr(md5(random()::text), 1, 8),
  referred_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  role public.app_role not null,
  primary key (user_id, role)
);

create or replace function public.has_role(_role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = _role);
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
          new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Tests =====
create table public.tests (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  collection text not null default 'QEnglishIT 2026',
  description text,
  duration_minutes int not null default 120,
  total_questions int not null default 200,
  attempts_count int not null default 0,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.question_groups (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references public.tests(id) on delete cascade,
  part smallint not null check (part between 1 and 7),
  group_order int not null,
  passage text,             -- reading passage (markdown) or conversation title
  passage_vi text,
  transcript text,          -- listening script, lines "M: ...", "W: ..."
  transcript_vi text,
  image_url text,
  image_description text,   -- fallback alt / scene description for Part 1
  audio_url text
);
create index on public.question_groups(test_id, part, group_order);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid references public.tests(id) on delete cascade,
  group_id uuid references public.question_groups(id) on delete cascade,
  part smallint not null check (part between 1 and 7),
  number int not null,
  question_text text,
  options jsonb not null default '[]',   -- [{"key":"A","text":"..."}]
  correct_answer text not null,
  explanation text,
  translation text,
  tags text[] default '{}',
  unique (test_id, number)
);
create index on public.questions(part);

create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  mode text not null check (mode in ('exam', 'practice')),
  parts smallint[] not null default '{1,2,3,4,5,6,7}',
  answers jsonb not null default '{}',     -- {"questionId": "A"}
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  correct_listening int default 0,
  correct_reading int default 0,
  score_listening int,
  score_reading int,
  total_score int,
  time_spent_seconds int default 0,
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index on public.test_attempts(user_id, test_id);

-- ===== Grammar =====
create table public.grammar_topics (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  title_vi text,
  level text not null default '450',        -- 450 | 600 | 700 | 800
  category text not null default 'Khác',    -- Thì | Từ loại | Cấu trúc câu | ...
  difficulty text default 'Beginner',
  sort_order int not null default 0,
  summary text,
  lecture_md text,
  examples jsonb default '[]',              -- [{"en":"","vi":"","note":""}]
  tips_md text,
  is_published boolean not null default true
);

create table public.grammar_questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.grammar_topics(id) on delete cascade,
  kind text not null default 'exercise' check (kind in ('exercise', 'quiz')),
  sort_order int not null default 0,
  question_text text not null,
  options jsonb not null default '[]',
  correct_answer text not null,
  explanation text
);

-- ===== Vocabulary =====
create table public.vocab_collections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  family text not null,          -- toeic | 1000-50-ngay | 3000 | ielts | vstep | giao-tiep
  title text not null,
  description text,
  level text,
  color text,
  sort_order int not null default 0
);

create table public.vocab_words (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  ipa text,
  pos text,
  meaning_vi text not null,
  definition_en text,
  example_en text,
  example_vi text,
  cefr text,
  image_url text,
  unique (word, pos)
);

create table public.vocab_lessons (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.vocab_collections(id) on delete cascade,
  slug text not null,
  title text not null,
  title_vi text,
  day_number int,
  sort_order int not null default 0,
  unique (collection_id, slug)
);

create table public.vocab_lesson_words (
  lesson_id uuid references public.vocab_lessons(id) on delete cascade,
  word_id uuid references public.vocab_words(id) on delete cascade,
  sort_order int not null default 0,
  primary key (lesson_id, word_id)
);

create table public.user_vocab_progress (
  user_id uuid references auth.users(id) on delete cascade,
  word_id uuid references public.vocab_words(id) on delete cascade,
  ease real not null default 2.5,
  interval_days int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  due_at timestamptz not null default now(),
  status text not null default 'learning',  -- new | learning | known
  updated_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

create table public.vocabulary_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);
create table public.vocabulary_set_items (
  set_id uuid references public.vocabulary_sets(id) on delete cascade,
  word_id uuid references public.vocab_words(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (set_id, word_id)
);
create table public.user_vocabulary_cart (
  user_id uuid references auth.users(id) on delete cascade,
  word_id uuid references public.vocab_words(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

-- ===== Reading / Listening / Speaking / Writing =====
create table public.reading_passages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  level text default '600',
  passage_type text,                      -- email | article | notice | ad | chat
  paragraphs jsonb not null default '[]', -- [{"en":"","vi":""}]
  questions jsonb not null default '[]',  -- [{"q":"","options":[...],"answer":"A","explanation":""}]
  vocabulary jsonb default '[]',
  sort_order int not null default 0
);

create table public.listening_lessons (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  kind text not null default 'bilingual',  -- bilingual | syllabus
  title text not null,
  level text,
  topic text,
  segments jsonb not null default '[]',    -- [{"speaker":"M","en":"","vi":""}]
  sort_order int not null default 0
);

create table public.listening_check_progress (
  user_id uuid references auth.users(id) on delete cascade,
  item_key text not null,                  -- "<groupId>:<lineIndex>" or "<lessonId>:<i>"
  correct boolean not null default false,
  attempts int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

create table public.speaking_tasks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  task_type text not null,   -- read_aloud | describe_picture | respond_questions | respond_info | express_opinion
  title text not null,
  prompt text not null,
  image_description text,
  prep_seconds int default 45,
  response_seconds int default 45,
  sample_answer text,
  tips_md text,
  sort_order int not null default 0
);

create table public.writing_tasks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  task_type text not null,   -- sentence_picture | respond_email | opinion_essay
  title text not null,
  prompt text not null,
  keywords text[],
  image_description text,
  time_minutes int default 10,
  sample_answer text,
  tips_md text,
  sort_order int not null default 0
);

create table public.practice_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('speaking', 'writing')),
  task_id uuid not null,
  content text,
  audio_path text,
  feedback jsonb,
  created_at timestamptz not null default now()
);

-- ===== Courses / Roadmap =====
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  target_score int,
  cover_url text,
  sort_order int not null default 0
);
create table public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  slug text not null,
  title text not null,
  lesson_type text not null default 'article',  -- video | article | quiz | link
  video_url text,
  content_md text,
  link_href text,
  duration_minutes int,
  sort_order int not null default 0,
  unique (course_id, slug)
);

-- ===== Blog / Documents =====
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text,
  content_md text not null,
  cover_url text,
  category text default 'Chiến lược',
  tags text[] default '{}',
  views int not null default 0,
  published_at timestamptz default now()
);
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  category text not null default 'TOEIC',
  file_type text default 'pdf',
  file_url text,
  content_md text,
  downloads int not null default 0,
  created_at timestamptz not null default now()
);

-- ===== Tracking / Community =====
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity text not null,     -- test | grammar | vocab | listening | reading | speaking | writing
  ref_id text,
  correct int default 0,
  total int default 0,
  xp int not null default 0,
  duration_seconds int default 0,
  created_at timestamptz not null default now()
);
create index on public.study_sessions(user_id, created_at);

create table public.user_progress (
  user_id uuid references auth.users(id) on delete cascade,
  item_type text not null,    -- grammar_topic | vocab_lesson | course_lesson | reading | listening
  item_id text not null,
  status text not null default 'in_progress',  -- in_progress | completed
  score int,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

create table public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null default 'report',  -- report | suggestion
  question_id uuid,
  page_url text,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feedback_id uuid references public.user_feedback(id) on delete cascade,
  from_admin boolean not null default false,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.student_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  score_before int,
  score_after int,
  rating smallint not null default 5 check (rating between 1 and 5),
  content text not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.referral_events (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  event text not null default 'visit',   -- visit | signup
  user_id uuid,
  created_at timestamptz not null default now()
);

-- ===== Functions =====
create or replace function public.record_study(_activity text, _ref text, _correct int, _total int, _xp int, _seconds int)
returns void language plpgsql security definer set search_path = public as $$
declare p public.profiles; today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; ns int;
begin
  if auth.uid() is null then return; end if;
  insert into study_sessions(user_id, activity, ref_id, correct, total, xp, duration_seconds)
  values (auth.uid(), _activity, _ref, _correct, _total, greatest(_xp,0), _seconds);
  select * into p from profiles where id = auth.uid();
  ns := case when p.last_study_date = today then p.streak
             when p.last_study_date = today - 1 then p.streak + 1 else 1 end;
  update profiles set xp = xp + greatest(least(_xp, 500), 0), streak = ns,
    longest_streak = greatest(p.longest_streak, ns), last_study_date = today
  where id = auth.uid();
end; $$;

create or replace function public.increment_test_attempts(_test uuid)
returns void language sql security definer set search_path = public as $$
  update tests set attempts_count = attempts_count + 1 where id = _test;
$$;

create or replace function public.increment_blog_views(_slug text)
returns void language sql security definer set search_path = public as $$
  update blog_posts set views = views + 1 where slug = _slug;
$$;

create or replace function public.increment_document_downloads(_id uuid)
returns void language sql security definer set search_path = public as $$
  update documents set downloads = downloads + 1 where id = _id;
$$;

create or replace function public.get_leaderboard()
returns table (id uuid, display_name text, avatar_url text, xp int, streak int)
language sql stable security definer set search_path = public as $$
  select id, display_name, avatar_url, xp, streak from profiles order by xp desc limit 50;
$$;

-- ===== RLS =====
do $$
declare t text;
begin
  foreach t in array array['tests','question_groups','questions','grammar_topics','grammar_questions',
    'vocab_collections','vocab_words','vocab_lessons','vocab_lesson_words','reading_passages',
    'listening_lessons','speaking_tasks','writing_tasks','courses','course_lessons','blog_posts','documents']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);
    execute format('create policy "admin insert" on public.%I for insert with check (public.has_role(''admin''))', t);
    execute format('create policy "admin update" on public.%I for update using (public.has_role(''admin''))', t);
    execute format('create policy "admin delete" on public.%I for delete using (public.has_role(''admin''))', t);
  end loop;

  foreach t in array array['test_attempts','user_vocab_progress','vocabulary_sets','user_vocabulary_cart',
    'listening_check_progress','practice_submissions','study_sessions','user_progress']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "owner or admin read" on public.%I for select using ((select auth.uid()) = user_id or public.has_role(''admin''))', t);
    execute format('create policy "owner insert" on public.%I for insert with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "owner update" on public.%I for update using ((select auth.uid()) = user_id)', t);
    execute format('create policy "owner delete" on public.%I for delete using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select using ((select auth.uid()) = id or public.has_role('admin'));
create policy "own profile update" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

alter table public.user_roles enable row level security;
create policy "roles read" on public.user_roles for select using ((select auth.uid()) = user_id or public.has_role('admin'));
create policy "admin roles insert" on public.user_roles for insert with check (public.has_role('admin'));
create policy "admin roles delete" on public.user_roles for delete using (public.has_role('admin'));

alter table public.vocabulary_set_items enable row level security;
create policy "set owner" on public.vocabulary_set_items for all
  using (exists (select 1 from public.vocabulary_sets s where s.id = set_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.vocabulary_sets s where s.id = set_id and s.user_id = (select auth.uid())));

alter table public.user_feedback enable row level security;
create policy "insert feedback" on public.user_feedback for insert with check (user_id is null or (select auth.uid()) = user_id);
create policy "read own feedback" on public.user_feedback for select using ((select auth.uid()) = user_id or public.has_role('admin'));
create policy "admin update feedback" on public.user_feedback for update using (public.has_role('admin'));

alter table public.feedback_messages enable row level security;
create policy "thread read" on public.feedback_messages for select using ((select auth.uid()) = user_id or public.has_role('admin'));
create policy "thread write" on public.feedback_messages for insert
  with check (((select auth.uid()) = user_id and not from_admin) or public.has_role('admin'));
create policy "mark read" on public.feedback_messages for update using ((select auth.uid()) = user_id or public.has_role('admin'));

alter table public.student_reviews enable row level security;
create policy "approved public" on public.student_reviews for select using (is_approved or (select auth.uid()) = user_id or public.has_role('admin'));
create policy "submit review" on public.student_reviews for insert with check ((select auth.uid()) = user_id and not is_approved);
create policy "admin moderate" on public.student_reviews for update using (public.has_role('admin'));

alter table public.referral_events enable row level security;
create policy "log referral" on public.referral_events for insert with check (event in ('visit','signup'));
create policy "admin referrals" on public.referral_events for select using (public.has_role('admin'));

-- ===== Storage =====
insert into storage.buckets (id, name, public) values ('documents', 'documents', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false) on conflict do nothing;
create policy "docs admin write" on storage.objects for insert with check (bucket_id = 'documents' and public.has_role('admin'));
create policy "rec owner read" on storage.objects for select using (bucket_id = 'recordings' and (select auth.uid())::text = (storage.foldername(name))[1]);
create policy "rec owner write" on storage.objects for insert with check (bucket_id = 'recordings' and (select auth.uid())::text = (storage.foldername(name))[1]);
