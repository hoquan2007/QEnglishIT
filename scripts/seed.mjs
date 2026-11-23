// Seed QEnglishIT content from content/**.json into Supabase.
// Usage: npm run seed            (all)
//        npm run seed -- tests vocab   (only some sections)
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (server-only) in .env.local.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
const sb = createClient(url, key, { auth: { persistSession: false } });

const ROOT = join(import.meta.dirname, "..", "content");
const only = process.argv.slice(2);
const want = (s) => !only.length || only.includes(s);
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const list = (dir) => (existsSync(join(ROOT, dir)) ? readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".json")) : []);

async function must(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function chunked(table, rows, opts = {}, size = 400) {
  for (let i = 0; i < rows.length; i += size) {
    await must(sb.from(table).upsert(rows.slice(i, i + size), opts), `${table} upsert`);
  }
}

// ---------- Tests ----------
async function seedTests() {
  const files = list("tests");
  const bySlug = new Map();
  for (const f of files) {
    const j = read(join("tests", f));
    const cur = bySlug.get(j.slug) ?? { ...j, groups: [] };
    cur.groups.push(...j.groups);
    bySlug.set(j.slug, cur);
  }
  let order = 0;
  for (const t of [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug))) {
    order++;
    const qCount = t.groups.reduce((s, g) => s + g.questions.length, 0);
    const [test] = await must(
      sb.from("tests").upsert(
        { slug: t.slug, title: t.title, collection: t.collection, description: t.description ?? null,
          duration_minutes: t.duration_minutes ?? 120, total_questions: qCount, sort_order: order },
        { onConflict: "slug" },
      ).select("id"),
      "tests",
    );
    await must(sb.from("question_groups").delete().eq("test_id", test.id), "clear groups");
    const groups = t.groups.sort((a, b) => a.part - b.part || a.questions[0].number - b.questions[0].number);
    const groupRows = groups.map((g, i) => ({
      test_id: test.id, part: g.part, group_order: i + 1,
      passage: g.passage ?? null, passage_vi: g.passage_vi ?? null,
      transcript: g.transcript ?? null, transcript_vi: g.transcript_vi ?? null,
      image_url: g.image_url ?? null, image_description: g.image_description ?? null, audio_url: g.audio_url ?? null,
    }));
    const inserted = await must(sb.from("question_groups").insert(groupRows).select("id, group_order"), "groups");
    const idByOrder = new Map(inserted.map((r) => [r.group_order, r.id]));
    const qRows = groups.flatMap((g, i) =>
      g.questions.map((q) => ({
        test_id: test.id, group_id: idByOrder.get(i + 1), part: g.part, number: q.number,
        question_text: q.question_text ?? null, options: q.options, correct_answer: q.correct_answer,
        explanation: q.explanation ?? null, translation: q.translation ?? null, tags: q.tags ?? [],
      })),
    );
    await chunked("questions", qRows, { onConflict: "test_id,number" });
    console.log(`✓ test ${t.slug}: ${groups.length} groups, ${qRows.length} questions`);
  }
}

// ---------- Grammar ----------
async function seedGrammar() {
  const topics = list("grammar").flatMap((f) => read(join("grammar", f)));
  for (const t of topics) {
    const [row] = await must(
      sb.from("grammar_topics").upsert(
        { slug: t.slug, title: t.title, title_vi: t.title_vi, level: String(t.level), category: t.category,
          difficulty: t.difficulty, sort_order: t.sort_order, summary: t.summary, lecture_md: t.lecture_md,
          examples: t.examples ?? [], tips_md: t.tips_md },
        { onConflict: "slug" },
      ).select("id"),
      "grammar_topics",
    );
    await must(sb.from("grammar_questions").delete().eq("topic_id", row.id), "clear grammar q");
    const qs = [
      ...(t.exercises ?? []).map((q, i) => ({ ...q, kind: "exercise", sort_order: i })),
      ...(t.quiz ?? []).map((q, i) => ({ ...q, kind: "quiz", sort_order: i })),
    ].map((q) => ({ topic_id: row.id, kind: q.kind, sort_order: q.sort_order, question_text: q.question_text,
      options: q.options, correct_answer: q.correct_answer, explanation: q.explanation ?? null }));
    if (qs.length) await must(sb.from("grammar_questions").insert(qs), "grammar q");
  }
  console.log(`✓ grammar: ${topics.length} topics`);
}

