import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBatch, generate, loadBanks, parseArgs, MATRIX } from './build-tests-from-bank.mjs';
import { questionFingerprint } from './validate/validate-content.mjs';

function grammarRow(i, level = '450') {
  return { level, question_text: `The workshop number ${i} ------- at nine.`,
    options: ['starts', 'start', 'starting', 'to start'].map((text, j) => ({ key: 'ABCD'[j], text })),
    correct_answer: 'A', explanation: 'Chủ ngữ số ít nên chọn starts.',
    translation: `Buổi hội thảo số ${i} bắt đầu lúc chín giờ.`, source: 'original' };
}
// Synthetic rows test mechanics only; they are never production content.
function vocabRows(n, cefr = 'A1') {
  return Array.from({ length: n }, (_, i) => ({ word: `fixtureword${i}`, pos: 'n', cefr,
    meaning_vi: `nghĩa${i}`, definition_en: `definition${i}`, source: 'original' }));
}
function banks() {
  return { grammar: Array.from({ length: 80 }, (_, i) => grammarRow(i)), vocab: vocabRows(100) };
}
function assertShuffledBalance(t) {
  const keys = t.groups[0].questions.map(q => q.correct_answer);
  for (const key of 'ABCD') {
    const share = keys.filter(k => k === key).length / keys.length;
    assert.ok(share >= .22 && share <= .28, `${t.slug}: ${key} share ${share}`);
  }
  for (let i = 3; i < keys.length; i++) assert.ok(new Set(keys.slice(i - 3, i + 1)).size > 1, 'answer run exceeds three');
  // Catch ABCD, rotations, reversed cycles, and other short periodic schedules.
  for (let period = 1; period <= 8; period++) {
    assert.ok(keys.some((key, i) => i >= period && key !== keys[i - period]), `periodic schedule: ${period}`);
  }
  assert.ok(keys.some((key, i) => i > 0 && key === keys[i - 1]), 'shuffle should allow natural adjacent repeats');
  const blocks = Array.from({ length: Math.floor(keys.length / 4) }, (_, i) => keys.slice(i * 4, i * 4 + 4));
  assert.ok(blocks.some(block => new Set(block).size < 4), 'every block of four must not reveal a forced permutation');
}
async function fixture(t, data = banks()) {
  const root = await mkdtemp(join(tmpdir(), 'qe-bank-fixture-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  async function put(path, value) {
    const file = join(root, path); await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(value)); return file;
  }
  await put('grammar/batch.json', [{ slug: 'fixture', level: '450', exercises: data.grammar, quiz: [] }]);
  await put('vocab/words/words.json', data.vocab);
  await put('sources/sources.json', [{ key: 'original', title: 'QEnglishIT', license: 'Original (QEnglishIT)' }]);
  return { root, put };
}

test('default request reports both shortages before creating any output', async t => {
  const { root } = await fixture(t);
  await assert.rejects(generate({ contentRoot: root }), e => {
    assert.equal(e.report.grammar_test.required_questions, 800);
    assert.equal(e.report.vocab_test.required_questions, 1000);
    assert.equal(e.report.grammar_test.raw_rows, 80);
    assert.equal(e.report.grammar_test.shortage_by_level['450'], 120);
    return true;
  });
  assert.equal((await readdir(root)).includes('tests'), false);
});

test('deterministic complete batch, preserved grammar and globally unique fingerprints', () => {
  const data = banks();
  data.grammar.push({ ...grammarRow(0), correct_answer: 'D' });
  const a = buildBatch(data, { count: 1 });
  const b = buildBatch(data, { count: 1 });
  assert.deepEqual(a, b);
  assert.deepEqual(a.tests.map(t => t.total_questions), [40, 50]);
  const qs = a.tests.flatMap(t => t.groups.flatMap(g => g.questions));
  assert.equal(new Set(qs.map(questionFingerprint)).size, 90);
  for (const t of a.tests) {
    assert.equal(t.is_published, false);
    assert.equal(t.independent_review, 'pending');
    assert.deepEqual(t.groups[0].questions.map(q => q.number), Array.from({ length: t.total_questions }, (_, i) => i + 1));
    const counts = {};
    for (const q of t.groups[0].questions) {
      assert.equal(q.source, 'original'); assert.equal(q.fingerprint, questionFingerprint(q));
      counts[q.correct_answer] = (counts[q.correct_answer] ?? 0) + 1;
      assert.equal(new Set(q.options.map(o => o.text)).size, 4);
      if (t.exam_type === 'grammar_test') assert.equal(q.options.find(o => o.key === q.correct_answer).text, 'starts');
    }
    assert.ok(Math.max(...Object.values(counts)) - Math.min(...Object.values(counts)) <= 1);
    assertShuffledBalance(t);
  }
});

