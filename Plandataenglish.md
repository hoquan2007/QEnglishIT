# Plandataenglish — Kế hoạch xây dựng kho dữ liệu học tiếng Anh cho QEnglishIT

> Tài liệu này dành cho **Codex** (hoặc agent tương đương) thực thi.
> Mục tiêu: mở rộng database Supabase của QEnglishIT lên **≥ 300 đề thi** đa dạng thể loại, độ khó,
> **≥ 10.000 từ vựng** có phiên âm US/UK, file phát âm, ví dụ song ngữ, và các kho học liệu phụ trợ.
> Đọc hết phần 0–3 trước khi viết bất kỳ dòng code hay nội dung nào.

---

## 0. Bối cảnh dự án (bắt buộc đọc)

| Mục | Giá trị |
|---|---|
| Repo | `hoquan2007/QEnglishIT`, nhánh `main` |
| Framework | Next.js 16 (App Router) + TypeScript + Tailwind v4 |
| Database | Supabase project `xsfapzzjzndehmqnrmef` (Postgres + Storage + Auth) |
| Schema hiện tại | `supabase/migrations/0001_init.sql` → `0003_site_stats.sql` |
| Định dạng nội dung | `content/SCHEMA.md` (JSON) |
| Nạp dữ liệu | `scripts/seed.mjs` — chạy `npm run seed -- <section>` (đọc `.env.local`, dùng `SUPABASE_SECRET_KEY`) |
| Deploy | Vercel project `qenglishit` |

### Dữ liệu đang có (23/11/2026)

| Bảng | Số lượng |
|---|---|
| `tests` / `questions` | 2 đề TOEIC / 400 câu |
| `grammar_topics` / `grammar_questions` | 41 / 574 |
| `vocab_words` | ~1.930 mục (9 bộ, 93 bài) |
| `reading_passages` | 24 |
| `listening_lessons` | 28 |
| `speaking_tasks` / `writing_tasks` | 20 / 16 |
| `blog_posts` / `documents` / `courses` | 12 / 10 / 4 |

### Nguyên tắc không được vi phạm

1. **Nội dung phải là bản gốc.** Không sao chép câu hỏi, đoạn văn, audio, giải thích từ ETS, Cambridge, IDP, British Council, anhngu24h, sách luyện thi hay website khác. Chỉ dùng nguồn có giấy phép mở ở mục 4 và **phải ghi nguồn** vào bảng `content_sources`.
2. **Không commit bí mật.** `SUPABASE_SECRET_KEY` chỉ nằm trong `.env.local`. Không in khoá ra log.
3. **Idempotent.** Mọi script seed phải chạy lại nhiều lần không tạo bản ghi trùng (upsert theo `slug` / khoá tự nhiên).
4. **Tương thích ngược.** Không đổi tên/xoá cột đang được UI dùng. Chỉ thêm cột (có default) và thêm bảng.
5. **Tiếng Việt có dấu đầy đủ**, UTF-8, không dùng ký tự lạ.
6. **Mỗi lô nội dung phải qua validator** (mục 7) trước khi seed.

---

## 1. Mục tiêu định lượng (Definition of Done)

| Hạng mục | Mục tiêu tối thiểu | Ghi chú |
|---|---|---|
| Đề thi (tổng) | **≥ 300 đề** | Phân bổ ở mục 5.1 |
| Câu hỏi đề thi | ≥ 25.000 | Không trùng nội dung (fingerprint) |
| Từ vựng (headword khác nhau) | **≥ 10.000** | Đếm theo `lemma` duy nhất, không đếm biến thể |
| Từ có IPA US **và** UK | 100% | |
| Từ có audio US (+UK) | 100% US, ≥ 90% UK | File mp3/ogg trong Storage |
| Từ có ≥ 2 ví dụ song ngữ | 100% | Ví dụ phải chứa từ đó (hoặc biến thể) |
| Cụm từ: phrasal verbs / idioms / collocations | 800 / 500 / 1.500 | |
| Chủ điểm ngữ pháp | ≥ 120 | Mỗi chủ điểm ≥ 10 bài tập + 10 quiz |
| Bài đọc song ngữ | ≥ 500 | Phân bổ A2 → C1 |
| Bài nghe (song ngữ + giáo trình) | ≥ 400 | Có audio |
| Bài phát âm (âm IPA + cặp tối thiểu) | 44 âm + 300 cặp | |
| Speaking / Writing tasks | ≥ 200 / ≥ 150 | |
| Blog / Tài liệu / Khoá học | ≥ 100 / ≥ 60 / ≥ 12 | |

---

## 2. Thay đổi schema (migration `0004_content_expansion.sql`)

Tạo file `supabase/migrations/0004_content_expansion.sql`, áp dụng bằng Supabase MCP `apply_migration` hoặc `supabase db push`.
Sau khi áp dụng chạy `get_advisors` (security + performance) và xử lý cảnh báo mới.