// ---------- Vocabulary ----------
async function seedVocab() {
  for (const f of list("vocab")) {
    const c = read(join("vocab", f));
    const [col] = await must(
      sb.from("vocab_collections").upsert(
        { slug: c.slug, family: c.family, title: c.title, description: c.description ?? null, level: c.level ?? null,
          color: c.color ?? null, sort_order: c.sort_order ?? 0 },
        { onConflict: "slug" },
      ).select("id"),
      "vocab_collections",
    );
    let total = 0;
    for (const [li, l] of c.lessons.entries()) {
      const [lesson] = await must(
        sb.from("vocab_lessons").upsert(
          { collection_id: col.id, slug: l.slug, title: l.title, title_vi: l.title_vi ?? null,
            day_number: l.day_number ?? null, sort_order: l.sort_order ?? li + 1 },
          { onConflict: "collection_id,slug" },
        ).select("id"),
        "vocab_lessons",
      );
      const seen = new Set();
      const words = l.words
        .map((w) => ({ word: w.word.trim(), ipa: w.ipa ?? null, pos: w.pos ?? "", meaning_vi: w.meaning_vi,
          definition_en: w.definition_en ?? null, example_en: w.example_en ?? null, example_vi: w.example_vi ?? null, cefr: w.cefr ?? null }))
        .filter((w) => {
          const k = `${w.word}|${w.pos}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      const rows = await must(sb.from("vocab_words").upsert(words, { onConflict: "word,pos" }).select("id, word, pos"), "vocab_words");
      const idMap = new Map(rows.map((r) => [`${r.word}|${r.pos}`, r.id]));
      await must(sb.from("vocab_lesson_words").delete().eq("lesson_id", lesson.id), "clear lesson words");
      await must(
        sb.from("vocab_lesson_words").insert(words.map((w, i) => ({ lesson_id: lesson.id, word_id: idMap.get(`${w.word}|${w.pos}`), sort_order: i }))),
        "lesson words",
      );
      total += words.length;
    }
    console.log(`✓ vocab ${c.slug}: ${c.lessons.length} lessons, ${total} words`);
  }
}

// ---------- Simple slug tables ----------
async function seedSimple(dir, file, table, map = (x) => x) {
  const p = join(dir, file);
  if (!existsSync(join(ROOT, p))) return console.log(`- skip ${p}`);
  const rows = read(p).map((r, i) => map({ sort_order: i + 1, ...r }));
  await chunked(table, rows, { onConflict: "slug" });
  console.log(`✓ ${table}: ${rows.length}`);
}

async function seedCourses() {
  const p = join("courses", "courses.json");
  if (!existsSync(join(ROOT, p))) return;
  for (const c of read(p)) {
    const [row] = await must(
      sb.from("courses").upsert(
        { slug: c.slug, title: c.title, description: c.description, target_score: c.target_score ?? null, sort_order: c.sort_order ?? 0 },
        { onConflict: "slug" },
      ).select("id"),
      "courses",
    );
    await must(sb.from("course_lessons").delete().eq("course_id", row.id), "clear lessons");
    await must(
      sb.from("course_lessons").insert(
        c.lessons.map((l, i) => ({ course_id: row.id, slug: l.slug, title: l.title, lesson_type: l.lesson_type ?? "article",
          content_md: l.content_md ?? null, link_href: l.link_href ?? null, video_url: l.video_url ?? null,
          duration_minutes: l.duration_minutes ?? null, sort_order: l.sort_order ?? i + 1 })),
      ),
      "course_lessons",
    );
  }
  console.log("✓ courses");
}

const pick = (keys) => (r) => Object.fromEntries(keys.filter((k) => k in r).map((k) => [k, r[k]]));

if (want("tests")) await seedTests();
if (want("grammar")) await seedGrammar();
if (want("vocab")) await seedVocab();
if (want("reading")) await seedSimple("reading", "passages.json", "reading_passages",
  pick(["slug", "title", "level", "passage_type", "paragraphs", "questions", "vocabulary", "sort_order"]));
if (want("listening")) await seedSimple("listening", "lessons.json", "listening_lessons",
  pick(["slug", "kind", "title", "level", "topic", "segments", "sort_order"]));
if (want("speaking")) await seedSimple("speaking", "tasks.json", "speaking_tasks",
  pick(["slug", "task_type", "title", "prompt", "image_description", "prep_seconds", "response_seconds", "sample_answer", "tips_md", "sort_order"]));
if (want("writing")) await seedSimple("writing", "tasks.json", "writing_tasks",
  pick(["slug", "task_type", "title", "prompt", "keywords", "image_description", "time_minutes", "sample_answer", "tips_md", "sort_order"]));
if (want("blog")) await seedSimple("blog", "posts.json", "blog_posts",
  pick(["slug", "title", "excerpt", "content_md", "cover_url", "category", "tags"]));
if (want("documents")) await seedSimple("documents", "docs.json", "documents",
  pick(["slug", "title", "description", "category", "file_type", "file_url", "content_md"]));
if (want("courses")) await seedCourses();
console.log("Done.");