test('all twenty grammar schedules are deterministic, balanced and nontrivial', () => {
  const grammar = MATRIX.grammar_test.levels.flatMap((level, j) =>
    Array.from({ length: 200 }, (_, i) => grammarRow(j * 200 + i, level)));
  const a = buildBatch({ grammar, vocab: [] }, { type: 'grammar' });
  const b = buildBatch({ grammar: grammar.toReversed(), vocab: [] }, { type: 'grammar' });
  assert.deepEqual(a.tests, b.tests);
  const schedules = a.tests.map(t => t.groups[0].questions.map(q => q.correct_answer).join(''));
  assert.equal(new Set(schedules).size, 20, 'tests should not share one universal answer schedule');
  for (const t of a.tests) assertShuffledBalance(t);
});

test('hash-ranked distractors vary by question, prefer same CEFR and POS, and ignore input order', () => {
  const vocab = MATRIX.vocab_test.levels.flatMap(cefr => ['n', 'v'].flatMap(pos =>
    vocabRows(pos === 'n' ? 80 : 20, cefr).map((w, i) => ({ ...w, pos,
      word: `${cefr}-${pos}-word${i}`, meaning_vi: `nghĩa${cefr}${pos}${i}`, definition_en: `definition${cefr}${pos}${i}` }))));
  const opts = { count: 5, type: 'vocab' };
  const a = buildBatch({ grammar: [], vocab }, opts);
  assert.deepEqual(a.tests, buildBatch({ grammar: [], vocab: vocab.toReversed() }, opts).tests);
  const byMeaning = new Map(vocab.map(w => [w.meaning_vi, w]));
  const byWord = new Map(vocab.map(w => [w.word, w]));
  for (const t of a.tests) {
    assertShuffledBalance(t);
    const triples = new Set(), usage = new Map();
    for (const q of t.groups[0].questions) {
      const target = byWord.get(q.question_text.match(/“([^”]+)”/u)[1]);
      const distractors = q.options.filter(o => o.key !== q.correct_answer).map(o => o.text);
      triples.add([...distractors].sort().join('|'));
      assert.equal(q.options.find(o => o.key === q.correct_answer).text, target.meaning_vi);
      for (const meaning of distractors) {
        const candidate = byMeaning.get(meaning);
        assert.equal(candidate.cefr, target.cefr);
        assert.equal(candidate.pos, target.pos);
        usage.set(meaning, (usage.get(meaning) ?? 0) + 1);
      }
    }
    assert.ok(triples.size >= 40, `${t.slug}: insufficient distractor trio variety`);
    assert.ok(usage.size >= 40, `${t.slug}: too few distinct distractor meanings`);
    assert.ok(Math.max(...usage.values()) < 15, `${t.slug}: overused distractor`);
  }
});

test('safe distractor fallback stays POS matched when target CEFR is sparse', () => {
  const vocab = vocabRows(60, 'A2');
  vocab[0].cefr = 'A1';
  // Only one A1 headword: still insufficient for a full test, but it has safe
  // same-POS alternatives and must appear as one eligible A1 question.
  assert.throws(() => buildBatch({ grammar: [], vocab }, { count: 1, type: 'vocab' }), e => {
    assert.equal(e.report.vocab_test.eligible_by_level.A1, 1);
    assert.equal(e.report.vocab_test.shortage_by_level.A1, 49);
    assert.equal(e.report.vocab_test.eligible_by_level.A2, 59);
    return true;
  });
});

test('matrix cycles exact levels without borrowing from surplus levels', () => {
  const grammar = MATRIX.grammar_test.levels.flatMap((l, j) => Array.from({ length: 40 }, (_, i) => grammarRow(j * 40 + i, l)));
  const { tests } = buildBatch({ grammar, vocab: [] }, { count: 4, type: 'grammar' });
  assert.deepEqual(tests.map(t => t.level), ['450', '600', '700', '800']);
  assert.throws(() => buildBatch(banks(), { count: 2, type: 'grammar' }), e => {
    assert.equal(e.report.grammar_test.matrix_prefix_capacity, 1);
    assert.equal(e.report.grammar_test.shortage_by_level['600'], 40); return true;
  });
});