```sql
-- ===== 2.1 Tests: phân loại đề =====
alter table public.tests
  add column if not exists exam_type text not null default 'toeic_full',
  -- toeic_full | toeic_mini | toeic_listening | toeic_reading | toeic_part | toeic_sw
  -- ielts_academic_reading | ielts_listening | vstep | thpt | cefr_placement | grammar_test | vocab_test
  add column if not exists level text,              -- '450' | '600' | '750' | '900' | 'A2'..'C1' | 'B1'..
  add column if not exists difficulty smallint check (difficulty between 1 and 5),
  add column if not exists cefr text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists sections jsonb not null default '[]', -- [{"key":"part5","title":"Part 5","count":30,"minutes":10}]
  add column if not exists source_id uuid;
create index if not exists tests_exam_type_idx on public.tests(exam_type, difficulty);

-- ===== 2.2 Question groups / questions: hỗ trợ đề không phải TOEIC =====
alter table public.question_groups drop constraint if exists question_groups_part_check;
alter table public.question_groups add constraint question_groups_part_check check (part between 0 and 20);
alter table public.question_groups
  add column if not exists section text,            -- 'listening' | 'reading' | 'writing' | 'speaking' | 'use_of_english'
  add column if not exists instructions text,
  add column if not exists audio_duration_seconds int;

alter table public.questions drop constraint if exists questions_part_check;
alter table public.questions add constraint questions_part_check check (part between 0 and 20);
alter table public.questions
  add column if not exists question_type text not null default 'mcq',
  -- mcq | gap_fill | tfng | ynng | matching | short_answer | sentence_insert | error_identification | reorder
  add column if not exists answer_data jsonb,       -- {"accepted":["in charge of"],"case_sensitive":false} cho gap_fill...
  add column if not exists difficulty smallint check (difficulty between 1 and 5),
  add column if not exists skill_tags text[] not null default '{}', -- 'inference','detail','vocab-in-context','word-form'...
  add column if not exists fingerprint text;        -- sha1(normalized question_text + options) để chống trùng
create unique index if not exists questions_fingerprint_uidx on public.questions(fingerprint) where fingerprint is not null;

-- ===== 2.3 Vocabulary: phát âm, tần suất, danh sách =====
alter table public.vocab_words
  add column if not exists lemma text,
  add column if not exists ipa_us text,
  add column if not exists ipa_uk text,
  add column if not exists audio_us_url text,
  add column if not exists audio_uk_url text,
  add column if not exists syllables text,          -- 'ac·com·mo·date'
  add column if not exists stress smallint,         -- âm tiết nhận trọng âm (1-based)
  add column if not exists frequency_rank int,
  add column if not exists word_family jsonb default '[]',   -- [{"word":"accommodation","pos":"n"}]
  add column if not exists synonyms text[] default '{}',
  add column if not exists antonyms text[] default '{}',
  add column if not exists collocations jsonb default '[]',  -- [{"en":"make a decision","vi":"đưa ra quyết định"}]
  add column if not exists examples jsonb default '[]',      -- [{"en":"...","vi":"...","source":"original"}] (≥2)
  add column if not exists topics text[] default '{}',
  add column if not exists lists text[] default '{}',        -- 'ngsl','nawl','tsl','bsl','cefrj-a1',...
  add column if not exists register text,                    -- formal | informal | business | academic
  add column if not exists source_id uuid,
  add column if not exists reviewed boolean not null default false;
update public.vocab_words set lemma = lower(word) where lemma is null;
update public.vocab_words set ipa_us = ipa where ipa_us is null and ipa is not null;
create index if not exists vocab_words_lemma_idx on public.vocab_words(lemma);
create index if not exists vocab_words_rank_idx on public.vocab_words(frequency_rank);
create index if not exists vocab_words_lists_idx on public.vocab_words using gin(lists);
create index if not exists vocab_words_topics_idx on public.vocab_words using gin(topics);
-- giữ cột `ipa` cũ (UI đang đọc) = ipa_us

-- ===== 2.4 Bảng mới =====
create table if not exists public.content_sources (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,              -- 'ngsl-1.2', 'cmudict-0.7b', 'tatoeba-2026-11', 'voa-learning-english', 'original'
  title text not null,
  url text,
  license text not null,                 -- 'CC BY-SA 4.0', 'BSD-2-Clause', 'Public Domain', 'Original (QEnglishIT)'
  attribution text,                      -- câu ghi nguồn hiển thị trên trang /nguon-tai-lieu
  notes text
);

create table if not exists public.pronunciation_lessons (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  symbol text not null,                  -- 'iː', 'ɪ', 'θ' ...
  kind text not null,                    -- vowel | diphthong | consonant | stress | intonation | linking
  title text not null,
  description_md text,                   -- cách đặt lưỡi, môi (tiếng Việt)
  example_words jsonb not null default '[]', -- [{"word":"see","ipa":"/siː/"}]
  minimal_pairs jsonb not null default '[]', -- [{"a":"ship","b":"sheep","ipa_a":"/ʃɪp/","ipa_b":"/ʃiːp/"}]
  practice_sentences jsonb default '[]',
  audio_url text,
  sort_order int not null default 0
);

create table if not exists public.phrases (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                    -- phrasal_verb | idiom | collocation | expression | proverb
  phrase text not null,
  meaning_vi text not null,
  definition_en text,
  examples jsonb not null default '[]',
  level text,
  topics text[] default '{}',
  audio_url text,
  source_id uuid references public.content_sources(id),
  unique (kind, phrase)
);

create table if not exists public.irregular_verbs (
  base text primary key, past text not null, past_participle text not null,
  meaning_vi text not null, ipa jsonb, level text
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null, path text not null,
  kind text not null,                    -- audio | image
  owner_table text, owner_id text,
  duration_seconds real, bytes int, voice text, generator text,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

create table if not exists public.content_qa (
  id uuid primary key default gen_random_uuid(),
  item_table text not null, item_id text not null,
  check_name text not null, status text not null,   -- pass | fail | warn
  detail text, created_at timestamptz not null default now()
);

-- RLS: nội dung đọc công khai, admin ghi; content_qa & media_assets chỉ admin
alter table public.content_sources enable row level security;
alter table public.pronunciation_lessons enable row level security;
alter table public.phrases enable row level security;
alter table public.irregular_verbs enable row level security;
alter table public.media_assets enable row level security;
alter table public.content_qa enable row level security;
create policy "public read" on public.content_sources for select using (true);
create policy "public read" on public.pronunciation_lessons for select using (true);
create policy "public read" on public.phrases for select using (true);
create policy "public read" on public.irregular_verbs for select using (true);
create policy "admin read" on public.media_assets for select using (public.has_role('admin'));
create policy "admin read" on public.content_qa for select using (public.has_role('admin'));
-- (seed dùng secret key nên bỏ qua RLS khi ghi)

-- Storage bucket công khai cho audio & ảnh học liệu
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;
```

