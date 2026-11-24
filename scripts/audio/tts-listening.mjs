#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { options, root, config, positive, voiceFor, preflight, json, safeName, confined, manifest, cached, synthesize, encode, probe, run, hash, save, cli } from './lib.mjs';

export function transcriptTurns(transcript, part) {
  if (typeof transcript !== 'string' || !transcript.trim()) throw new Error('Missing transcript');
  const turns = [];
  for (const line of transcript.split(/\r?\n/).map(s => s.trim()).filter(Boolean)) {
    const labeled = line.match(/^([A-Z][A-Z0-9]*):\s*(.+)$/);
    const response = part === 2 && line.match(/^\(([ABC])\)\s+(.+)$/);
    if (response) turns.push({ speaker: 'N', en: `${response[1]}. ${response[2]}` });
    else if (labeled) turns.push({ speaker: labeled[1], en: labeled[2] });
    else if (turns.length) turns.at(-1).en += '\n' + line;
    else turns.push({ speaker: 'N', en: line });
  }
  return turns;
}

export function listeningJobs(input) {
  if (Array.isArray(input)) return input.flatMap(listeningJobs);
  if (!input || !input.slug) throw new Error('Expected a test object or listening lesson(s) with slug');
  safeName(input.slug);
  if (input.groups) return input.groups.flatMap((group, index) => {
    if (group.section === 'reading' || Number(group.part) > 4) return [];
    const order = group.group_order ?? index + 1;
    if (!Number.isInteger(order) || order < 1) throw new Error('group_order must be positive integer');
    const turns = transcriptTurns(group.transcript,Number(group.part));
    if ([3, 4].includes(Number(group.part))) {
      for (const question of group.questions || []) {
        if (!question.question_text) throw new Error('Part 3/4 question text required for audio');
        const text = [question.question_text, ...(question.options || []).map(o => `${o.key}. ${o.text}`)].join('\n');
        turns.push({ speaker: 'Q', en: text, question: true });
      }
    }
    return [{ relative: `tests/${input.slug}/g${order}.mp3`, turns, difficulty: Number(group.difficulty ?? input.difficulty ?? 3),
      speakers: { ...input.speaker_voices, ...group.speaker_voices },
      owner_table: 'question_groups', owner_key: { test_slug: input.slug, group_order: order }, url_field: 'audio_url' }];
  });
  if (!Array.isArray(input.segments) || !input.segments.length) throw new Error(`No segments in lesson ${input.slug}`);
  return [{ relative: `listening/${input.slug}.mp3`, turns: input.segments, difficulty: Number(input.difficulty ?? 3), speakers: input.speaker_voices || {},
    owner_table: 'listening_lessons', owner_key: { slug: input.slug }, url_field: 'audio_url' }];
}

async function main() {
  const args = options();
  if (args.help) { console.log('tts-listening.mjs --input <test-or-lessons.json> --config <file> [--output directory] [--only slug] [--limit N]'); return; }
  if (!args.input) throw new Error('--input is required');
  const cfg = config(args.config), limit = positive(args.limit);
  const jobs = listeningJobs(json(args.input)).filter(j => !args.only || j.relative.split('/').includes(args.only) || j.relative === `listening/${args.only}.mp3`).slice(0, limit);
  if (!jobs.length) throw new Error('No matching listening jobs');
  // Validate ALL mappings before generating anything.
  for (const job of jobs) for (const turn of job.turns) {
    if (!turn.en?.trim()) throw new Error('Segment en must be nonempty');
    const key = job.speakers[turn.speaker] || cfg.speakers?.[turn.speaker];
    if (!key) throw new Error(`No explicitly configured voice for speaker ${turn.speaker}`);
    voiceFor(cfg, key);
  }
  preflight(cfg);
  const output = path.resolve(args.output || path.join(root, 'scripts/audio/.cache/media'));
  const manifestPath = path.join(output, 'listening-manifest.json'), state = manifest(manifestPath, 'listening');
  let generated = 0, skipped = 0;
  for (const job of jobs) {
    const file = confined(output, job.relative);
    const signature = hash(JSON.stringify({ cfg, job, encoder: 'mono24k48k-pause-v1' }));
    if (cached(state.assets[job.relative], signature, file)) { skipped++; continue; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const work = confined(output, `.segments/${signature}`);
    fs.mkdirSync(work, { recursive: true });
    const pieces = [], voices = [], accents = {};
    for (const [index, turn] of job.turns.entries()) {
      const key = job.speakers[turn.speaker] || cfg.speakers[turn.speaker], voice = voiceFor(cfg, key);
      voices.push(voice.id);
      accents[voice.locale] = (accents[voice.locale] || 0) + 1;
      const raw = path.join(work, `raw-${index}.wav`), pcm = path.join(work, `turn-${index}.wav`), receipt = pcm + '.json';
      const turnSignature = hash(JSON.stringify({ cfg, voice, text: turn.en }));
      if (!cached(fs.existsSync(receipt) ? json(receipt) : null, turnSignature, pcm)) {
        try {
          synthesize(cfg, voice, turn.en, raw);
          run(cfg.ffmpeg, ['-y', '-v', 'error', '-i', raw, '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', pcm]);
          probe(cfg, pcm);
          save(receipt, { signature: turnSignature, sha256: hash(fs.readFileSync(pcm)) });
        } finally { fs.rmSync(raw, { force: true }); }
      }
      pieces.push(pcm);
      const pause = turn.question ? (job.difficulty <= 2 ? 8 : 5) : 0.6;
      const silence = path.join(work, `silence-${pause}.wav`);
      if (!fs.existsSync(silence)) run(cfg.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(pause), '-c:a', 'pcm_s16le', silence]);
      pieces.push(silence);
    }
    const list = path.join(work, 'concat.txt'), joined = path.join(work, 'joined.wav'), temporary = file + '.part.mp3';
    const quote = p => p.replaceAll('\\', '/').replaceAll("'", "'\\''");
    fs.writeFileSync(list, pieces.map(p => `file '${quote(p)}'`).join('\n') + '\n');
    try {
      run(cfg.ffmpeg, ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c:a', 'pcm_s16le', joined], undefined, 300000);
      const info = encode(cfg, joined, temporary);
      fs.renameSync(temporary, file);
      state.assets[job.relative] = { path: job.relative, signature, sha256: hash(fs.readFileSync(file)), bytes: info.bytes,
        duration_seconds: info.duration, voice: [...new Set(voices)].join(', '), generator: cfg.generator, accents,
        voice_licenses: Object.fromEntries(Object.entries(cfg.voices).map(([k, v]) => [k, { license: v.license, license_url: v.license_url }])),
        owner_table: job.owner_table, owner_key: job.owner_key, url_field: job.url_field };
      save(manifestPath, state);
      generated++;
    } finally { fs.rmSync(joined, { force: true }); fs.rmSync(temporary, { force: true }); }
  }
  console.log(JSON.stringify({ generated, skipped, manifest: manifestPath }));
}
// Keep parsers importable for unit tests without executing the CLI.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) cli(main);
