import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cached, config, confined, hash, run, safeName, root } from './lib.mjs';
import { transcriptTurns, listeningJobs } from './tts-listening.mjs';

test('Part 2 splits three responses from the question voice', () => {
  assert.deepEqual(transcriptTurns('Q: Where is it?\n(A) Near the lift.\n(B) At noon.\n(C) Three days.',2),[
    { speaker:'Q',en:'Where is it?' },
    { speaker:'N',en:'A. Near the lift.' },
    { speaker:'N',en:'B. At noon.' },
    { speaker:'N',en:'C. Three days.' },
  ]);
});
import { uploadPlan } from './upload-media.mjs';

test('missing configuration, example voice terms, missing binaries fail clearly', () => {
  assert.throws(() => config(), /configuration required/);
  assert.throws(() => config(fileURLToPath(new URL('./config.example.json', import.meta.url))), /actual license/);
  assert.throws(() => run('qenglishit-nonexistent-tts-binary', []), /unavailable/);
});
test('configured command is actually executed and argv stays literal', () => {
  const literal = '$(echo secret); & not-a-shell';
  assert.equal(run(process.execPath, ['-e', 'process.stdout.write(process.argv[1])', literal]), literal);
  assert.throws(() => run(process.execPath, ['-e', 'process.exit(7)']), /exit 7/);
});
test('speaker continuation, third speaker and question pauses preserve input', () => {
  assert.deepEqual(transcriptTurns('M: Hello.\ncontinued\nW: Hi.\nM2: Welcome.'), [
    { speaker: 'M', en: 'Hello.\ncontinued' }, { speaker: 'W', en: 'Hi.' }, { speaker: 'M2', en: 'Welcome.' },
  ]);
  const jobs = listeningJobs({ slug: 'qe-test-01', difficulty: 2, groups: [{ part: 3, transcript: 'M: Hello.', questions: [{ question_text: 'Where?', options: [{ key: 'A', text: 'At work.' }] }] }] });
  assert.equal(jobs[0].turns.at(-1).question, true);
  assert.equal(jobs[0].turns.at(-1).en, 'Where?\nA. At work.');
  assert.equal(jobs[0].relative, 'tests/qe-test-01/g1.mp3');
});
test('path traversal rejected; manifest bytes and signature control resume', () => {
  assert.throws(() => safeName('../escape'), /Unsafe/);
  assert.throws(() => confined(root, '../escape'), /escapes/);
  const dir = path.join(root, 'scripts/audio/.cache/tests');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `cache-${process.pid}.bin`);
  try {
    fs.writeFileSync(file, 'synthetic-test-only');
    const record = { signature: 'config-a', sha256: hash(fs.readFileSync(file)) };
    assert.equal(cached(record, 'config-a', file), true);
    assert.equal(cached(record, 'config-b', file), false);
    fs.writeFileSync(file, 'changed');
    assert.equal(cached(record, 'config-a', file), false);
  } finally { fs.rmSync(file, { force: true }); }
});
test('uploader rejects an ungenerated or changed asset before any network request', () => {
  const dir = path.join(root, 'scripts/audio/.cache/tests');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `manifest-${process.pid}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify({ version: 1, kind: 'words', assets: { x: { path: 'words/us/example.mp3', sha256: 'invalid', bytes: 10 } } }));
    assert.throws(() => uploadPlan(file, dir), /Missing\/changed/);
  } finally { fs.rmSync(file, { force: true }); }
});

test('uploader accepts a verified pronunciation lesson asset', () => {
  const dir = path.join(root, 'scripts/audio/.cache/tests');
  fs.mkdirSync(path.join(dir, 'pronunciation'), { recursive: true });
  const media = path.join(dir, 'pronunciation/ipa-fleece.mp3');
  const manifest = path.join(dir, `pronunciation-manifest-${process.pid}.json`);
  try {
    fs.writeFileSync(media, 'synthetic-pronunciation-test-only');
    const bytes = fs.statSync(media).size;
    fs.writeFileSync(manifest, JSON.stringify({
      version: 1,
      kind: 'pronunciation',
      assets: {
        'pronunciation/ipa-fleece.mp3': {
          path: 'pronunciation/ipa-fleece.mp3',
          sha256: hash(fs.readFileSync(media)),
          bytes,
          duration_seconds: 1,
          generator: 'test-only',
          voice: 'test-only',
          owner_table: 'pronunciation_lessons',
          owner_key: { slug: 'ipa-fleece' },
          url_field: 'audio_url',
        },
      },
    }));
    const [asset] = uploadPlan(manifest, dir);
    assert.equal(asset.owner_table, 'pronunciation_lessons');
    assert.equal(asset.owner_key.slug, 'ipa-fleece');
  } finally {
    fs.rmSync(manifest, { force: true });
    fs.rmSync(media, { force: true });
  }
});