> Sau migration: cập nhật `get_site_stats()` để đếm thêm `phrases`, `pronunciation_lessons`, đếm từ theo `count(distinct lemma)`.

---

## 3. Cấu trúc thư mục & quy ước file

```
content/
  _manifest.json                 # trạng thái từng lô: {"tests/toeic_full/qe-full-001": "seeded", ...}
  sources/sources.json           # danh sách content_sources
  tests/
    toeic_full/qe-full-001-listening.json, qe-full-001-reading.json ...
    toeic_mini/qe-mini-001.json
    toeic_listening/... toeic_reading/... toeic_part/qe-p5-001.json ...
    ielts/qe-ielts-ar-001.json ... vstep/... thpt/... placement/... grammar_test/... vocab_test/...
  vocab/
    raw/                         # dữ liệu nguồn đã tải (KHÔNG commit nếu license cấm phân phối lại; xem mục 4)
    words/words-00001-00500.json # lô 500 từ / file
    collections/*.json           # bộ từ theo chủ đề / lộ trình (tham chiếu lemma)
  phrases/phrasal-verbs-001.json, idioms-001.json, collocations-001.json
  pronunciation/lessons.json
  grammar/batch-c.json ...
  reading/passages-002.json ...
  listening/lessons-002.json ...
  speaking/tasks-002.json  writing/tasks-002.json
  blog/posts-002.json  documents/docs-002.json  courses/courses-002.json
scripts/
  seed.mjs                       # mở rộng (mục 8)
  validate/validate-content.mjs  # validator chung (mục 7)
  vocab/build-wordlist.mjs       # gộp & xếp hạng headword
  vocab/enrich-ipa.mjs           # IPA US/UK từ CMUdict / ipa-dict
  audio/tts-words.mjs            # sinh audio từ vựng
  audio/tts-listening.mjs        # sinh audio bài nghe nhiều giọng
  audio/upload-media.mjs         # upload Storage + ghi media_assets
  qa/report.mjs                  # thống kê độ phủ, trùng lặp, phân bố đáp án
```

Quy ước:
- **Slug**: kebab-case ASCII, có tiền tố loại: `qe-full-001`, `qe-mini-014`, `qe-p5-023`, `qe-ielts-ar-007`, `qe-vstep-b2-003`, `qe-thpt-2027-012`.
- **Mỗi file ≤ 2 MB**, tối đa 500 từ vựng hoặc 1 đề.
- **ID câu hỏi** trong một đề: `number` liên tục bắt đầu từ 1 (TOEIC giữ đúng 1–200).
- Mọi item có trường `"source": "<content_sources.key>"`; nội dung tự viết dùng `"original"`.

---

## 4. Nguồn dữ liệu được phép dùng

> Codex **phải kiểm tra lại license tại thời điểm tải** và ghi vào `content/sources/sources.json`.
> Nếu license yêu cầu ghi nguồn → hiển thị ở trang `/nguon-tai-lieu` (UI làm sau).
> Nếu license là ShareAlike (CC BY-SA) → phần dữ liệu dẫn xuất từ nguồn đó phải giữ cùng license; ghi rõ trong `content_sources.notes`.

| Mục đích | Nguồn | License (kiểm tra lại) | Cách dùng |
|---|---|---|---|
| Danh sách từ phổ biến | **NGSL 1.2** (New General Service List, ~2.800 từ) | CC BY-SA 4.0 | Lõi A1–B2 |
| Từ học thuật | **NAWL** (~960 từ) | CC BY-SA 4.0 | IELTS/VSTEP |
| Từ TOEIC | **TSL** (TOEIC Service List, ~1.200 từ) | CC BY-SA 4.0 | Bộ TOEIC |
| Từ kinh doanh | **BSL** (Business Service List, ~1.700 từ) | CC BY-SA 4.0 | Bộ TOEIC/Business |
| Mức CEFR | **CEFR-J Wordlist** | Miễn phí, yêu cầu trích dẫn — đọc điều khoản | Gán cấp A1–B2 |
| Tần suất | **wordfreq** (Python) | Code Apache-2.0, dữ liệu CC BY-SA 4.0 | `frequency_rank`, bổ sung tới 10.000+ |
| IPA US | **CMUdict** | BSD-2-Clause | ARPAbet → IPA |
| IPA US/UK | **ipa-dict** (open-dict-data) | MIT | `ipa_us`, `ipa_uk` |
| Định nghĩa, biến thể, từ loại | **Wiktionary** qua bản trích xuất kaikki.org | CC BY-SA 4.0 | Tham khảo `pos`, word family; **viết lại** định nghĩa |
| Câu ví dụ có sẵn | **Tatoeba** | CC BY 2.0 FR (một số CC0) | Tối đa 1 ví dụ/từ, giữ id câu + ghi nguồn |
| Bài nghe/đọc thật | **VOA Learning English** | Phần lớn Public Domain (ngoại trừ nội dung bên thứ ba — kiểm tra từng bài) | Bài đọc/nghe chậm, ghi nguồn |
| Sách/audio cổ điển | **Project Gutenberg**, **LibriVox** | Public Domain (tại Mỹ) | Bài đọc nâng cao C1, audio tham khảo |
| Ảnh minh hoạ | **Openverse** lọc CC0 / Public Domain; hoặc ảnh tự sinh bằng mô hình tạo ảnh | CC0 / sở hữu | Part 1, Speaking |
| Giọng đọc TTS | **Kokoro-82M** (Apache-2.0) hoặc **Piper** (MIT; kiểm tra license từng voice) hoặc dịch vụ cloud TTS trả phí | Theo nhà cung cấp | Audio từ vựng & bài nghe |

