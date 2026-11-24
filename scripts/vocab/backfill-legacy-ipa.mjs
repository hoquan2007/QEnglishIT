/**
 * Fill only missing pronunciation fields on existing vocabulary rows.
 * Usage: node --env-file-if-exists=.env.local scripts/vocab/backfill-legacy-ipa.mjs [--execute]
 * The default is a read-only preview. A provenance receipt is written for either mode.
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '../..');
const execute = process.argv.includes('--execute');
if (process.argv.slice(2).some(arg => arg !== '--execute')) {
  throw new Error('Usage: node scripts/vocab/backfill-legacy-ipa.mjs [--execute]');
}

const catalog = [
  { name: 'ipa-dict-us', field: 'ipa_us' },
  { name: 'ipa-dict-uk', field: 'ipa_uk' },
  { name: 'kaikki-simple', field: null },
];

const lemmaKey = text => String(text ?? '').normalize('NFC').trim().toLowerCase();
const usableIpa = text => typeof text === 'string' && text.startsWith('/') && text.endsWith('/')
  && text.length <= 180 && !/[\r\n]/u.test(text);

async function pronunciationIndex() {
  const indexed = new Map();
  for (const source of catalog) {
    const directory = join(scriptDir, 'ipa', source.name);
    const entries = (await readdir(directory)).filter(f => f.endsWith('.json')).sort();
    for (const name of entries) {
      const words = JSON.parse(await readFile(join(directory, name), 'utf8'));
      if (!Array.isArray(words)) throw new Error(`Invalid IPA batch: ${name}`);
      for (const word of words) {
        const key = lemmaKey(word.lemma);
        if (!key) continue;
        const record = indexed.get(key) ?? {};
        for (const field of ['ipa_us', 'ipa_uk']) {
          if (source.field && field !== source.field) continue;
          if (record[field] || !usableIpa(word[field])) continue;
          record[field] = { value: word[field], source: source.name, batch: name };
        }
        indexed.set(key, record);
      }
    }
  }
  return indexed;
}

async function fetchWords(client) {
  const words = [];
  for (let from = 0;; from += 500) {
    const { data, error } = await client.from('vocab_words')
      .select('id,word,pos,lemma,ipa_us,ipa_uk')
      .order('id').range(from, from + 499);
    if (error) throw new Error(`Read vocab_words: ${error.message}`);
    words.push(...data);
    if (data.length < 500) return words;
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Missing Supabase environment configuration');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [index, words] = await Promise.all([pronunciationIndex(), fetchWords(client)]);
  const changes = [];
  for (const word of words) {
    // Exact written-form matching avoids assigning a lemma's IPA to an inflected form.
    const ipa = index.get(lemmaKey(word.word));
    if (!ipa) continue;
    const patch = {};
    const provenance = {};
    for (const field of ['ipa_us', 'ipa_uk']) {
      if (word[field] || !ipa[field]) continue;
      patch[field] = ipa[field].value;
      provenance[field] = { source: ipa[field].source, batch: ipa[field].batch };
    }
    if (Object.keys(provenance).length) changes.push({ id: word.id, patch, provenance });
  }

  const metrics = {
    existingRows: words.length,
    matchedRows: changes.length,
    newIpaUS: changes.filter(x => x.patch.ipa_us).length,
    newIpaUK: changes.filter(x => x.patch.ipa_uk).length,
    initiallyMissingUS: words.filter(x => !x.ipa_us).length,
    initiallyMissingUK: words.filter(x => !x.ipa_uk).length,
  };
  console.log(JSON.stringify({ mode: execute ? 'execute' : 'preview', ...metrics }, null, 2));

  if (execute) {
    for (let offset = 0; offset < changes.length; offset += 20) {
      const batch = changes.slice(offset, offset + 20);
      const results = await Promise.allSettled(batch.map(async item => {
        // UPDATE operates on the existing id, preserving meanings, examples,
        // user edits, and every field outside the missing IPA columns.
        let query = client.from('vocab_words').update(item.patch).eq('id', item.id);
        for (const field of Object.keys(item.patch)) query = query.is(field, null);
        const { data, error } = await query.select('id');
        if (error) throw new Error(`Write vocab_words: ${error.message}`);
        if (data.length !== 1) throw new Error(`IPA update matched ${data.length} rows`);
      }));
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length) throw new Error(`${failures.length} IPA updates failed: ${failures[0].reason.message}`);
      console.log(`Applied ${Math.min(offset + 20, changes.length)}/${changes.length}`);
    }
  }
  const receipt = {
    mode: execute ? 'execute' : 'preview',
    performedAt: new Date().toISOString(),
    metrics,
    notice: 'Pronunciations are automatically sourced and have not received human homograph review.',
    sources: ['ipa-dict-us', 'ipa-dict-uk', 'kaikki-simple'],
    changes,
  };
  const path = join(root, 'content', '_reports', `legacy-ipa-${execute ? 'applied' : 'preview'}.json`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(receipt, null, 2) + '\n');
  console.log(`Provenance report: ${path}`);
}

main().catch(e => { console.error(e.message); process.exitCode = 1; });