test('incremental batches continue numbering and never reuse previous questions', () => {
  const grammar = MATRIX.grammar_test.levels.flatMap((level, j) =>
    Array.from({ length: 80 }, (_, i) => grammarRow(j * 80 + i, level)));
  const first = buildBatch({ grammar, vocab: [] }, { count: 4, type: 'grammar' });
  const existing = first.tests.map(test => ({ test }));
  const next = buildBatch({ grammar, vocab: [], existing }, { count: 4, start: 4, type: 'grammar' });
  assert.deepEqual(next.tests.map(t => t.slug), [
    'qe-grammar-450-002', 'qe-grammar-600-002', 'qe-grammar-700-002', 'qe-grammar-800-002',
  ]);
  const fingerprints = [...first.tests, ...next.tests].flatMap(t =>
    t.groups.flatMap(g => g.questions.map(questionFingerprint)));
  assert.equal(new Set(fingerprints).size, 320);
  assert.throws(() => buildBatch({ grammar, vocab: [], existing },
    { count: 4, start: 3, type: 'grammar' }), /Existing test slug/);
});

test('missing grammar translations and non-original sources are ineligible', () => {
  const data = banks();
  for (let i = 0; i < 41; i++) delete data.grammar[i].translation;
  data.grammar[41].source = 'external';
  assert.throws(() => buildBatch(data, { count: 1, type: 'grammar' }), e => {
    assert.equal(e.report.grammar_test.missing_vietnamese_translation, 41);
    assert.equal(e.report.grammar_test.eligible_unique_questions, 38); return true;
  });
});

test('Vietnamese accent check accepts the full alphabet, including decomposed text', () => {
  for (const accent of ['à', 'á', 'è', 'é', 'ì', 'í', 'ò', 'ó', 'ù', 'ú', 'ý', 'ĩ', 'ũ', 'À', 'a\u0300']) {
    const grammar = Array.from({ length: 40 }, (_, i) => ({ ...grammarRow(i),
      explanation: `Chon ${accent}`, translation: `Cau ${accent}` }));
    assert.equal(buildBatch({ grammar, vocab: [] }, { count: 1, type: 'grammar' }).tests.length, 1);
  }
});

test('nonempty unaccented vocabulary meanings remain eligible', () => {
  const vocab = vocabRows(50).map((w, i) => ({ ...w, meaning_vi: i === 0 ? 'cha' : `meaning${i}` }));
  const { tests } = buildBatch({ grammar: [], vocab }, { count: 1, type: 'vocab' });
  assert.ok(tests[0].groups[0].questions.some(q => q.options.find(o => o.key === q.correct_answer).text === 'cha'));
});

test('vocabulary uses existing meanings and rejects overlapping senses and synonyms', () => {
  const vocab = vocabRows(70);
  vocab[0] = { ...vocab[0], meaning_vi: 'sự lựa chọn', synonyms: [vocab[1].word] };
  vocab[1] = { ...vocab[1], meaning_vi: 'phương án' };
  vocab[2] = { ...vocab[2], meaning_vi: 'lựa chọn; quyết định' };
  vocab.push({ ...vocab[1], meaning_vi: 'sự lựa chọn', cefr: 'B2' });
  const { tests, report } = buildBatch({ grammar: [], vocab }, { count: 1, type: 'vocab' });
  assert.equal(report.vocab_test.unique_headwords, 70);
  const meanings = new Set(vocab.map(w => w.meaning_vi));
  for (const q of tests[0].groups[0].questions) {
    for (const option of q.options) assert.ok(meanings.has(option.text));
    const selected = q.options.map(o => o.text);
    assert.ok(!(selected.includes('sự lựa chọn') && selected.includes('phương án')));
    assert.ok(!(selected.includes('sự lựa chọn') && selected.includes('lựa chọn; quyết định')));
  }
});

test('no safe distractors means zero capacity rather than ambiguous generated questions', () => {
  const vocab = vocabRows(60).map(w => ({ ...w, meaning_vi: 'cùng một nghĩa' }));
  assert.throws(() => buildBatch({ grammar: [], vocab }, { count: 1, type: 'vocab' }), e => {
    assert.equal(e.report.vocab_test.eligible_unique_questions, 0); return true;
  });
});

test('existing fingerprints are excluded even after option reorder and answer changes', () => {
  const data = { grammar: Array.from({ length: 40 }, (_, i) => grammarRow(i)), vocab: [] };
  const duplicate = { ...grammarRow(0), options: grammarRow(0).options.toReversed(), correct_answer: 'B' };
  data.existing = [{ test: { slug: 'old', groups: [{ questions: [duplicate] }] } }];
  assert.throws(() => buildBatch(data, { count: 1, type: 'grammar' }), e => {
    assert.equal(e.report.grammar_test.eligible_unique_questions, 39); return true;
  });
});