**Không dùng / không scrape:** Oxford 3000/5000 (định nghĩa, ví dụ), Cambridge Dictionary, English Vocabulary Profile, Longman, Collins, ETS sample tests, Cambridge IELTS books, đề THPT có bản quyền bài đọc, anhngu24h, YouTube audio. Chỉ được **dẫn link** tới các trang này trong mục "Tài nguyên tham khảo" (mục 6.8).

---

## 5. Kế hoạch đề thi (≥ 300 đề)

### 5.1 Phân bổ

| `exam_type` | Số đề | Số câu/đề | Thời gian | Độ khó (1–5) | UI hiện có? |
|---|---|---|---|---|---|
| `toeic_full` | **60** | 200 | 120' | 20 đề mức 2, 25 đề mức 3, 15 đề mức 4–5 | ✅ |
| `toeic_mini` (Part 1–7 thu gọn) | **30** | 100 (L50+R50) | 60' | 10 mỗi mức 1/2/3 | ✅ (cần `sections`) |
| `toeic_listening` | **15** | 100 | 45' | 2–4 | ✅ |
| `toeic_reading` | **15** | 100 | 75' | 2–4 | ✅ |
| `toeic_part` | **70** (10/Part) | P1:12, P2:30, P3:39, P4:30, P5:40, P6:16, P7:30 | tự chọn | tăng dần trong mỗi Part | ✅ |
| `toeic_sw` (Speaking 11 + Writing 8) | **10** | 19 task | 80' + 60' | 2–4 | 🟡 dùng speaking/writing tasks |
| `thpt` (THPT Quốc gia, 50 câu) | **25** | 50 | 60' | 2–4 | 🟡 cần UI mcq chung |
| `vstep` (B1–C1: Listening 35 + Reading 40) | **15** | 75 | 100' | 3–5 | 🟡 |
| `ielts_academic_reading` (3 passages) | **15** | 40 | 60' | 3–5 | 🟡 cần gap_fill/tfng/matching |
| `ielts_listening` (4 sections) | **15** | 40 | 30' | 3–5 | 🟡 |
| `cefr_placement` (kiểm tra đầu vào) | **5** | 60 | 40' | 1–5 (tăng dần) | 🟡 |
| `grammar_test` (theo cấp 450/600/700/800) | **20** | 40 | 30' | 1–5 | 🟡 |
| `vocab_test` (theo bộ từ / CEFR) | **20** | 50 | 20' | 1–5 | 🟡 |
| **Tổng (đề mới)** | **315** | ~25.835 câu | | | |

> Tổng từng dòng là 315 đề mới, tương ứng khoảng 25.835 câu theo số câu/đề đã nêu và giả định 10 đề cho mỗi Part TOEIC. Cộng 2 đề TOEIC full đã có trước kế hoạch thành 317 đề. Mục tiêu tối thiểu 25.000 câu hỏi phải được kiểm tra riêng trên database để tránh đếm trùng hoặc đếm dự thảo chưa nạp.

> Ưu tiên thực hiện theo thứ tự: TOEIC (✅ dùng ngay) → THPT/grammar/vocab test (MCQ) → VSTEP → IELTS (cần thêm loại câu hỏi).
> Đề 🟡 vẫn seed được vào DB ngay; UI hiển thị sẽ làm ở sprint riêng (ghi trong mục 10).

### 5.2 Ma trận đa dạng (áp dụng cho mỗi đề TOEIC full)

- **Chủ đề** (luân phiên, không lặp chủ đề chính quá 2 lần trong 1 đề): văn phòng, nhân sự, tài chính – kế toán, marketing, sản xuất, kho vận, du lịch – khách sạn, nhà hàng, y tế hành chính, bất động sản, công nghệ, giáo dục – đào tạo, sự kiện – hội nghị, bán lẻ, giao thông, môi trường doanh nghiệp, pháp lý – hợp đồng.
- **Giọng đọc Listening:** Mỹ 35%, Anh 25%, Úc 20%, Canada 20%; hội thoại 3 người ở 2–3 nhóm Part 3.
- **Part 5 (30 câu):** từ loại 8, thì/động từ 5, giới từ 4, liên từ/trạng từ liên kết 4, đại từ 2, mệnh đề quan hệ 2, từ vựng 5.
- **Part 6:** 4 văn bản (email, thông báo, bài báo, thư/quảng cáo), mỗi văn bản 1 câu chèn câu.
- **Part 7:** 10 đơn (gồm ≥ 1 chat/text message, ≥ 1 form/biểu mẫu), 2 kép, 3 ba; câu hỏi gồm detail, inference, vocabulary-in-context, NOT true, sentence-insertion, purpose.
- **Phân bố đáp án:** mỗi chữ A/B/C/D chiếm 22–28% (Part 2 chỉ A–C); không có quá 3 đáp án giống nhau liên tiếp.
- **Độ khó** gán theo câu (`questions.difficulty`); `tests.difficulty` = trung bình làm tròn.

| Mức đề | Điểm mục tiêu | Từ vựng chủ yếu | Câu dài TB (Reading) | Bẫy |
|---|---|---|---|---|
| 1 | 300–450 | NGSL top 1.500 | ≤ 14 từ | ít |
| 2 | 450–600 | NGSL + TSL cơ bản | 14–18 | paraphrase đơn giản |
| 3 | 600–750 | TSL + BSL | 18–22 | paraphrase, distractor cùng chủ đề |
| 4 | 750–850 | BSL + NAWL | 22–26 | suy luận, thông tin rải 2 đoạn |
| 5 | 850–990 | NAWL + collocation hiếm | 24–30 | suy luận nhiều bước, chi tiết số liệu |

### 5.3 Định dạng JSON (mở rộng `content/SCHEMA.md`)

Đề TOEIC giữ đúng định dạng hiện tại, **thêm** trường cấp đề và cấp câu:

