import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cached, config, confined, hash, run, safeName, root } from './lib.mjs';
import { transcriptTurns, listeningJobs } from './tts-listening.mjs';
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
