#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { options, root, config, positive, voiceFor, preflight, json, safeName, confined, manifest, cached, synthesize, encode, hash, save, cli } from './lib.mjs';

cli(async () => {
  const args = options({ dialect: { type: 'string', default: 'both' } });
  if (args.help) { console.log('tts-words.mjs --config <file> [--input headwords.json] [--dialect us|uk|both] [--only lemma] [--limit N] [--output directory]'); return; }
  const cfg = config(args.config);
  const limit = positive(args.limit);
  const dialects = args.dialect === 'both' ? ['us', 'uk'] : [args.dialect];
  if (dialects.some(d => !['us', 'uk'].includes(d))) throw new Error('dialect must be us, uk or both');
  for (const d of dialects) voiceFor(cfg, d, d === 'us' ? 'en-US' : 'en-GB');
  const input = json(args.input || path.join(root, 'content/vocab/headwords.json'));
  if (!Array.isArray(input) || !input.length) throw new Error('Expected nonempty headword array');
  const words = [...new Set(input.map(w => safeName(w.lemma)))].filter(w => !args.only || w === args.only).slice(0, limit);
  if (!words.length) throw new Error('No matching headwords');
  preflight(cfg);
  const output = path.resolve(args.output || path.join(root, 'scripts/audio/.cache/media'));
  const manifestPath = path.join(output, 'words-manifest.json');
  const state = manifest(manifestPath, 'words');
  let generated = 0, skipped = 0;
  for (const word of words) for (const dialect of dialects) {
    const voice = voiceFor(cfg, dialect);
    const relative = `words/${dialect}/${word}.mp3`;
    const file = confined(output, relative);
    const signature = hash(JSON.stringify({ cfg, word, dialect, encoder: 'mono-24k-48kbps-trim-v1' }));
    if (cached(state.assets[relative], signature, file)) { skipped++; continue; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const wav = file + '.raw.wav', temporary = file + '.part.mp3';
    try {
      synthesize(cfg, voice, word, wav);
      const info = encode(cfg, wav, temporary, true);
      fs.renameSync(temporary, file);
      state.assets[relative] = { path: relative, sha256: hash(fs.readFileSync(file)), signature, bytes: info.bytes,
        duration_seconds: info.duration, voice: voice.id, locale: voice.locale, generator: cfg.generator,
        voice_license: voice.license, voice_license_url: voice.license_url, lemma: word, dialect,
        owner_table: 'vocab_words', owner_key: { lemma: word }, url_field: `audio_${dialect}_url` };
      save(manifestPath, state); // completed files survive interrupted later runs
      generated++;
    } finally { fs.rmSync(wav, { force: true }); fs.rmSync(temporary, { force: true }); }
  }
  console.log(JSON.stringify({ generated, skipped, manifest: manifestPath }));
});
