# Content JSON formats (QEnglishIT)

All content is ORIGINAL, written for QEnglishIT. Never copy questions, passages or explanations from
ETS, anhngu24h, or any published book/site. Vietnamese text uses proper diacritics. UTF-8 JSON, valid, no comments.

## tests — `content/tests/<slug>-listening.json` and `<slug>-reading.json`
```json
{
  "slug": "qe-test-01", "title": "Test 01", "collection": "QEnglishIT 2026",
  "groups": [
    {
      "part": 3,
      "passage": null, "passage_vi": null,
      "transcript": "M: ...\nW: ...", "transcript_vi": "M: ...\nW: ...",
      "image_description": null,
      "questions": [
        { "number": 32, "question_text": "What is the woman's job?",
          "options": [{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],
          "correct_answer": "B",
          "explanation": "Giải thích bằng tiếng Việt, trích dẫn câu then chốt trong transcript/đoạn văn.",
          "translation": "Bản dịch câu hỏi + 4 đáp án sang tiếng Việt.",
          "tags": ["detail"] }
      ]
    }
  ]
}
```
TOEIC numbering & counts (must match exactly):
- Part 1: Q1–6, one group per question, `image_description` = vivid English description of a photo (used as image alt), transcript = the 4 spoken statements "(A) ... (B) ... (C) ... (D) ...", options text = same statements.
- Part 2: Q7–31, one group per question, 3 options A–C, transcript = "Q: question\n(A) ...\n(B) ...\n(C) ...", question_text = null.
- Part 3: Q32–70, 13 conversations × 3 questions (some 3-speaker "M1/M2/W"), 2–3 groups may include a small table/graphic in `passage` (markdown) with "Look at the graphic" questions.
- Part 4: Q71–100, 10 talks × 3 questions (speaker "N:" narrator), 2 with a graphic in `passage`.
- Part 5: Q101–130, one group per question, sentence with "-------" blank, 4 options; tags = grammar point (e.g. "word-form", "tense", "preposition", "vocabulary").
- Part 6: Q131–146, 4 texts × 4 questions, `passage` contains blanks marked "-------(131)-------" etc.; one question per text is sentence insertion.
- Part 7: Q147–200: 10 single passages (2–4 questions each, total 29 Q: 147–175), 2 double passages (5 Q each: 176–185), 3 triple passages (5 Q each: 186–200). For multi-passage, separate passages in `passage` with "---". Include `passage_vi`.
Listening file holds Parts 1–4; reading file holds Parts 5–7. Spread answer keys evenly across A/B/C/D.

## grammar — `content/grammar/<batch>.json` (array)
```json
[{ "slug": "present-simple", "title": "Present Simple", "title_vi": "Thì hiện tại đơn",
   "level": "450", "category": "Thì", "difficulty": "Beginner", "sort_order": 1,
   "summary": "1–2 câu tiếng Việt",
   "lecture_md": "## Cách dùng ... (markdown tiếng Việt, có bảng công thức, 300–600 từ)",
   "examples": [{"en": "...", "vi": "...", "note": "..."}],
   "tips_md": "Mẹo làm Part 5 ... (markdown)",
   "exercises": [{"question_text": "...-------...", "options": [{"key":"A","text":".."}...4], "correct_answer": "C", "explanation": "tiếng Việt"}],
   "quiz": [ same shape ] }]
```
level ∈ "450","600","700","800"; category ∈ "Thì","Từ loại","Cấu trúc câu","Mệnh đề","Động từ","Giới từ & Liên từ","Khác".
Each topic: 6+ examples, 6 exercises, 8 quiz questions.

## vocab — `content/vocab/<collection-slug>.json`
```json
{ "slug": "toeic-600", "family": "toeic", "title": "600 từ vựng TOEIC", "description": "...", "level": null, "color": "#0ea5e9", "sort_order": 1,
  "lessons": [{ "slug": "contracts", "title": "Contracts", "title_vi": "Hợp đồng", "day_number": null, "sort_order": 1,
     "words": [{ "word": "agreement", "ipa": "/əˈɡriːmənt/", "pos": "n", "meaning_vi": "sự thoả thuận; hợp đồng",
                 "definition_en": "...", "example_en": "...", "example_vi": "...", "cefr": "B1" }] }] }
```
family ∈ toeic | 1000-50-ngay | 3000 | ielts | vstep | giao-tiep. pos ∈ n, v, adj, adv, prep, conj, phr. Example sentences must be original.