test('dry run validates whole batch without output; real write creates complete unpublished tests', async t => {
  const { root } = await fixture(t);
  const opts = { contentRoot: root, count: 1 };
  assert.equal((await generate({ ...opts, dryRun: true })).questions, 90);
  assert.equal((await readdir(root)).includes('tests'), false);
  const result = await generate(opts);
  assert.equal(result.files.length, 2);
  for (const path of result.files) assert.equal(JSON.parse(await readFile(path, 'utf8')).is_published, false);
  const before = await Promise.all(result.files.map(f => readFile(f, 'utf8')));
  await assert.rejects(generate(opts), /Existing test slug/);
  assert.deepEqual(await Promise.all(result.files.map(f => readFile(f, 'utf8'))), before);
});

test('validator failure in later test prevents ALL output files', async t => {
  const data = banks();
  data.vocab = data.vocab.map(w => ({ ...w, word: `${w.word} https://example.invalid` }));
  const { root } = await fixture(t, data);
  await assert.rejects(generate({ contentRoot: root, count: 1 }), /Batch validation failed/);
  assert.equal((await readdir(root)).includes('tests'), false);
});

test('existing path collision never overwrites even if slug differs', async t => {
  const { root, put } = await fixture(t);
  const path = await put('tests/grammar_test/qe-grammar-450-001.json', { slug: 'different-slug', groups: [] });
  const before = await readFile(path, 'utf8');
  await assert.rejects(generate({ contentRoot: root, count: 1 }), /Refusing to overwrite/);
  assert.equal(await readFile(path, 'utf8'), before);
});

test('CLI rejects malformed counts and unknown flags', () => {
  for (const value of ['0', '-1', '1.5', '1x', '21', 'NaN']) assert.throws(() => parseArgs(['--count', value]));
  assert.throws(() => parseArgs(['--count']), /Missing value/);
  assert.throws(() => parseArgs(['--force']), /Unknown argument/);
  assert.throws(() => parseArgs(['--start', '-1']), /nonnegative integer/);
  assert.throws(() => buildBatch(banks(), { start: 20, count: 1 }), /first 20 tests/);
  assert.deepEqual(parseArgs(['--count', '1', '--start', '4', '--type', 'grammar']),
    { count: 1, start: 4, type: 'grammar' });
  assert.deepEqual(parseArgs(['--count', '1', '--type', 'vocab', '--dry-run']), { count: 1, type: 'vocab', dryRun: true });
});

test('current repository bank capacity is measured without writing production content', async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../content');
  const data = await loadBanks(root);
  assert.ok(data.grammar.length > 0);
  // Bank inventory changes as new lessons and tests are added. Both a full
  // bank and a bank with shortages are valid states of this read-only check.
  let inventory;
  try {
    inventory = buildBatch({ ...data, existing: [] }).report;
  } catch (error) {
    assert.match(error.message, /Insufficient local bank capacity/);
    inventory = error.report;
  }
  for (const [type, required] of [['grammar_test', 800], ['vocab_test', 1000]]) {
    const row = inventory[type];
    assert.ok(row);
    assert.equal(row.raw_rows, type === 'grammar_test' ? data.grammar.length : data.vocab.length);
    assert.equal(row.required_questions, required);
    for (const [level, need] of Object.entries(row.required_by_level)) {
      assert.equal(row.shortage_by_level[level], Math.max(0, need - row.eligible_by_level[level]));
    }
  }
});

test('prospective real-bank five-test batch validates in isolation and preserves existing files', async t => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../content');
  const data = await loadBanks(root);
  const before = await Promise.all(data.existing.map(e => readFile(e.file, 'utf8')));
  // Preview a replacement in memory/temporary storage only. Production generation
  // retains its slug/path collision checks and requires parent-managed regeneration.
  const preview = buildBatch({ ...data, existing: [] }, { count: 5, type: 'vocab' });
  assert.equal(preview.tests.reduce((n, test) => n + test.total_questions, 0), 250);
  assert.ok(preview.report.vocab_test.matrix_prefix_capacity >= 5);
  for (const test of preview.tests) {
    assertShuffledBalance(test);
    const trios = test.groups[0].questions.map(q => q.options.filter(o => o.key !== q.correct_answer).map(o => o.text).sort().join('|'));
    assert.ok(new Set(trios).size >= 40, `${test.slug}: insufficient real-bank distractor variety`);
  }
  const isolated = await fixture(t, { grammar: [], vocab: data.vocab });
  const result = await generate({ contentRoot: isolated.root, count: 5, type: 'vocab', dryRun: true });
  assert.equal(result.questions, 250);
  assert.deepEqual(result.files, []);
  assert.deepEqual(await Promise.all(data.existing.map(e => readFile(e.file, 'utf8'))), before);
});
