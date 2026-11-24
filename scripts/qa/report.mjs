// Read-only local inventory; no credentials, HTTP requests or report writes.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fetchAll, request } from '../db-ops.mjs';
import { goalMatrix } from './goal-matrix.mjs';

export const sections = ['sources','words','vocab','collections','tests','grammar','reading','listening','speaking','writing','blog','documents','courses','phrases','pronunciation','irregular'];
export const root = join(import.meta.dirname, '../../content');
export function discoverContent(selected = sections) {
  const files = [];
  const walk = dir => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      if (e.name.startsWith('_') || ['raw','headwords','headwords.json'].includes(e.name)) continue;
      const path = join(dir, e.name);
      if (e.isDirectory()) walk(path);
      else if (e.isFile() && e.name.endsWith('.json')) files.push(path);
    }
  };
  for (const s of selected) walk(join(root, s === 'words' ? 'vocab/words' : s === 'collections' ? 'vocab/collections' : s));
  return [...new Set(files)].filter(p => {
    const parts = relative(root,p).replaceAll('\\','/').split('/');
    return parts[0] !== 'vocab' || selected.includes(['words','collections'].includes(parts[1]) ? parts[1] : 'vocab');
  });
}
export function loadContent(paths, only) {
  const entries = [], tests = new Map();
  for (const path of paths) {
    const parts = relative(root,path).replaceAll('\\','/').split('/');
    const section = parts[0] === 'vocab' && ['words','collections'].includes(parts[1]) ? parts[1] : parts[0];
    const json = JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));
    for (const item of Array.isArray(json) ? json : [json]) {
      if (!item || typeof item !== 'object') throw new Error(`${path}: expected object`);
      if (only && (item.slug ?? item.key ?? item.base ?? item.lemma ?? item.word ?? item.phrase) !== only) continue;
      if (section === 'tests' && tests.has(item.slug)) {
        const old = tests.get(item.slug);
        for (const k of ['title','collection','exam_type','level','difficulty','source','sections','tags','duration_minutes']) {
          if (old.item[k] !== undefined && item[k] !== undefined && JSON.stringify(old.item[k]) !== JSON.stringify(item[k])) throw new Error(`${item.slug}: conflicting ${k} across shards`);
        }
        old.item = { ...item, ...old.item, groups: [...old.item.groups,...(item.groups ?? [])] };
        old.paths.push(path);
      } else {
        const entry = { section, paths: [path], item: section === 'tests' ? { ...item, groups: [...(item.groups ?? [])] } : item };
        entries.push(entry);
        if (section === 'tests') tests.set(item.slug,entry);
      }
    }
  }
  return entries;
}
export function report(entries, { fingerprint, validation, mode = 'local files; database/media not verified' } = {}) {
  const totals = {}, answers = {}, exams = {}, words = new Map(), hashes = new Set();
  let questions = 0, duplicates = 0, missingSources = 0;
  for (const { section,item } of entries) {
    totals[section] = (totals[section] ?? 0) + 1;
    if (!item.source && section !== 'sources') missingSources++;
    if (section === 'tests') {
      exams[item.exam_type ?? 'legacy (missing exam_type)'] = (exams[item.exam_type ?? 'legacy (missing exam_type)'] ?? 0) + 1;
      for (const g of item.groups) for (const q of g.questions ?? []) {
        questions++; answers[q.correct_answer] = (answers[q.correct_answer] ?? 0) + 1;
        if (fingerprint) { const hash = fingerprint(q); if (hashes.has(hash)) duplicates++; hashes.add(hash); }
      }
    }
    const ws = section === 'words' ? [item] : section === 'vocab' ? (item.lessons ?? []).flatMap(l => l.words ?? []) : [];
    ws.forEach(w => words.set(`${w.word}|${w.pos ?? ''}`,w));
  }
  const ws = [...words.values()];
  console.log(`QA — ${mode}`);
  console.table(Object.entries(totals).map(([section,items]) => ({ section,items })));
  console.log(JSON.stringify({ questions, uniqueWordPos: ws.length, uniqueLemmas: new Set(ws.map(w => w.lemma ?? w.word.toLowerCase())).size, missingSources, missingIpaUS: ws.filter(w => !w.ipa_us).length, missingIpaUK: ws.filter(w => !w.ipa_uk).length, missingAudioUS: ws.filter(w => !w.audio_us_url).length, missingAudioUK: ws.filter(w => !w.audio_uk_url).length, fewerThanTwoExamples: ws.filter(w => (w.examples?.length ?? 0) < 2).length, duplicateQuestions: fingerprint ? duplicates : 'NOT CHECKED' },null,2));
  console.log('Exam types:',JSON.stringify(exams));
  console.log('Answers (all question types):',JSON.stringify(answers));
  if (validation) console.log(`Validation: ${validation.errors.length} errors, ${validation.warnings.length} warnings`);
}
// Global database inventory, not an inference from the just-imported files.
// Exact counts use HEAD requests; coverage/duplicates use paginated rows.
export async function databaseReport(sb,{ fetchAll,request,fingerprint }) {
  const tables = ['content_sources','tests','question_groups','questions','grammar_topics','grammar_questions','vocab_words','vocab_collections','vocab_lessons','vocab_lesson_words','reading_passages','listening_lessons','speaking_tasks','writing_tasks','courses','course_lessons','blog_posts','documents','phrases','pronunciation_lessons','irregular_verbs'];
  const counts = [];
  for (const table of tables) {
    const { count } = await request(() => sb.from(table).select('*',{ count:'exact',head:true }),`${table} count`);
    if (!Number.isInteger(count)) throw new Error(`${table}: exact count unavailable`);
    counts.push({ table,rows:count });
  }
  const words = await fetchAll(sb,'vocab_words','id,word,pos,lemma,ipa_us,ipa_uk,audio_us_url,audio_uk_url,examples,source_id');
  const tests = await fetchAll(sb,'tests','id,exam_type,is_published,total_questions');
  const questions = await fetchAll(sb,'questions','id,test_id,number,part,question_type,question_text,options,correct_answer,fingerprint');
  const phrases = await fetchAll(sb,'phrases','id,kind');
  const pronunciation = await fetchAll(sb,'pronunciation_lessons','id,slug,symbol,kind,minimal_pairs,audio_url');
  const listening = await fetchAll(sb,'listening_lessons','id,kind,audio_url');
  const reading = await fetchAll(sb,'reading_passages','id,level');
  const grammarQuestions = await fetchAll(sb,'grammar_questions','topic_id,kind');
  const exams = {}, kinds = {}, answers = {}, hashes = new Set();
  let duplicateQuestions = 0;
  for (const t of tests) {
    const type = t.exam_type ?? '(missing)';
    exams[type] ??= { tests:0,published:0,actualQuestions:0 };
    exams[type].tests++; exams[type].published += Number(t.is_published);
  }
  const types = new Map(tests.map(t => [t.id,t.exam_type ?? '(missing)']));
  const partTests = new Map();
  for (const q of questions) {
    if (exams[types.get(q.test_id)]) exams[types.get(q.test_id)].actualQuestions++;
    if (types.get(q.test_id) === 'toeic_part') {
      if (!partTests.has(q.test_id)) partTests.set(q.test_id,new Set());
      partTests.get(q.test_id).add(q.part);
    }
    if ((q.question_type ?? 'mcq') === 'mcq') answers[q.correct_answer] = (answers[q.correct_answer] ?? 0) + 1;
    const hash = fingerprint(q);
    if (hashes.has(hash)) duplicateQuestions++;
    hashes.add(hash);
  }
  phrases.forEach(p => { kinds[p.kind] = (kinds[p.kind] ?? 0) + 1; });
  const partCounts = Object.fromEntries(Array.from({length:7},(_,index) => [
    index + 1,[...partTests.values()].filter(parts => parts.size === 1 && parts.has(index + 1)).length,
  ]));
  const uniquePairs = new Set();
  for (const lesson of pronunciation) for (const pair of lesson.minimal_pairs ?? []) {
    if (typeof pair.a !== 'string' || typeof pair.b !== 'string') continue;
    const [a,b] = [pair.a.normalize('NFC').toLowerCase().trim(),pair.b.normalize('NFC').toLowerCase().trim()].sort();
    if (a && b && a !== b) uniquePairs.add(`${a}\u0000${b}`);
  }
  const soundLessons = pronunciation.filter(p => p.slug.startsWith('ipa-') && ['vowel','diphthong','consonant'].includes(p.kind));
  const pronunciationStats = {
    distinctMinimalPairs:uniquePairs.size,
    distinctIpaSounds:new Set(soundLessons.map(p => p.symbol)).size,
    extensionLessons:{
      stress:pronunciation.filter(p => p.kind === 'stress').length,
      intonation:pronunciation.filter(p => p.kind === 'intonation').length,
      linking:pronunciation.filter(p => p.kind === 'linking').length,
      endings:pronunciation.filter(p => p.slug.startsWith('ending-') || p.slug.startsWith('endings-')).length,
    },
  };
  const grammarCounts = new Map();
  for (const question of grammarQuestions) {
    if (!grammarCounts.has(question.topic_id)) grammarCounts.set(question.topic_id,{ exercise:0,quiz:0 });
    const counter = grammarCounts.get(question.topic_id);
    if (question.kind === 'exercise' || question.kind === 'quiz') counter[question.kind]++;
  }
  const grammar = { qualifiedTopics:[...grammarCounts.values()].filter(n => n.exercise >= 10 && n.quiz >= 10).length };
  const media = {
    pronunciationAudioLessons:new Set(soundLessons.filter(p => p.audio_url).map(p => p.symbol)).size,
    listeningAudioLessons:listening.filter(l => l.audio_url).length,
  };
  const coverage = {
    distinctExplicitLemmas:new Set(words.filter(w => w.lemma).map(w => w.lemma)).size,
    missingLemma:words.filter(w => !w.lemma).length,
    missingIpaUS:words.filter(w => !w.ipa_us).length,
    missingIpaUK:words.filter(w => !w.ipa_uk).length,
    missingAudioUS:words.filter(w => !w.audio_us_url).length,
    missingAudioUK:words.filter(w => !w.audio_uk_url).length,
    fewerThanTwoExamples:words.filter(w => {
      const bilingual = Array.isArray(w.examples) ? w.examples.filter(e => e?.en?.trim?.() && e?.vi?.trim?.()) : [];
      return new Set(bilingual.map(e => e.en.trim().toLowerCase())).size < 2;
    }).length,
    missingWordSources:words.filter(w => !w.source_id).length,
    missingStoredFingerprints:questions.filter(q => !q.fingerprint).length,
    duplicateComputedFingerprints:duplicateQuestions,
    staleStoredFingerprints:questions.filter(q => q.fingerprint && q.fingerprint !== fingerprint(q)).length,
  };
  console.log('QA — GLOBAL DATABASE (live reads; media URL presence only, not audio existence/duration)');
  console.table(counts);
  console.log('Coverage:',JSON.stringify(coverage,null,2));
  console.log('Exam types:',JSON.stringify(exams));
  console.log('Phrase kinds:',JSON.stringify(kinds));
  console.log('MCQ answers:',JSON.stringify(answers));
  console.log('Grammar topics with >=10 exercises and >=10 quiz questions:',grammar.qualifiedTopics);
  const goals = goalMatrix({ counts,coverage,exams,phrases:kinds,pronunciation:pronunciationStats,media,grammar });
  const readingLevels = Object.fromEntries(Object.entries({A2:100,B1:150,B2:150,C1:100})
    .map(([level,target]) => [level,{actual:reading.filter(p => p.level === level).length,target}]));
  const listeningKinds = Object.fromEntries(['bilingual','syllabus'].map(kind => [
    kind,{actual:listening.filter(l => l.kind === kind).length,withAudio:listening.filter(l => l.kind === kind && l.audio_url).length},
  ]));
  console.log('Plan thresholds (verified DB counts; media only URL coverage, not file validity):');
  console.table(goals.metrics);
  console.log('Exam distribution (317 total including two legacy full tests):');
  console.table(goals.examDistribution);
  console.log('TOEIC single-part tests (target 10 each):',JSON.stringify(partCounts));
  console.log('Reading CEFR distribution:',JSON.stringify(readingLevels));
  console.log('Listening lesson types:',JSON.stringify(listeningKinds));
  console.log('Supplemental pronunciation:',JSON.stringify(pronunciationStats.extensionLessons));
  console.log('Vocabulary row quality:');
  console.table(goals.wordQuality);
  console.log('Integrity:',JSON.stringify(goals.integrity));
  return { counts,coverage,exams,partCounts,readingLevels,listeningKinds,phrases:kinds,answers,pronunciation:pronunciationStats,media,grammar,goals };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const rawArgs = process.argv.slice(2), db = rawArgs.includes('--db');
    const args = rawArgs.filter(arg => arg !== '--db'), index = args.indexOf('--only');
    const only = index < 0 ? undefined : args[index + 1];
    if (index >= 0 && (!only || only.startsWith('--'))) throw new Error('--only requires a slug');
    const selected = args.filter((_,i) => index < 0 || (i !== index && i !== index + 1));
    if (selected.some(s => !sections.includes(s))) throw new Error('Unknown report section');
    if (db && (selected.length || only)) throw new Error('--db reports global totals; do not combine with section/slug filters');
    const entries = db ? [] : loadContent(discoverContent(selected.length ? selected : sections),only);
    let fingerprint;
    try { ({ questionFingerprint: fingerprint } = await import('../validate/validate-content.mjs')); } catch { /* explicitly unknown in report */ }
    if (db) {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
      if (!fingerprint) throw new Error('Shared validator required for database fingerprint report');
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{ auth:{ persistSession:false,autoRefreshToken:false } });
      await databaseReport(sb,{ fetchAll,request,fingerprint });
    } else report(entries,{ fingerprint });
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