```json
{
  "slug": "qe-full-003",
  "title": "Full Test 03",
  "collection": "QEnglishIT 2027",
  "exam_type": "toeic_full",
  "level": "750",
  "difficulty": 3,
  "cefr": "B2",
  "tags": ["logistics", "hospitality"],
  "duration_minutes": 120,
  "source": "original",
  "groups": [
    {
      "part": 5, "section": "reading", "instructions": null,
      "passage": null, "passage_vi": null, "transcript": null, "transcript_vi": null,
      "image_description": null, "image_prompt": null,
      "questions": [
        {
          "number": 101,
          "question_type": "mcq",
          "question_text": "The new software will ------- reduce processing time.",
          "options": [{"key":"A","text":"significant"},{"key":"B","text":"significantly"},{"key":"C","text":"significance"},{"key":"D","text":"signify"}],
          "correct_answer": "B",
          "explanation": "Cần trạng từ bổ nghĩa cho động từ “reduce” → significantly.",
          "translation": "Phần mềm mới sẽ giảm đáng kể thời gian xử lý. (A) đáng kể (adj) (B) một cách đáng kể (C) sự quan trọng (D) biểu thị",
          "difficulty": 2,
          "tags": ["word-form"],
          "skill_tags": ["adverb"]
        }
      ]
    }
  ]
}
```

Đề không phải TOEIC dùng `part` = số thứ tự section (1, 2, 3…), `section` = kỹ năng, và `question_type` phù hợp:

```json
{ "number": 14, "question_type": "tfng",
  "question_text": "The museum was originally built as a railway station.",
  "options": [{"key":"T","text":"TRUE"},{"key":"F","text":"FALSE"},{"key":"NG","text":"NOT GIVEN"}],
  "correct_answer": "T", "explanation": "...", "difficulty": 3 }

{ "number": 22, "question_type": "gap_fill",
  "question_text": "Visitors must register at the ------- desk.",
  "options": [], "correct_answer": "reception",
  "answer_data": {"accepted": ["reception"], "max_words": 1, "case_sensitive": false},
  "explanation": "...", "difficulty": 3 }
```

`sections` của đề (để UI hiển thị cấu trúc):

```json
"sections": [
  {"key":"listening","title":"Listening","parts":[1,2,3,4],"count":50,"minutes":25},
  {"key":"reading","title":"Reading","parts":[5,6,7],"count":50,"minutes":35}
]
```

### 5.4 Quy trình sinh một đề (pipeline cho Codex)

1. **Lập spec đề** (`content/tests/_specs/<slug>.json`): exam_type, difficulty, danh sách chủ đề cho từng nhóm, phân bố grammar point Part 5, kế hoạch phân bố đáp án.
2. **Author agent** viết đề theo spec → file JSON nháp.
3. **Reviewer agent** (phiên riêng, không thấy đáp án trước) làm lại toàn bộ đề; câu nào reviewer chọn khác đáp án → sửa hoặc viết lại câu đó. Ghi kết quả vào `content_qa`.
4. **Validator** (mục 7) phải pass 100%.
5. **Audio** (Listening): `scripts/audio/tts-listening.mjs` tách transcript theo người nói (`M:`, `W:`, `M2:`, `N:`), gán giọng theo ma trận giọng, chèn khoảng lặng 0,6s giữa lượt lời, 5s sau mỗi câu hỏi Part 3/4 (hoặc 8s mức 1–2); xuất `media/tests/<slug>/g<group_order>.mp3`; cập nhật `audio_url`, `audio_duration_seconds`.
6. **Ảnh Part 1**: sinh từ `image_prompt` (ảnh chụp đen trắng/màu, cảnh công sở/đời sống, không chữ, không người nổi tiếng, không logo) hoặc chọn ảnh CC0 từ Openverse khớp mô tả; lưu `media/tests/<slug>/p1-<n>.webp` (≤ 120 KB, 1024px).
7. **Seed** → cập nhật `_manifest.json` = `seeded`.

### 5.5 Chống trùng & kiểm soát chất lượng đề

- `fingerprint = sha1(lower(strip_punct(question_text)) + '|' + sorted(option_texts))`; unique index chặn trùng toàn hệ thống.
- So khớp gần đúng (Jaccard 5-gram ≥ 0,7) giữa passage mới và passage cũ → báo `warn`.
- Không tái sử dụng tên riêng (công ty, người) quá 3 lần trên toàn kho; dùng danh sách tên hư cấu `content/_names.json` (≥ 500 tên người đa quốc gia, ≥ 300 tên công ty hư cấu).
- 5% câu ngẫu nhiên mỗi lô được người duyệt (admin) kiểm tra qua trang quản trị trước khi `is_published = true`.

---

## 6. Kế hoạch từ vựng (≥ 10.000 headword) & học liệu phụ trợ

### 6.1 Xây danh sách headword (`scripts/vocab/build-wordlist.mjs`)

1. Gộp NGSL + NAWL + TSL + BSL + CEFR-J + 1.930 từ hiện có.
2. Bổ sung theo `wordfreq` (top 20.000 tiếng Anh) cho tới khi đạt **≥ 10.500 lemma** (dư 5% để loại lỗi).
3. Chuẩn hoá: lowercase lemma, bỏ tên riêng, viết tắt, từ tục, từ nhạy cảm; giữ biến thể chính tả US làm headword, UK ghi chú (`colour` → note).
4. Gán `lists`, `frequency_rank`, `cefr` (CEFR-J; nếu thiếu → suy từ rank: ≤1.000 A1, ≤2.000 A2, ≤4.000 B1, ≤7.000 B2, còn lại C1).
5. Xuất `content/vocab/headwords.json`: `[{"lemma","pos_candidates","rank","cefr","lists"}]`.

Phân bổ mục tiêu:

| Cấp | Số lemma |
|---|---|
| A1 | 900 |
| A2 | 1.300 |
| B1 | 2.300 |
| B2 | 3.000 |
| C1 | 2.200 |
| C2/chuyên ngành (business, academic) | 800 |
| **Tổng** | **10.500** |

### 6.2 Làm giàu dữ liệu từng từ

