/** Local only. Usage: node scripts/build-tests-from-bank.mjs [--count N]
 * [--type all|grammar|vocab] [--dry-run] [--content-root PATH]
 * Count is PER requested type (default 20). Levels cycle in the order below;
 * no borrowing between levels, question reuse, translation fabrication or fallback templates.
 */
import { readFile, readdir, mkdir, mkdtemp, writeFile, rm, lstat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { questionFingerprint, validateContent } from './validate/validate-content.mjs';

export const MATRIX = Object.freeze({
  grammar_test: Object.freeze({ levels: Object.freeze(['450', '600', '700', '800']), size: 40, minutes: 30 }),
  vocab_test: Object.freeze({ levels: Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1']), size: 50, minutes: 20 }),
});
const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/iu;
const nonempty = s => typeof s === 'string' && !!s.trim();
const vietnamese = s => nonempty(s) && VI.test(s.normalize('NFC'));
const norm = s => String(s ?? '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const json = async p => JSON.parse((await readFile(p, 'utf8')).replace(/^\uFEFF/, ''));
const original = row => row.source === undefined || row.source === 'original';
const hashRank = (...parts) => createHash('sha256').update(JSON.stringify(parts)).digest('hex');

function answerSchedule(size, seed) {
  // Shuffle a balanced multiset, rather than enforcing balance in predictable
  // four-question blocks. Rejection preserves quotas while bounding answer runs.
  const keys = [...'ABCD'].sort((a, b) => compare(hashRank(seed, a), hashRank(seed, b)));
  const slots = Array.from({ length: size }, (_, i) => keys[i % 4]);
  for (let attempt = 0; attempt < 1000; attempt++) {
    const schedule = slots.map((key, i) => ({ key, rank: hashRank(seed, attempt, i) }))
      .sort((a, b) => compare(a.rank, b.rank)).map(s => s.key);
    const runsTooLong = schedule.some((key, i) => i >= 3 && schedule.slice(i - 3, i + 1).every(k => k === key));
    const periodic = schedule.every((key, i) => i < 4 || key === schedule[i - 4]);
    if (!runsTooLong && !periodic) return schedule;
  }
  throw new Error('Unable to produce balanced nonperiodic answer schedule');
}

async function files(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  const result = [];
  for (const e of entries.sort((a, b) => compare(a.name, b.name))) {
    if (e.name.startsWith('_') || e.name === 'raw' || e.isSymbolicLink()) continue;
    if (e.isDirectory()) result.push(...await files(join(dir, e.name)));
    else if (e.name.endsWith('.json')) result.push(join(dir, e.name));
  }
  return result;
}

export async function loadBanks(contentRoot) {
  const grammar = [], vocab = [], existing = [];
  for (const file of await files(join(contentRoot, 'grammar'))) {
    const topics = await json(file);
    if (!Array.isArray(topics)) throw new Error(`Expected grammar topic array: ${file}`);
    for (const topic of topics) for (const kind of ['exercises', 'quiz']) {
      for (const q of topic[kind] ?? []) grammar.push({ ...q, level: String(topic.level),
        source: q.source ?? topic.source, bank_ref: `${file}#${topic.slug}/${kind}` });
    }
  }
  for (const file of await files(join(contentRoot, 'vocab'))) {
    // Headword work queues and collection references are not complete word banks.
    if (!file.endsWith('.json')) continue;
    const data = await json(file);
    const rows = Array.isArray(data) && dirname(file) === join(contentRoot, 'vocab', 'words')
      ? data : (data.lessons ?? []).flatMap(l => l.words ?? []);
    for (const w of rows) vocab.push({ ...w, source: w.source ?? data.source, bank_ref: file });
  }
  for (const file of await files(join(contentRoot, 'tests'))) {
    const t = await json(file);
    existing.push({ file, test: t });
  }
  return { grammar, vocab, existing };
}

function validMCQ(q) {
  return nonempty(q.question_text) && vietnamese(q.explanation) && vietnamese(q.translation)
    && original(q) && Array.isArray(q.options) && q.options.length === 4
    && q.options.every(o => nonempty(o.key) && nonempty(o.text))
    && new Set(q.options.map(o => o.key)).size === 4
    && new Set(q.options.map(o => norm(o.text))).size === 4
    && q.options.some(o => o.key === q.correct_answer);
}

// Conservative lexical exclusion across ALL known senses of each headword.
// This rejects identical, overlapping and explicitly synonymous meanings. It is
// automated screening only; independent semantic/answer review remains pending.
function tokens(s) { return new Set(norm(s).split(' ').filter(Boolean)); }
function overlaps(a, b) { return [...a].some(t => b.has(t)); }
function safePair(a, b) {
  if (a.head === b.head || a.synonyms.has(b.head) || b.synonyms.has(a.head)) return false;
  if (overlaps(a.vi, b.vi)) return false;
  if (a.definitions.some(x => b.definitions.includes(x))) return false;
  return true;
}

function vocabQuestions(rows) {
  const heads = new Map();
  for (const w of rows) {
    if (!nonempty(w.word)) continue;
    const head = norm(w.lemma || w.word);
    const entry = heads.get(head) ?? { head, rows: [], vi: new Set(), definitions: [], synonyms: new Set() };
    entry.rows.push(w);
    for (const t of tokens(w.meaning_vi)) entry.vi.add(t);
    if (nonempty(w.definition_en)) entry.definitions.push(norm(w.definition_en));
    for (const s of w.synonyms ?? []) entry.synonyms.add(norm(s));
    heads.set(head, entry);
  }
  const entries = [...heads.values()].sort((a, b) => compare(a.head, b.head));
  const usable = entries.filter(e => {
    e.word = e.rows.find(w => original(w) && nonempty(w.meaning_vi) && MATRIX.vocab_test.levels.includes(w.cefr));
    return !!e.word;
  });
  const questions = [];
  for (const entry of usable) {
    const choices = [entry];
    // Keep POS matched; prefer the target CEFR before falling back to other
    // levels. Target-specific hashes vary choices without bank-order bias or
    // dependence on which tests/count are requested.
    const candidates = usable.filter(other => other !== entry && other.word.pos === entry.word.pos)
      .map(other => ({ other, tier: other.word.cefr === entry.word.cefr ? 0 : 1,
        rank: hashRank('vocab-distractor', entry.head, entry.word.cefr, entry.word.pos, other.head) }))
      .sort((a, b) => a.tier - b.tier || compare(a.rank, b.rank) || compare(a.other.head, b.other.head));
    for (const { other } of candidates) {
      if (!choices.every(c => safePair(c, other))) continue;
      choices.push(other);
      if (choices.length === 4) break;
    }
    if (choices.length < 4) continue;
    const w = entry.word;
    questions.push({ level: w.cefr, question_text: `Nghĩa tiếng Việt của từ “${w.word}”${w.pos ? ` (${w.pos})` : ''} là gì?`,
      options: choices.map((e, i) => ({ key: 'ABCD'[i], text: e.word.meaning_vi.trim() })),
      correct_answer: 'A', explanation: `Từ “${w.word}” có nghĩa là “${w.meaning_vi.trim()}” theo ngân hàng từ vựng hiện có.`,
      translation: `Chọn nghĩa tiếng Việt của từ “${w.word}”: ${w.meaning_vi.trim()}.`,
      source: 'original', bank_ref: w.bank_ref,
    });
  }
  return { questions, headwords: entries.length };
}

function prefixCapacity(counts, spec) {
  let n = 0;
  const remaining = { ...counts };
  while (remaining[spec.levels[n % spec.levels.length]] >= spec.size) {
    remaining[spec.levels[n % spec.levels.length]] -= spec.size;
    n++;
  }
  return n;
}

export function buildBatch({ grammar, vocab, existing = [] }, { count = 20, type = 'all' } = {}) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 20) throw new Error('--count must be an integer from 1 to 20');
  if (!['all', 'grammar', 'vocab'].includes(type)) throw new Error('--type must be all, grammar or vocab');
  const used = new Set(existing.flatMap(({ test }) => (test.groups ?? []).flatMap(g => (g.questions ?? []).map(questionFingerprint))));
  const v = vocabQuestions(vocab);
  const input = { grammar_test: grammar.filter(validMCQ), vocab_test: v.questions };
  const pools = {}, report = {};
  for (const [exam, spec] of Object.entries(MATRIX)) {
    const seen = new Set(used);
    const pool = Object.fromEntries(spec.levels.map(l => [l, []]));
    for (const q of input[exam]) {
      const fp = questionFingerprint(q);
      if (!pool[q.level] || seen.has(fp)) continue;
      seen.add(fp); pool[q.level].push(q);
    }
    for (const qs of Object.values(pool)) qs.sort((a, b) => compare(questionFingerprint(a), questionFingerprint(b)));
    pools[exam] = pool;
    const eligible = Object.fromEntries(spec.levels.map(l => [l, pool[l].length]));
    const requested = type === 'all' || exam === `${type}_test` ? count : 0;
    const required = Object.fromEntries(spec.levels.map(l => [l, 0]));
    for (let i = 0; i < requested; i++) required[spec.levels[i % spec.levels.length]] += spec.size;
    report[exam] = { raw_rows: exam === 'grammar_test' ? grammar.length : vocab.length,
      ...(exam === 'grammar_test' ? { missing_vietnamese_translation: grammar.filter(q => !vietnamese(q.translation)).length,
        raw_by_level: Object.fromEntries(spec.levels.map(l => [l, grammar.filter(q => q.level === l).length])) }
        : { unique_headwords: v.headwords }),
      eligible_unique_questions: Object.values(eligible).reduce((a, b) => a + b, 0),
      eligible_by_level: eligible, complete_tests_by_level: Object.fromEntries(spec.levels.map(l => [l, Math.floor(eligible[l] / spec.size)])),
      matrix_prefix_capacity: prefixCapacity(eligible, spec), requested_tests: requested,
      required_questions: requested * spec.size, required_by_level: required,
      shortage_by_level: Object.fromEntries(spec.levels.map(l => [l, Math.max(0, required[l] - eligible[l])])) };
  }
  if (Object.values(report).some(r => Object.values(r.shortage_by_level).some(n => n > 0))) {
    const e = new Error('Insufficient local bank capacity; no test files written.'); e.report = report; throw e;
  }
  const tests = [];
  const batchFP = new Set(used);
  for (const [exam, spec] of Object.entries(MATRIX)) for (let i = 0; i < report[exam].requested_tests; i++) {
    const level = spec.levels[i % spec.levels.length];
    const slug = `qe-${exam === 'grammar_test' ? 'grammar' : 'vocab'}-${level.toLowerCase()}-${String(Math.floor(i / spec.levels.length) + 1).padStart(3, '0')}`;
    if (existing.some(({ test }) => test.slug === slug)) throw new Error(`Existing test slug: ${slug}`);
    const selected = pools[exam][level].splice(0, spec.size);
    const schedule = answerSchedule(spec.size, hashRank(slug, selected.map(questionFingerprint)));
    const questions = selected.map((q, n) => {
      // Moving choices preserves their texts, answers and fingerprints.
      const correct = q.options.find(o => o.key === q.correct_answer);
      const texts = q.options.filter(o => o !== correct).map(o => o.text);
      texts.splice('ABCD'.indexOf(schedule[n]), 0, correct.text);
      const result = { question_text: q.question_text, explanation: q.explanation, translation: q.translation,
        options: texts.map((text, j) => ({ key: 'ABCD'[j], text })), correct_answer: schedule[n],
        number: n + 1, part: 0, question_type: 'mcq', source: 'original',
        difficulty: spec.levels.indexOf(level) + 1, skill_tags: [exam],
        bank_ref: q.bank_ref, independent_review: 'pending' };
      result.fingerprint = questionFingerprint(result);
      if (batchFP.has(result.fingerprint)) throw new Error('Question fingerprint collision in batch');
      batchFP.add(result.fingerprint);
      return result;
    });
    tests.push({ slug, title: `${exam === 'grammar_test' ? 'Kiểm tra ngữ pháp' : 'Kiểm tra từ vựng'} ${level} – ${i + 1}`,
      exam_type: exam, level, ...(exam === 'vocab_test' ? { cefr: level } : {}),
      collection: 'Ngân hàng QEnglishIT', duration_minutes: spec.minutes, total_questions: spec.size,
      difficulty: spec.levels.indexOf(level) + 1, source: 'original', is_published: false,
      independent_review: 'pending', admin_sample_review: 'pending',
      sections: [{ key: 'use_of_english', title: 'Sử dụng tiếng Anh', count: spec.size, minutes: spec.minutes }],
      groups: [{ part: 0, section: 'use_of_english', instructions: 'Chọn một đáp án đúng.', questions }] });
  }
  return { tests, report };
}

export async function generate({ contentRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../content'), count = 20, type = 'all', dryRun = false } = {}) {
  contentRoot = resolve(contentRoot);
  const { tests, report } = buildBatch(await loadBanks(contentRoot), { count, type });
  const targets = tests.map(t => join(contentRoot, 'tests', t.exam_type, `${t.slug}.json`));
  for (const target of targets) {
    try { await lstat(target); throw new Error(`Refusing to overwrite existing test file: ${target}`); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  const stage = await mkdtemp(join(tmpdir(), 'qe-bank-tests-'));
  const created = [];
  try {
    const staged = [];
    for (const t of tests) {
      const file = join(stage, 'tests', t.exam_type, `${t.slug}.json`);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(t, null, 2) + '\n', { flag: 'wx' });
      staged.push(file);
    }
    const validation = await validateContent(staged, { contentRoot: stage, strict: true,
      sources: await json(join(contentRoot, 'sources', 'sources.json')) });
    if (validation.errors.length) {
      const e = new Error(`Batch validation failed: ${JSON.stringify(validation.errors)}`); e.report = report; throw e;
    }
    if (!dryRun) {
      for (let i = 0; i < targets.length; i++) {
        await mkdir(dirname(targets[i]), { recursive: true });
        await writeFile(targets[i], await readFile(staged[i]), { flag: 'wx' });
        created.push(targets[i]);
      }
    }
    return { report, tests: tests.length, questions: tests.reduce((n, t) => n + t.total_questions, 0), dryRun, files: dryRun ? [] : targets };
  } catch (e) {
    // Only remove files created successfully by this invocation, never a colliding file.
    for (const file of created) await rm(file);
    throw e;
  } finally { await rm(stage, { recursive: true, force: true }); }
}

export function parseArgs(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (['--count', '--type', '--content-root'].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      if (arg === '--count') {
        if (!/^(?:[1-9]|1[0-9]|20)$/.test(value)) throw new Error('--count must be an integer from 1 to 20');
        opts.count = Number(value);
      } else opts[arg === '--type' ? 'type' : 'contentRoot'] = value;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return opts;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await generate(parseArgs(process.argv.slice(2))), null, 2)); }
  catch (e) { console.error(e.message); if (e.report) console.error(JSON.stringify(e.report, null, 2)); process.exitCode = 1; }
}
