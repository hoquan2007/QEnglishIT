#!/usr/bin/env node
// Offline by default. --execute is a separate explicit operator action.
import fs from 'node:fs';
import path from 'node:path';
import { options, json, safeName, confined, hash, save, retry, cli } from './lib.mjs';

export function uploadPlan(manifestPath, output) {
  const state = json(manifestPath);
  if (state.version !== 1 || !['words', 'listening'].includes(state.kind) || !state.assets || Array.isArray(state.assets)) throw new Error('Expected a completed words/listening manifest');
  return Object.values(state.assets).map(asset => {
    if (!asset.path || !/^(words\/(us|uk)\/|tests\/|listening\/)/.test(asset.path) || !asset.path.endsWith('.mp3')) throw new Error('Invalid asset path');
    const file = confined(output, asset.path);
    if (!fs.existsSync(file) || hash(fs.readFileSync(file)) !== asset.sha256 || fs.statSync(file).size !== asset.bytes) throw new Error(`Missing/changed media file: ${asset.path}`);
    if (!(asset.duration_seconds > 0) || !asset.generator || !asset.voice) throw new Error('Missing generated audio metadata');
    if (!['vocab_words', 'question_groups', 'listening_lessons'].includes(asset.owner_table)) throw new Error('Unsupported owner table');
    if (asset.owner_table === 'vocab_words') {
      safeName(asset.owner_key?.lemma);
      if (!['audio_us_url', 'audio_uk_url'].includes(asset.url_field)) throw new Error('Invalid vocabulary audio column');
    } else if (asset.owner_table === 'question_groups') {
      safeName(asset.owner_key?.test_slug);
      if (!Number.isInteger(asset.owner_key?.group_order) || asset.owner_key.group_order < 1 || asset.url_field !== 'audio_url') throw new Error('Invalid group owner');
    } else {
      safeName(asset.owner_key?.slug);
      if (asset.url_field !== 'audio_url') throw new Error('Invalid listening audio column');
    }
    return { ...asset, file };
  });
}

async function main() {
  const args = options({ execute: { type: 'boolean' }, 'dry-run': { type: 'boolean' } });
  if (args.help) { console.log('upload-media.mjs --input <manifest.json> [--output media-directory] [--dry-run] [--execute]'); return; }
  if (!args.input) throw new Error('--input <generated audio manifest> is required');
  if (args.execute && args['dry-run']) throw new Error('--execute and --dry-run are mutually exclusive');
  const output = path.resolve(args.output || path.dirname(path.resolve(args.input)));
  const plan = uploadPlan(args.input, output);
  if (!args.execute) {
    console.log(JSON.stringify({ dry_run: true, assets: plan.length, bucket: 'media', bytes: plan.reduce((n, a) => n + a.bytes, 0),
      operations: ['upsert Storage objects (cacheControl 31536000)', 'update source rows and audio duration where supported', 'upsert media_assets by bucket,path'],
      note: 'No credentials loaded and no network requests. Requires --execute for cloud mutation.' }, null, 2));
    return;
  }
  if (!plan.length) throw new Error('No completed assets to upload');
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Explicit environment SUPABASE_URL and SUPABASE_SECRET_KEY required; secrets are never logged');
  if (!url.startsWith('https://')) throw new Error('SUPABASE_URL must use HTTPS');
  const { createClient } = await import('@supabase/supabase-js'); // already a repo dependency
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(120000) }) } });
  const checked = async (query, stage) => {
    const result = await query;
    if (result.error) throw new Error(`${stage} failed (${result.error.code || result.status || 'remote error'}); verify schema/permissions; no completion recorded`);
    return result.data;
  };
  // Resolve every source before the first mutation. Missing/ambiguous owners fail.
  const resolved = [];
  for (const asset of plan) {
    let query = sb.from(asset.owner_table).select('id');
    if (asset.owner_table === 'vocab_words') query = query.eq('lemma', asset.owner_key.lemma);
    else if (asset.owner_table === 'listening_lessons') query = query.eq('slug', asset.owner_key.slug);
    else {
      const test = await checked(sb.from('tests').select('id').eq('slug', asset.owner_key.test_slug).single(), 'Resolve test');
      query = query.eq('test_id', test.id).eq('group_order', asset.owner_key.group_order);
    }
    // Probe required columns BEFORE upload; migration 0005 adds lesson audio.
    await checked(sb.from(asset.owner_table).select(asset.url_field).limit(0), 'Check owner audio column');
    const owners = await checked(query, 'Resolve source rows');
    if (!owners?.length || (asset.owner_table !== 'vocab_words' && owners.length !== 1)) throw new Error(`Missing or ambiguous source rows for ${asset.path}`);
    resolved.push({ asset, owners });
  }
  const receiptPath = path.join(output, 'upload-receipts.json');
  const receipts = fs.existsSync(receiptPath) ? json(receiptPath) : {};
  for (const { asset, owners } of resolved) await retry(async () => {
    await checked(sb.storage.from('media').upload(asset.path, fs.readFileSync(asset.file), { cacheControl: '31536000', upsert: true, contentType: 'audio/mpeg' }), 'Storage upload');
    const publicUrl = sb.storage.from('media').getPublicUrl(asset.path).data.publicUrl;
    const update = { [asset.url_field]: publicUrl };
    if (['question_groups', 'listening_lessons'].includes(asset.owner_table)) update.audio_duration_seconds = Math.round(asset.duration_seconds);
    const rows = await checked(sb.from(asset.owner_table).update(update).in('id', owners.map(o => o.id)).select('id'), 'Update source audio');
    if (rows?.length !== owners.length) throw new Error('Source update did not affect every intended row');
    await checked(sb.from('media_assets').upsert({ bucket: 'media', path: asset.path, kind: 'audio',
      owner_table: asset.owner_table, owner_id: owners.length === 1 ? owners[0].id : asset.owner_key.lemma,
      duration_seconds: asset.duration_seconds, bytes: asset.bytes, voice: asset.voice, generator: asset.generator }, { onConflict: 'bucket,path' }), 'Upsert media metadata');
    receipts[asset.path] = { sha256: asset.sha256, url: publicUrl, owner_ids: owners.map(o => o.id), completed_at: new Date().toISOString() };
    save(receiptPath, receipts);
    // Retrying a partial stage is safe: all writes use natural IDs/upsert.
  });
  console.log(JSON.stringify({ uploaded: resolved.length, receipt: receiptPath }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1').replaceAll('/', path.sep)) cli(main);