Mỗi bản ghi `content/vocab/words/*.json`:

```json
{
  "word": "accommodate",
  "lemma": "accommodate",
  "pos": "v",
  "ipa_us": "/əˈkɑː.mə.deɪt/",
  "ipa_uk": "/əˈkɒm.ə.deɪt/",
  "syllables": "ac·com·mo·date",
  "stress": 2,
  "meaning_vi": "cung cấp chỗ ở; đáp ứng, điều chỉnh cho phù hợp",
  "definition_en": "to provide space or lodging for someone; to adjust to meet a need",
  "examples": [
    {"en": "The hotel can accommodate up to 300 guests.", "vi": "Khách sạn có thể phục vụ tới 300 khách.", "source": "original"},
    {"en": "We will try to accommodate your request for a later start date.", "vi": "Chúng tôi sẽ cố gắng đáp ứng đề nghị lùi ngày bắt đầu của bạn.", "source": "original"}
  ],
  "collocations": [{"en": "accommodate a request", "vi": "đáp ứng yêu cầu"}, {"en": "accommodate guests", "vi": "tiếp đón khách"}],
  "word_family": [{"word": "accommodation", "pos": "n"}, {"word": "accommodating", "pos": "adj"}],
  "synonyms": ["house", "lodge", "adapt"],
  "antonyms": [],
  "cefr": "B2",
  "frequency_rank": 4120,
  "lists": ["ngsl", "tsl"],
  "topics": ["travel", "hospitality", "business"],
  "register": "formal",
  "source": "original"
}
```

Bước làm giàu (mỗi lô 500 từ):
1. **IPA**: `enrich-ipa.mjs` lấy từ ipa-dict (US/UK) → fallback CMUdict (US) → fallback LLM có đánh dấu `reviewed=false`. IPA phải bao gồm dấu trọng âm `ˈ ˌ`, bọc trong `/ /`.
2. **Nghĩa + ví dụ**: LLM viết **nguyên bản** (định nghĩa tiếng Anh ngắn ≤ 20 từ, nghĩa tiếng Việt tự nhiên, 2 ví dụ ≤ 18 từ, ví dụ thứ 2 ưu tiên ngữ cảnh công sở/TOEIC). Có thể thêm 1 câu Tatoeba (ghi `"source":"tatoeba:<id>"`).
3. **Từ đa nghĩa / đa từ loại**: mỗi cặp (word, pos) là 1 bản ghi (đúng unique `(word,pos)` hiện có); `lemma` giống nhau.
4. **Audio**: `tts-words.mjs` sinh `media/words/us/<lemma>.mp3` và `media/words/uk/<lemma>.mp3` (mono, 48 kbps, cắt lặng đầu/cuối, ≤ 25 KB). Phrase/ví dụ không sinh sẵn (UI dùng TTS trình duyệt) — chỉ sinh cho headword.
5. **Gán bộ từ** (`vocab_collections` / `vocab_lessons`), mục 6.3.

### 6.3 Bộ từ (collections) cần có sau mở rộng

| family | Collection | Bài học | Từ/bài |
|---|---|---|---|
| toeic | 600 từ TOEIC (có) + **TOEIC 1500 theo chủ đề** (50 chủ đề) | 50 | 30 |
| toeic | TOEIC theo mục tiêu 450/600/750/900 (mở rộng) | 4 | 150 |
| 1000-50-ngay | Hoàn thiện ngày 21–50 | 30 | 20 |
| 3000 | 3000 từ thông dụng A1–C1 (đủ 3.000) | 30 | 100 |
| ngsl | NGSL Core 2.800 | 28 | 100 |
| ielts | IELTS Academic (NAWL + chủ đề) 20 chủ đề | 20 | 40 |
| vstep | VSTEP bậc 3/4/5 | 15 | 40 |
| thpt | Từ vựng THPT Quốc gia theo Unit lớp 10–12 (tự biên soạn theo chủ đề, không chép SGK) | 30 | 30 |
| giao-tiep | Giao tiếp 40 tình huống | 40 | 20 |
| business | Business English (BSL) | 20 | 50 |
| it | **Tiếng Anh CNTT** (đúng thương hiệu QEnglishIT): lập trình, mạng, bảo mật, cloud, AI, phỏng vấn IT | 20 | 40 |
| phrasal | Phrasal verbs theo động từ gốc (get, take, put…) | 40 | 20 |
| idioms | Idioms theo chủ đề | 25 | 20 |

> Collection JSON chỉ chứa danh sách `{"word","pos"}` tham chiếu tới `vocab_words`; seed sẽ tra id. Một từ có thể thuộc nhiều bài.

### 6.4 Cụm từ (`phrases`)

| kind | Mục tiêu | Ghi chú |
|---|---|---|
| phrasal_verb | 800 | nghĩa riêng cho từng nghĩa; 2 ví dụ |
| idiom | 500 | mức B2–C1, ghi register |
| collocation | 1.500 | nhóm theo động từ (make/do/take/have…) và theo chủ đề business |
| expression | 400 | mẫu câu giao tiếp, email |

### 6.5 Phát âm (`pronunciation_lessons`)

- 44 bài âm IPA (20 nguyên âm/nguyên âm đôi + 24 phụ âm): mô tả khẩu hình bằng tiếng Việt, lỗi người Việt hay mắc (ví dụ /θ/ → /t/, bỏ âm cuối /s/ /t/ /d/), 10 từ ví dụ, 5–10 cặp tối thiểu, 3 câu luyện.
- 10 bài trọng âm, 6 bài ngữ điệu, 6 bài nối âm/nuốt âm, 4 bài đuôi -s/-es, -ed.
- Tổng cặp tối thiểu ≥ 300; audio từng từ dùng lại audio từ vựng nếu có.

### 6.6 Ngữ pháp, đọc, nghe, nói, viết

