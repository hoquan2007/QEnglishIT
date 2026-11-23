import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const hash = value => createHash('sha256').update(value).digest('hex');
export const json = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
export function save(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(file + '.tmp', file);
}
export function options(extra = {}) {
  return parseArgs({ options: {
    config: { type: 'string' }, input: { type: 'string' }, output: { type: 'string' },
    limit: { type: 'string' }, only: { type: 'string' }, help: { type: 'boolean' }, ...extra,
  }, strict: true }).values;
}
export function positive(value, fallback = Infinity) {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1) throw new Error('limit must be a positive integer');
  return Number(value);
}
export function safeName(value) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:['-][a-z0-9]+)*$/.test(value)) throw new Error(`Unsafe media identifier: ${value}`);
  return value;
}
export function confined(base, relative) {
  const target = path.resolve(base, relative);
  if (target === path.resolve(base) || !target.startsWith(path.resolve(base) + path.sep)) throw new Error('Media path escapes output directory');
  return target;
}
export function run(command, args, input, timeout = 120000) {
  const result = spawnSync(command, args, { input, encoding: 'utf8', shell: false, timeout, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
  // Do not echo argv, child stdout/stderr, credentials or text to error logs.
  if (result.error) throw new Error(`Command unavailable or timed out (${path.basename(command)}): ${result.error.code || 'spawn failure'}`);
  if (result.status !== 0) throw new Error(`Command failed (${path.basename(command)}), exit ${result.status}`);
  return result.stdout;
}
export function config(file) {
  if (!file) throw new Error('TTS configuration required: pass --config <local.config.json>; see config.example.json. No audio generated.');
  const value = json(file);
  if (!value.command || !Array.isArray(value.args) || !value.args.every(a => typeof a === 'string') || !value.args.some(a => a.includes('{output}'))) throw new Error('Configure command, args[], and an {output} argument. The backend must create a real WAV file.');
  if (!value.generator || !value.voices || !Object.keys(value.voices).length) throw new Error('Configure generator and explicit voices with id, locale, license and license_url.');
  for (const voice of Object.values(value.voices)) {
    if (!voice.id || !/^en-(US|GB|AU|CA)$/.test(voice.locale) || !voice.license || !/^https:\/\//.test(voice.license_url || '') || /REPLACE|PLACEHOLDER/.test(voice.license)) throw new Error('Every voice requires id, en-US/GB/AU/CA locale, actual license and official HTTPS license_url; no guessed model license.');
  }
  if (!Number.isFinite(value.timeout_ms ?? 120000) || (value.timeout_ms ?? 120000) < 1000) throw new Error('timeout_ms must be >=1000');
  value.ffmpeg ||= 'ffmpeg';
  value.ffprobe ||= 'ffprobe';
  return value;
}
export function preflight(cfg) {
  run(cfg.ffmpeg, ['-version']);
  run(cfg.ffprobe, ['-version']);
  // No backend version guess: its first real synthesis is the backend check.
}
export function voiceFor(cfg, key, expectedLocale) {
  const voice = cfg.voices[key];
  if (!voice || (expectedLocale && voice.locale !== expectedLocale)) throw new Error(`Voice ${key} must explicitly use locale ${expectedLocale || 'en-US/GB/AU/CA'}`);
  return voice;
}
export function synthesize(cfg, voice, text, wav) {
  if (typeof text !== 'string' || !text.trim() || text.length > 30000) throw new Error('TTS text must be nonempty and <=30000 characters');
  fs.mkdirSync(path.dirname(wav), { recursive: true });
  fs.rmSync(wav, { force: true });
  const values = { output: wav, voice: voice.id, text };
  const args = cfg.args.map(arg => arg.replace(/\{(output|voice|text)\}/g, (_, key) => values[key]));
  run(cfg.command, args, text + '\n', cfg.timeout_ms ?? 120000);
  if (!fs.existsSync(wav) || fs.statSync(wav).size <= 44) throw new Error('TTS exited without producing a nonempty WAV file');
  const header = fs.readFileSync(wav).subarray(0, 12);
  if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Backend output is not RIFF/WAVE audio');
}
export function probe(cfg, file) {
  const data = JSON.parse(run(cfg.ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name,codec_type,channels', '-of', 'json', file]));
  const duration = Number(data.format?.duration);
  if (!(duration > 0) || !data.streams?.some(s => s.codec_type === 'audio')) throw new Error('Invalid or empty audio stream');
  return { duration, streams: data.streams, bytes: fs.statSync(file).size };
}
export function encode(cfg, input, output, word = false) {
  const args = ['-y', '-v', 'error', '-i', input, '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '24000'];
  if (word) args.push('-af', 'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-45dB:stop_periods=-1:stop_duration=0.12:stop_threshold=-45dB');
  args.push('-codec:a', 'libmp3lame', '-b:a', '48k', '-f', 'mp3', output);
  run(cfg.ffmpeg, args, undefined, 180000);
  const info = probe(cfg, output);
  if (info.streams.filter(s => s.codec_type === 'audio').some(s => s.channels !== 1 || s.codec_name !== 'mp3')) throw new Error('Expected mono MP3');
  if (word && (info.duration < 0.3 || info.duration > 3 || info.bytes > 25000)) throw new Error(`Word audio fails QA (${info.duration.toFixed(2)}s, ${info.bytes} bytes); required 0.3–3s, <=25000 bytes`);
  return info;
}
export function cached(record, signature, file) {
  return record?.signature === signature && fs.existsSync(file) && hash(fs.readFileSync(file)) === record.sha256;
}
export function manifest(file, kind) {
  const value = fs.existsSync(file) ? json(file) : { version: 1, kind, assets: {} };
  if (value.version !== 1 || value.kind !== kind || !value.assets || Array.isArray(value.assets)) throw new Error('Incompatible audio manifest');
  return value;
}
export async function retry(work, attempts = 3) {
  let error;
  for (let n = 0; n < attempts; n++) {
    try { return await work(); } catch (caught) { error = caught; }
    if (n + 1 < attempts) await new Promise(resolve => setTimeout(resolve, (n + 1) * 250));
  }
  throw error;
}
export function cli(main) { main().catch(error => { console.error(error.message); process.exitCode = 1; }); }