## reading — `content/reading/passages.json` (array)
`{ "slug","title","level","passage_type","paragraphs":[{"en","vi"}],"questions":[{"q","options":[{"key","text"}],"answer","explanation"}],"vocabulary":[{"word","meaning_vi"}] }`

## listening — `content/listening/lessons.json` (array)
`{ "slug","kind":"bilingual"|"syllabus","title","level","topic","segments":[{"speaker":"M"|"W"|"N","en","vi"}] }`

## speaking / writing — `content/speaking/tasks.json`, `content/writing/tasks.json`
speaking: `{ "slug","task_type":"read_aloud"|"describe_picture"|"respond_questions"|"respond_info"|"express_opinion","title","prompt","image_description","prep_seconds","response_seconds","sample_answer","tips_md","sort_order" }`
writing: `{ "slug","task_type":"sentence_picture"|"respond_email"|"opinion_essay","title","prompt","keywords":[],"image_description","time_minutes","sample_answer","tips_md","sort_order" }`

## blog / documents / courses — `content/blog/posts.json`, `content/documents/docs.json`, `content/courses/courses.json`
blog: `{ "slug","title","excerpt","content_md","category","tags":[] }` (800–1500 words Vietnamese markdown)
documents: `{ "slug","title","description","category","file_type":"md","content_md" }` (printable study handouts/cheat sheets)
courses: `{ "slug","title","description","target_score","sort_order","lessons":[{"slug","title","lesson_type":"article"|"link"|"quiz","content_md","link_href","duration_minutes","sort_order"}] }`
`link_href` points to in-app routes like `/ngu-phap-toeic/present-simple`, `/tu-vung-toeic/<collection>/<lesson>`, `/luyen-de-toeic`, `/luyen-part-5-toeic`.

## Content expansion v1

The complete target and authoring rules are in `Plandataenglish.md`. Existing files remain readable;
new batches must provide `source` referencing `content/sources/sources.json` (normally `original`).
Downloaded corpora in `vocab/raw/` and generated files in `media/` are not committed.

- Tests can be nested below `tests/<exam_type>/`. `_specs/` contains authoring specifications, not seed data.
  Split listening/reading files share a slug and are validated together. Add `exam_type`, `level`,
  `difficulty` (1–5), `cefr`, `tags`, `sections`, and `source`. New tests stay unpublished until independent
  answer review and an admin's 5% sample review. Do not label automated checks as human review.
- Groups add `section`, `instructions`, `audio_duration_seconds`; questions add `question_type`,
  `answer_data`, `difficulty`, `skill_tags`. `gap_fill`/`short_answer` require nonempty
  `answer_data.accepted`. `tfng`/`ynng` use explicit option keys. Fingerprints are computed by the validator.
- `vocab/words/*.json`: arrays of at most 500 records, unique `(word,pos)`. Add `lemma`, `ipa_us`,
  `ipa_uk`, two bilingual `examples`, `source`, `frequency_rank`, `lists`, `topics`, `word_family`,
  `synonyms`, `antonyms`, `collocations`, `register`, `reviewed`. Keep `ipa` compatible with `ipa_us`.
  Headwords are a work queue, not enriched vocabulary and must never be seeded as complete words.
- `vocab/collections/*.json`: collection/lesson metadata with `words: [{word,pos}]` references;
  missing references are errors rather than incomplete silently imported lessons.
- `phrases/*.json`: arrays of `{kind,phrase,meaning_vi,definition_en,examples,level,topics,source}`.
  Kinds: `phrasal_verb`, `idiom`, `collocation`, `expression`, `proverb`. Natural key: `(kind,phrase)`.
- `pronunciation/*.json`: arrays of `{slug,symbol,kind,title,description_md,example_words,
  minimal_pairs,practice_sentences,sort_order,source}`. Minimal pairs must differ by one phoneme.
- `irregular/*.json`: arrays of `{base,past,past_participle,meaning_vi,ipa,level,source}`.
- `sources/sources.json`: `{key,title,url,license,attribution,notes}` records. Check the upstream
  license before downloading; retain source-specific licensing and attribution on derived data.
- `documents/external-resources.json`: links and original descriptions only, not copied content.

Validate before seeding. `--dry-run` must never modify the database or mark a manifest entry seeded.
`content/_manifest.json` records completed imports; reports belong under `content/_reports/`.