| Loại | Thêm mới | Yêu cầu |
|---|---|---|
| Grammar topics | +80 (tổng ≥ 120) | Thêm nhóm cơ bản A1–A2 (to be, there is/are, can, câu hỏi Wh-), nhóm THPT (câu tường thuật, câu hỏi đuôi, đảo ngữ, cụm động từ), nhóm IELTS (cohesion, hedging, nominalisation). Mỗi topic ≥ 10 exercise + ≥ 10 quiz, gắn `level` |
| Irregular verbs | 200 động từ | base/past/pp, IPA, nghĩa |
| Reading passages | +480 (tổng ≥ 500) | A2 100, B1 150, B2 150, C1 100; thể loại: email, quảng cáo, bài báo, blog, khoa học phổ thông, tiểu sử, hướng dẫn, chat; ≥ 60 bài chuyển thể từ VOA Learning English (public domain, ghi nguồn) |
| Listening lessons | +370 (tổng ≥ 400) | 150 bilingual (hội thoại TOEIC), 150 syllabus A2–C1, 70 bài từ VOA (giữ transcript gốc nếu PD) — tất cả có audio |
| Speaking tasks | +180 | đủ 11 dạng TOEIC Speaking + 60 câu IELTS Speaking Part 1/2/3 + 30 câu VSTEP |
| Writing tasks | +134 | TOEIC Writing 8 dạng, IELTS Task 1 (mô tả số liệu dạng bảng markdown) & Task 2, email VSTEP |
| Blog | +88 | chiến lược từng Part, IELTS/VSTEP/THPT, phương pháp học, tiếng Anh IT |
| Documents | +50 | cheat sheet in được: bảng IPA, bảng động từ bất quy tắc, 500 collocation, mẫu email… |
| Courses | +8 | Lộ trình IELTS 5.5/6.5, VSTEP B1/B2, THPT 8+/9+, Tiếng Anh IT, Phát âm chuẩn |

### 6.7 Đề kiểm tra từ vựng & ngữ pháp tự động

Sau khi có dữ liệu, script `scripts/build-tests-from-bank.mjs` sinh 20 `vocab_test` + 20 `grammar_test` từ ngân hàng câu (`grammar_questions`, `vocab_words`) theo ma trận cấp độ — câu được chọn không trùng giữa các đề cùng cấp.

### 6.8 Tài nguyên tham khảo bên ngoài (chỉ lưu link, không sao chép)

Tạo `content/documents/external-resources.json` → seed vào `documents` với `category = "Tài nguyên ngoài"`, `file_url` = link, `content_md` = mô tả ngắn tự viết:

- BBC Learning English, British Council LearnEnglish, VOA Learning English, ETS TOEIC (trang chính thức – thông tin kỳ thi), IELTS.org, Cambridge Dictionary, Oxford Learner's Dictionaries, YouGlish (nghe phát âm theo ngữ cảnh), Tatoeba, Project Gutenberg, LibriVox, TED-Ed, Khan Academy (đọc hiểu), MIT OpenCourseWare (tiếng Anh học thuật), freeCodeCamp & MDN (tiếng Anh CNTT).

---

## 7. Validator (`scripts/validate/validate-content.mjs`)

Chạy: `node scripts/validate/validate-content.mjs content/<path>`; exit code ≠ 0 nếu có lỗi. Ghi báo cáo `content/_reports/<date>.md`.

**Đề thi**
- JSON hợp lệ; trường bắt buộc đủ; `exam_type` thuộc danh sách.
- TOEIC full: đúng 200 câu, numbering 1–200 liên tục, số câu/Part đúng chuẩn (6/25/39/30/30/16/54), Part 3 & 4 đúng 3 câu/nhóm, Part 6 đúng 4 câu/nhóm.
- `correct_answer` ∈ keys của options (với mcq/tfng); gap_fill có `answer_data.accepted` không rỗng.
- Phân bố đáp án 22–28%, không > 3 lần liên tiếp.
- Listening có `transcript`; Part 3/4 transcript có nhãn người nói; Part 1 có `image_description`.
- Part 6 passage có đủ placeholder `-------(131)-------`… tương ứng số câu.
- `explanation` và `translation` không rỗng, có ký tự tiếng Việt có dấu.
- Fingerprint không trùng với DB (truy vấn `questions.fingerprint`).

**Từ vựng**
- `ipa_us`, `ipa_uk` khớp regex `^/[^/]+/$` và chứa ký tự IPA hợp lệ.
- ≥ 2 ví dụ; mỗi ví dụ chứa lemma hoặc dạng biến đổi (bảng inflection đơn giản: -s, -es, -ed, -ing, -er, -est, bất quy tắc từ `irregular_verbs`).
- `meaning_vi` ≤ 120 ký tự, không chứa tiếng Anh nguyên câu.
- `pos` ∈ {n, v, adj, adv, prep, conj, pron, det, num, interj, phr}.
- Không trùng `(word,pos)` trong lô và với DB.
- File audio tồn tại & thời lượng 0,3–3 s (sau khi sinh).

**Chung**
- Không chứa URL hoặc tên thương hiệu cấm (ETS logo text, "anhngu24h", "Cambridge Assessment" trong nội dung câu hỏi).
- Độ dài trường hợp lý (passage ≤ 6.000 ký tự).

---

## 8. Mở rộng `scripts/seed.mjs`

- Thêm section: `phrases`, `pronunciation`, `irregular`, `sources`, `words` (bảng `vocab_words` độc lập với collection), `collections` (chỉ map bài ↔ từ).
- `seedTests()`: đọc đệ quy `content/tests/**`, ghi thêm `exam_type, level, difficulty, cefr, tags, sections`, câu hỏi ghi `question_type, answer_data, difficulty, skill_tags, fingerprint`; `group.section`, `instructions`.
- Nạp theo lô 500 bản ghi, retry 3 lần khi lỗi mạng; log tiến độ.
- Cờ `--dry-run` (chỉ validate + đếm), `--only <slug>`.
- Sau seed: gọi `qa/report.mjs` in bảng tổng hợp.

`scripts/audio/upload-media.mjs`:
- Upload vào bucket `media` với `cacheControl: "31536000"`, `upsert: true`; ghi `media_assets`; cập nhật URL công khai vào bảng nguồn (`vocab_words.audio_us_url`, `question_groups.audio_url`…).

---

## 9. Lộ trình thực hiện (sprint)

| Sprint | Việc | Đầu ra kiểm chứng |
|---|---|---|
| S0 (1 ngày) | Migration 0004, `content_sources`, validator, mở rộng seed, `_manifest.json`, `_names.json` | `get_advisors` sạch; `npm run seed -- --dry-run` chạy được |
| S1 | Headword list 10.500 + IPA US/UK | `headwords.json`; 100% có IPA |
| S2 | Làm giàu từ vựng 21 lô × 500 | ≥ 10.000 lemma trong DB, validator pass |
| S3 | Audio từ vựng US/UK + upload | 100% US, ≥ 90% UK có `audio_*_url` |
| S4 | 20 TOEIC full mức 2 + audio + ảnh | 20 đề `toeic_full` published |
| S5 | 25 TOEIC full mức 3 + 15 mức 4–5 | tổng 62 full test (gồm 2 đề cũ) |
| S6 | 30 mini + 15 listening + 15 reading + 70 part tests | ≥ 192 đề TOEIC |
| S7 | Phrases (3.200) + phát âm + irregular verbs | bảng mới đủ số lượng |
| S8 | Grammar +80 topic; 20 grammar_test + 20 vocab_test | ≥ 120 topic; 40 đề |
| S9 | THPT 25 + VSTEP 15 + placement 5 | ≥ 277 đề |
| S10 | IELTS reading 15 + listening 15 (+ UI loại câu mới) | **≥ 307 đề** |
| S11 | Reading 480, Listening 370 (+audio), Speaking 180, Writing 134, 10 đề `toeic_sw` ghép từ task | **≥ 317 đề**, đạt mục tiêu mục 1 |
| S12 | Blog 88, Documents 50 + external resources, Courses 8, collections mới | đạt mục tiêu mục 1 |

Mỗi sprint kết thúc bằng: validator pass → seed → `qa/report.mjs` → cập nhật `docs/PROGRESS.md` → commit `content: <mô tả>` (không commit file audio/ảnh, chỉ commit JSON + script).

---

## 10. Việc UI cần làm song song (để dùng hết dữ liệu mới)

1. Bộ lọc đề theo `exam_type`, `difficulty`, `level` trên `/luyen-de-toeic`; trang mới `/de-thi/[exam_type]` cho THPT, VSTEP, IELTS, placement.
2. `TestRunner`: render theo `question_type` (gap_fill → input, tfng → 3 nút, matching → select), chấm `answer_data.accepted`; thang điểm riêng: THPT /10, VSTEP bậc, IELTS band (bảng quy đổi 40 câu).
3. Đọc `audio_url` (đã hỗ trợ) và `image_url` thật cho Part 1.
4. Trang từ: hiển thị `ipa_us/ipa_uk` + 2 nút phát âm audio file, word family, collocations, nhiều ví dụ.
5. Trang `/phat-am`, `/phrasal-verbs`, `/idioms`, `/dong-tu-bat-quy-tac`, `/nguon-tai-lieu` (ghi nguồn từ `content_sources`).
6. Bài kiểm tra đầu vào (`cefr_placement`) → gợi ý lộ trình.

---

## 11. Ước tính dung lượng & chi phí

| Hạng mục | Ước tính |
|---|---|
| Rows DB (questions ~29k, words ~11k, phrases 3.2k, khác) | ~60–90 MB (vừa gói Free 500 MB) |
| Audio từ vựng (11k × 2 × ~18 KB) | ~400 MB |
| Audio đề (≈190 đề có Listening × ~40 phút × 0,36 MB/phút @48 kbps) | ~2,7 GB |
| Audio bài nghe (400 × 3 phút) | ~430 MB |
| Ảnh (Part 1, speaking ~1.500 × 100 KB) | ~150 MB |
| **Tổng Storage** | **~3,7 GB → vượt gói Free (1 GB)** |

Khuyến nghị: nâng Supabase Pro (100 GB storage) **hoặc** lưu media trên Cloudflare R2 / Vercel Blob và chỉ giữ URL trong DB. Dùng Opus 32 kbps mono cho audio dài để giảm ~35%.

Chi phí LLM: ~29.000 câu + 10.500 từ + 3.200 cụm từ + ~1.300 bài học liệu; nên chạy theo lô, cache kết quả, reviewer chỉ chạy trên câu hỏi đề thi (không chạy trên từ vựng – dùng validator + mẫu 5%).

---

## 12. Kiểm tra cuối cùng (SQL)

```sql
select exam_type, count(*) as tests, sum(total_questions) as questions from tests group by 1 order by 1;
select count(*) from tests;                                    -- ≥ 300
select count(distinct lemma) from vocab_words;                 -- ≥ 10000
select count(*) filter (where ipa_us is null or ipa_uk is null) as missing_ipa,
       count(*) filter (where audio_us_url is null) as missing_audio_us,
       count(*) filter (where jsonb_array_length(examples) < 2) as few_examples
from vocab_words;                                              -- tất cả = 0
select kind, count(*) from phrases group by 1;
select count(*) from grammar_topics;                           -- ≥ 120
select count(*) from reading_passages;                         -- ≥ 500
select count(*) from listening_lessons;                        -- ≥ 400
select correct_answer, count(*) from questions where question_type = 'mcq' group by 1; -- cân bằng
select fingerprint, count(*) from questions group by 1 having count(*) > 1;            -- rỗng
```

Khi tất cả truy vấn đạt ngưỡng → cập nhật `docs/PROGRESS.md`, tạo PR `content: data expansion v1`.
