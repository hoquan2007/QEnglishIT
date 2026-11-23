/**
 * S0 seed integration contract (no side effects on import):
 *   import { validateContent, questionFingerprint } from './validate/validate-content.mjs';
 *   const { errors, warnings, counts } = await validateContent(paths, options);
 *   if (errors.length) abort BEFORE writing; persist questionFingerprint(q) on questions.
 * paths: a JSON file/directory or array of those; overlapping paths are deduplicated.
 * diagnostics: {code,file,path,message}; counts.questions counts exam rows ONLY
 * (public.questions). exercise_questions / reading_questions are separate.
 * Other counts: merged tests, word rows, unique lemmas and supported sections.
 * No API report writes.
 * options.strict=true upgrades legacy quality/expansion warnings to errors.
 * Only the original, explicitly listed repository files qualify as legacy.
 * options.contentRoot defaults to repository content; sources are loaded from
 * sources/sources.json, or options.sources (array of source records).
 * options.db is OPTIONAL and never created from environment variables:
 *   { questionFingerprints: async (string[]) => [{fingerprint}],
 *     words: async ([{word,pos}]) => [{word,pos}] }
 * Both callbacks receive chunks of <=500, return only existing matches, and must
 * throw on query failure. Matches are errors; callers doing idempotent reseeding
 * must exclude the rows they are replacing in their adapter. No secrets in errors.
 * options.checkAudio=true requires word US audio. options.probeAudio(url, word)
 * must verify existence and return {exists:true,durationSeconds}; no implicit HTTP.
 * Standalone part tests number 1..N; full-test shards must all be passed together.
 * CLI: node scripts/validate/validate-content.mjs [--strict] [--check-audio]
 *      [--json] [--report path | --no-report] content/path [...]
 */
import { createHash } from 'node:crypto';
import { readFile, readdir, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../content');
const LEGACY = new Set([
  'tests/qe-test-01-listening.json', 'tests/qe-test-01-reading.json',
  'tests/qe-test-02-listening.json', 'tests/qe-test-02-reading.json',
  'grammar/batch-a.json', 'grammar/batch-b.json', 'reading/passages.json',
  'listening/lessons.json', 'speaking/tasks.json', 'writing/tasks.json',
  'blog/posts.json', 'documents/docs.json', 'courses/courses.json',
  ...['1000-50-ngay','3000-thong-dung','giao-tiep','ielts','phrases-toeic','toeic-600','toeic-by-part','toeic-levels','vstep'].map(x => `vocab/${x}.json`),
]);
const EXAMS = new Set('toeic_full toeic_mini toeic_listening toeic_reading toeic_part toeic_sw ielts_academic_reading ielts_listening vstep thpt cefr_placement grammar_test vocab_test'.split(' '));
const TYPES = new Set('mcq gap_fill tfng ynng matching short_answer sentence_insert error_identification reorder'.split(' '));
const POS = new Set('n v adj adv prep conj pron det num interj phr'.split(' '));
const VI = /[àáâãèéêìíòóôõùúýăđĩũơưÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐĨŨƠƯ\u1EA0-\u1EF9]/u;
const text = x => typeof x === 'string' && x.trim().length > 0;
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const norm = x => String(x ?? '').normalize('NFC').toLowerCase().replace(/\p{P}/gu, '').replace(/\s+/gu, ' ').trim();
const wordKey = w => `${String(w.word ?? '').normalize('NFC').trim().toLowerCase()}|${w.pos}`;

/** SHA-1 of normalized prompt + '|' + sorted, normalized option texts (JSON array).
 * Keys/order, answer, explanation and metadata are intentionally excluded.
 * Null TOEIC Part 2 prompts use the empty string; option text still distinguishes them.
 */
export function questionFingerprint(q) {
  const options = Array.isArray(q?.options) ? q.options.map(o => norm(o?.text)).sort() : [];
  return createHash('sha1').update(`${norm(q?.question_text)}|${JSON.stringify(options)}`).digest('hex');
}

export async function validateContent(pathsOrPath, options = {}) {
  const root = resolve(options.contentRoot ?? ROOT);
  const result = { errors: [], warnings: [], counts: { files: 0, tests: 0, questions: 0, exercise_questions: 0, reading_questions: 0, words: 0, lemmas: 0 } };
  const emit = (ctx, code, message, quality = false) => {
    result[quality && ctx.legacy && !options.strict ? 'warnings' : 'errors'].push({ code, file: ctx.file, path: ctx.path ?? '$', message });
  };
  const child = (ctx, path) => ({ ...ctx, path: `${ctx.path ?? '$'}.${path}` });
  const required = (item, keys, ctx) => { for (const k of keys) if (!text(item[k])) emit(child(ctx,k), 'required', `${k} must be a nonempty string`); };
  const array = (value, ctx, min = 1) => {
    if (!Array.isArray(value)) { emit(ctx, 'array', 'Expected an array'); return []; }
    if (value.length < min) emit(ctx, 'array_min', `Expected at least ${min} entries`);
    return value;
  };
  const vietnamese = (value, ctx, quality = false) => {
    if (!text(value) || !VI.test(value)) emit(ctx, 'vietnamese', 'Expected nonempty Vietnamese text with diacritics', quality);
  };
  const files = new Set();
  async function discover(path, explicit = false) {
    const file = resolve(path);
    const ctx = {file};
    try {
      const info = await stat(file);
      if (info.isDirectory()) {
        for (const entry of (await readdir(file, {withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
          if (entry.name.startsWith('_') || entry.name === 'raw' || entry.isSymbolicLink() || (file === join(root,'vocab') && entry.name === 'headwords.json')) continue;
          if (entry.isDirectory() || entry.name.endsWith('.json')) await discover(join(file,entry.name));
        }
      } else if (file.endsWith('.json')) files.add(file);
      else if (explicit) emit(ctx, 'file_type', 'Expected a JSON file or content directory');
    } catch { emit(ctx, 'file_read', 'Unable to read input path'); }
  }
  const paths = typeof pathsOrPath === 'string' ? [pathsOrPath] : pathsOrPath;
  if (!Array.isArray(paths) || !paths.length || paths.some(p=>!text(p))) {
    emit({file:root}, 'input', 'Supply a nonempty path or array of paths'); return result;
  }
  for (const path of paths) await discover(path, true);
  const documents = [];
  for (const file of [...files].sort()) {
    const rel = relative(root,file).split(sep).join('/');
    const ctx = {file,path:'$',legacy:LEGACY.has(rel)};
    try {
      const data = await readFile(file);
      if (data.length > 2 * 1024 * 1024) emit(ctx,'file_size','JSON files must be <=2 MiB');
      documents.push({ctx, rel, data:JSON.parse(data.toString('utf8').replace(/^\uFEFF/,''))});
      result.counts.files++;
    } catch { emit(ctx,'json','Unable to read or parse JSON'); }
  }
  const sources = new Map();
  const catalogFile = join(root,'sources/sources.json');
  let catalog = options.sources;
  if (catalog === undefined) {
    const supplied = documents.find(d=>d.rel === 'sources/sources.json');
    if (supplied) catalog = supplied.data;
    else {
      try { catalog = JSON.parse(await readFile(catalogFile,'utf8')); }
      catch (error) { if (error.code !== 'ENOENT') emit({file:catalogFile},'sources_read','Unable to read source catalog'); }
    }
  }
  if (catalog !== undefined) {
    for (const [i,s] of array(catalog,{file:catalogFile},0).entries()) {
      const ctx = {file:catalogFile,path:`$[${i}]`};
      if (!object(s)) { emit(ctx,'object','Expected a source object'); continue; }
      required(s,['key','title','license'],ctx);
      if (sources.has(s.key)) emit(ctx,'duplicate_source',`Duplicate source key: ${s.key}`);
      if (text(s.key)) sources.set(s.key,s);
      if (s.url != null && (!text(s.url) || !/^https?:\/\//i.test(s.url))) emit(child(ctx,'url'),'source_url','Source URL must use HTTP(S)');
    }
  }
  function source(item,ctx) {
    if (item.source == null) { emit(child(ctx,'source'),'source_missing','Missing source reference',true); return; }
    if (!text(item.source)) { emit(child(ctx,'source'),'source_unknown','Invalid source reference'); return; }
    const key = item.source;
    const tatoeba = /^tatoeba:\d+$/.test(key);
    const known = sources.has(key) || (tatoeba && [...sources.keys()].some(k=>k === 'tatoeba' || k.startsWith('tatoeba-')));
    if (!known) emit(child(ctx,'source'),'source_unknown',`Unknown source reference: ${key}`,key === 'original' && ctx.legacy);
  }
  function scan(value,ctx,inQuestion = false) {
    if (typeof value === 'string') {
      // Original TOEIC ads/emails use fictional .example domains as task data.
      // They are not references to copied material. Real external URLs and
      // prohibited brands still fail, including brands inside fictional URLs.
      const urls=value.match(/(?:https?:\/\/|www\.)[^\s<>"')]+/gi)??[];
      const externalUrl=urls.some(raw=>{
        try {return !new URL(raw.startsWith('www.')?`https://${raw}`:raw).hostname.replace(/\.$/,'').endsWith('.example');}
        catch {return true;}
      });
      if (inQuestion && (externalUrl || /(?:anhngu24h|cambridge\s+assessment|\bets\b)/i.test(value))) emit(ctx,'prohibited','Question content contains an external URL or prohibited brand');
      if (value.includes('\uFFFD') || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(value)) emit(ctx,'encoding','Invalid text character');
      return;
    }
    if (Array.isArray(value)) value.forEach((v,i)=>scan(v,child(ctx,`[${i}]`),inQuestion));
    else if (object(value)) for (const [key,v] of Object.entries(value)) {
      if (['passage','passage_vi','transcript','transcript_vi'].includes(key) && typeof v === 'string' && v.length > 6000) emit(child(ctx,key),'text_length',`${key} exceeds 6000 characters`);
      // Asset URLs and source references are metadata, not copied question text.
      if (!['source','audio_url','image_url','file_url'].includes(key)) scan(v,child(ctx,key),inQuestion);
    }
  }
  const fingerprints = new Map();
  const words = new Map();
  const lemmas = new Set();
  const tests = new Map();
  const identities = new Map();
  const irregular = new Map([['be',['am','is','are','was','were','been','being']],['go',['went','gone']],['have',['has','had']],['do',['does','did','done']],['make',['made']],['take',['took','taken']]]);
  for (const d of documents.filter(d=>/^irregular(?:\/|\.)/.test(d.rel))) {
    if (Array.isArray(d.data)) for (const v of d.data) if (object(v) && text(v.base)) irregular.set(v.base.toLowerCase(), [v.past,v.past_participle].filter(text).flatMap(x=>x.split(/[,/|]\s*/)));
  }
  function identity(kind,key,ctx) {
    const id = `${kind}:${key}`;
    if (identities.has(id)) emit(ctx,'duplicate_item',`Duplicate ${kind} identity: ${key}`);
    else identities.set(id,ctx);
  }
  function question(q,ctx,{part,numbered=false,translation=false,fingerprint=false}={}) {
    if (!object(q)) { emit(ctx,'object','Expected a question object'); return; }
    if (fingerprint) result.counts.questions++;
    const type = q.question_type ?? 'mcq';
    if (!TYPES.has(type)) emit(child(ctx,'question_type'),'question_type','Unknown question type');
    if (!([1,2].includes(part) && q.question_text == null)) required(q,['question_text'],ctx);
    if (numbered && (!Number.isInteger(q.number) || q.number < 1)) emit(child(ctx,'number'),'number','Question number must be a positive integer');
    if (q.part !== undefined && q.part !== part) emit(child(ctx,'part'),'question_part','Question part conflicts with group');
    const opts = array(q.options,child(ctx,'options'),['gap_fill','short_answer','reorder'].includes(type)?0:2);
    const keys = new Set();
    for (const [i,o] of opts.entries()) {
      const oc = child(ctx,`options[${i}]`);
      if (!object(o)) { emit(oc,'object','Expected an option object'); continue; }
      required(o,['key','text'],oc);
      if (keys.has(o.key)) emit(oc,'option_key','Option keys must be unique');
      keys.add(o.key);
    }
    required(q,['correct_answer'],ctx);
    if (['gap_fill','short_answer'].includes(type)) {
      const accepted = array(q.answer_data?.accepted,child(ctx,'answer_data.accepted'));
      if (accepted.some(a=>!text(a))) emit(ctx,'accepted','Accepted answers must be nonempty strings');
      const canonical = s => q.answer_data?.case_sensitive ? String(s).trim() : String(s).trim().toLowerCase();
      if (!accepted.some(a=>canonical(a) === canonical(q.correct_answer))) emit(ctx,'accepted_answer','Correct answer must be accepted');
    } else if (type === 'reorder') {
      if (!object(q.answer_data) || !Array.isArray(q.answer_data.order) || !q.answer_data.order.length) emit(ctx,'answer_data','Reorder needs answer_data.order');
    } else if (!keys.has(q.correct_answer)) emit(child(ctx,'correct_answer'),'answer','Correct answer is not an option key');
    if (type === 'tfng' && (opts.length !== 3 || !['T','F','NG'].every(k=>keys.has(k)))) emit(ctx,'tfng_options','tfng options must be T, F, NG');
    if (type === 'ynng' && (opts.length !== 3 || !['Y','N','NG'].every(k=>keys.has(k)))) emit(ctx,'ynng_options','ynng options must be Y, N, NG');
    required(q,['explanation'],ctx);
    vietnamese(q.explanation,child(ctx,'explanation'),true);
    if (translation) vietnamese(q.translation,child(ctx,'translation'));
    if (q.difficulty !== undefined && (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 5)) emit(ctx,'difficulty','Difficulty must be an integer 1..5');
    scan(q,ctx,true);
    if (q.source !== undefined) source(q,ctx);
    if (fingerprint) {
      const fp = questionFingerprint(q);
      if (fingerprints.has(fp)) emit(ctx,'duplicate_question',`Question duplicates ${fingerprints.get(fp).file} ${fingerprints.get(fp).path}`);
      else fingerprints.set(fp,ctx);
      if (q.fingerprint != null && q.fingerprint !== fp) emit(ctx,'fingerprint','Stored fingerprint does not match question');
    }
  }
  function forms(lemma) {
    const set = new Set([lemma,lemma+'s',lemma+'es',lemma+'ed',lemma+'ing',lemma+'er',lemma+'est',...(irregular.get(lemma) ?? [])]);
    if (lemma.endsWith('e')) for (const ending of ['ing','ed','er','est']) set.add(lemma.slice(0,-1)+ending);
    if (/[^aeiou]y$/.test(lemma)) for (const ending of ['ies','ied','ier','iest']) set.add(lemma.slice(0,-1)+ending);
    if (/[^aeiou][aeiou][^aeiouwxy]$/.test(lemma)) for (const ending of ['ed','ing','er','est']) set.add(lemma+lemma.at(-1)+ending);
    return set;
  }
  async function word(w,ctx,reference=false) {
    if (!object(w)) { emit(ctx,'object','Expected a word object'); return; }
    required(w,reference?['word','pos']:['word','pos','meaning_vi'],ctx);
    if (!POS.has(w.pos)) emit(child(ctx,'pos'),'pos','Unknown part of speech');
    if (reference) return;
    result.counts.words++;
    const key = wordKey(w);
    if (words.has(key)) {
      const previous = words.get(key);
      // Historical collections intentionally repeat definitions across lessons.
      emit(ctx,'duplicate_word',`Repeated (word,pos): ${key}`,ctx.legacy && previous.ctx.legacy);
    } else words.set(key,{word:w.word,pos:w.pos,ctx});
    const lemma = text(w.lemma) ? w.lemma.trim().toLowerCase() : String(w.word ?? '').trim().toLowerCase();
    lemmas.add(lemma);
    if (!text(w.lemma)) emit(child(ctx,'lemma'),'lemma','Missing lemma',true);
    // Short glosses such as "cha", "kho", "ga" are valid Vietnamese without
    // diacritics. Do not infer language from accents for a glossary field.
    if (text(w.meaning_vi) && !VI.test(w.meaning_vi) && /\b(?:the|this|that|these|those|is|are|was|were)\b/i.test(w.meaning_vi) && w.meaning_vi.trim().split(/\s+/).length>=5) emit(ctx,'meaning_language','meaning_vi appears to contain an English sentence');
    if (typeof w.meaning_vi === 'string' && [...w.meaning_vi].length > 120) emit(ctx,'meaning_length','meaning_vi exceeds 120 characters');
    const ipaValid = ipa => typeof ipa === 'string' && /^\/[a-zæøðŋœθχβɐ-ʯʰʱʲʷˠˤˈˌːˑ.\s\u0300-\u036f]+\/$/u.test(ipa) && /[a-zæøðŋœθχβɐ-ʯ]/u.test(ipa);
    for (const k of ['ipa_us','ipa_uk']) {
      if (w[k] == null) emit(child(ctx,k),'ipa',`Missing ${k}`,true);
      else if (!ipaValid(w[k])) emit(child(ctx,k),'ipa',`Invalid ${k}`);
    }
    if (w.ipa != null && !ipaValid(w.ipa)) emit(child(ctx,'ipa'),'ipa','Invalid legacy IPA');
    let examples = w.examples;
    if (examples === undefined && ctx.legacy) {
      examples = [{en:w.example_en,vi:w.example_vi}];
      emit(child(ctx,'examples'),'examples_min','Legacy word has fewer than two structured examples',true);
    }
    if (!Array.isArray(examples)) { emit(child(ctx,'examples'),'array','Expected examples array'); examples=[]; }
    if (examples.length < 2 && !(ctx.legacy && w.examples === undefined)) emit(ctx,'examples_min','At least two examples required',true);
    const inflections = forms(lemma);
    for (const [i,e] of examples.entries()) {
      const ec = child(ctx,`examples[${i}]`);
      if (!object(e)) { emit(ec,'object','Expected example object'); continue; }
      required(e,['en','vi'],ec); vietnamese(e.vi,child(ec,'vi'));
      const sentence = ` ${String(e.en ?? '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}'-]+/gu,' ')} `;
      if (![...inflections].some(f=>sentence.includes(` ${f} `))) emit(ec,'example_lemma','Example must contain lemma or an inflection',true);
      if (w.examples !== undefined) source(e,ec);
    }
    source(w,ctx);
    for (const locale of ['us','uk']) {
      const url = w[`audio_${locale}_url`];
      if (!url) { if (options.checkAudio && locale === 'us') emit(ctx,'audio_missing','US word audio required'); continue; }
      if (!text(url)) { emit(ctx,'audio_url','Audio URL must be a string'); continue; }
      if (options.checkAudio || options.probeAudio) {
        if (!options.probeAudio) { emit(ctx,'audio_probe','Provide probeAudio to verify audio existence and duration'); continue; }
        try {
          const media = await options.probeAudio(url,w);
          if (!media?.exists || !Number.isFinite(media.durationSeconds) || media.durationSeconds < .3 || media.durationSeconds > 3) emit(ctx,'audio_invalid','Audio must exist and last 0.3..3 seconds');
        } catch { emit(ctx,'audio_probe','Audio verification failed'); }
      }
    }
  }
  async function collection(c,ctx,reference) {
    result.counts.collections=(result.counts.collections??0)+1;
    required(c,['slug','title','family'],ctx); source(c,ctx); identity('collections',c.slug,ctx);
    for (const [i,l] of array(c.lessons,child(ctx,'lessons')).entries()) {
      const lc = child(ctx,`lessons[${i}]`);
      if (!object(l)) { emit(lc,'object','Expected lesson object'); continue; }
      required(l,['slug','title'],lc); identity(`lessons:${c.slug}`,l.slug,lc);
      const seen = new Set();
      for (const [j,w] of array(l.words,child(lc,'words')).entries()) {
        const wc = child(lc,`words[${j}]`);
        if (object(w)) { const k=wordKey(w); if (seen.has(k)) emit(wc,'duplicate_reference','Duplicate word in lesson'); seen.add(k); }
        await word(w,wc,reference);
      }
    }
  }
  for (const {ctx,rel,data} of documents) {
    scan(data,ctx);
    const section = rel.split('/')[0];
    if (section === 'sources') continue;
    if (section === 'tests') {
      if (!object(data)) { emit(ctx,'object','Expected a test object'); continue; }
      required(data,['slug','title'],ctx); source(data,ctx);
      const expanded = data.exam_type !== undefined || !ctx.legacy || options.strict;
      if (expanded && !EXAMS.has(data.exam_type)) emit(child(ctx,'exam_type'),'exam_type','Missing or unknown exam_type');
      else if (!expanded) emit(child(ctx,'exam_type'),'legacy_exam_type','Legacy test inferred as toeic_full',true);
      const groups = array(data.groups,child(ctx,'groups'));
      const previous = tests.get(data.slug);
      if (previous) {
        for (const k of ['title','collection','exam_type','duration_minutes','difficulty','level','source','sections']) {
          if (previous.data[k] !== undefined && data[k] !== undefined && JSON.stringify(previous.data[k]) !== JSON.stringify(data[k])) emit(ctx,'split_metadata',`Conflicting split-test metadata: ${k}`);
          if (previous.data[k] === undefined && data[k] !== undefined) previous.data[k]=data[k];
        }
        previous.groups.push(...groups.map((g,i)=>({g,ctx:child(ctx,`groups[${i}]`)})));
        previous.ctx.legacy &&= ctx.legacy;
      } else tests.set(data.slug,{data,ctx:{...ctx},groups:groups.map((g,i)=>({g,ctx:child(ctx,`groups[${i}]`)}))});
      continue;
    }
    if (section === 'vocab' && object(data)) { await collection(data,ctx,rel.startsWith('vocab/collections/')); continue; }
    const kind = section === 'vocab' && rel.startsWith('vocab/words/') ? 'words' : section;
    const supported = ['words','grammar','reading','listening','speaking','writing','blog','documents','courses','phrases','pronunciation','irregular'];
    if (!supported.includes(kind)) { emit(ctx,'unsupported','Unrecognized content path or format'); continue; }
    const rows = array(data,ctx);
    if (kind === 'words' && rows.length > 500) emit(ctx,'batch_size','Word batches must have <=500 words');
    for (const [i,r] of rows.entries()) {
      const rc = {...ctx,path:`$[${i}]`};
      if (!object(r)) { emit(rc,'object','Expected content object'); continue; }
      if (kind === 'words') { await word(r,rc); continue; }
      result.counts[kind] = (result.counts[kind] ?? 0)+1;
      source(r,rc);
      const fields = {
        grammar:['slug','title','title_vi','level','category','summary','lecture_md'],
        reading:['slug','title','level','passage_type'], listening:['slug','kind','title','level','topic'],
        speaking:['slug','title','task_type','prompt','sample_answer'], writing:['slug','title','task_type','prompt','sample_answer'],
        blog:['slug','title','excerpt','content_md','category'], documents:['slug','title','description','category'],
        courses:['slug','title','description'], phrases:['kind','phrase','meaning_vi'],
        pronunciation:['slug','symbol','kind','title'], irregular:['base','past','past_participle','meaning_vi'],
      }[kind];
      required(r,fields,rc);
      if (r.slug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.slug)) emit(rc,'slug','Slug must be ASCII kebab-case');
      identity(kind,kind === 'phrases'?`${r.kind}:${r.phrase}`:r.slug ?? r.base,rc);
      if (kind === 'grammar') {
        for (const list of ['exercises','quiz']) {
          const qs = array(r[list],child(rc,list));
          if (qs.length < (ctx.legacy && !options.strict ? (list === 'quiz'?8:6) : 10)) emit(child(rc,list),'grammar_count','Too few grammar questions');
          result.counts.exercise_questions+=qs.length;
          qs.forEach((q,j)=>question(q,child(rc,`${list}[${j}]`)));
        }
      }
      if (kind === 'reading') {
        const paragraphs = array(r.paragraphs,child(rc,'paragraphs'));
        paragraphs.forEach((p,j)=>{ const pc=child(rc,`paragraphs[${j}]`); if (!object(p)) emit(pc,'object','Expected paragraph object'); else { required(p,['en','vi'],pc); vietnamese(p.vi,pc); } });
        if (paragraphs.reduce((n,p)=>n+(typeof p?.en === 'string'?p.en.length:0),0)>6000) emit(rc,'text_length','Passage exceeds 6000 characters');
        const qs = array(r.questions,child(rc,'questions'));
        result.counts.reading_questions+=qs.length;
        qs.forEach((q,j)=>question(object(q)?{...q,question_text:q.q,correct_answer:q.answer}:q,child(rc,`questions[${j}]`)));
      }
      if (kind === 'listening') {
        if (!['bilingual','syllabus'].includes(r.kind)) emit(rc,'listening_kind','Unknown listening kind');
        array(r.segments,child(rc,'segments')).forEach((s,j)=>{const sc=child(rc,`segments[${j}]`);if (!object(s)) emit(sc,'object','Expected segment object');else {required(s,['speaker','en','vi'],sc);vietnamese(s.vi,sc);} });
        if (!text(r.audio_url)) emit(rc,'audio_missing','Listening lesson has no audio yet',true);
      }
      if (kind === 'phrases') {
        if (!['phrasal_verb','idiom','collocation','expression','proverb'].includes(r.kind)) emit(rc,'phrase_kind','Unknown phrase kind');
        array(r.examples,child(rc,'examples'),2).forEach((e,j)=>{const ec=child(rc,`examples[${j}]`);if (!object(e)) emit(ec,'object','Expected example object'); else {required(e,['en','vi'],ec);vietnamese(e.vi,ec);source(e,ec);} });
      }
      if (kind === 'pronunciation') {
        if (!['vowel','diphthong','consonant','stress','intonation','linking'].includes(r.kind)) emit(rc,'pronunciation_kind','Unknown pronunciation kind');
        for (const k of ['example_words','minimal_pairs']) array(r[k],child(rc,k),0);
      }
      if (kind === 'documents' && !text(r.content_md) && !text(r.file_url)) emit(rc,'document_content','Document requires content_md or file_url');
      if (kind === 'courses') for (const [j,l] of array(r.lessons,child(rc,'lessons')).entries()) {
        const lc=child(rc,`lessons[${j}]`);
        if (!object(l)) {emit(lc,'object','Expected course lesson');continue;}
        required(l,['slug','title','lesson_type'],lc); identity(`course-lessons:${r.slug}`,l.slug,lc);
        if (!['article','link','quiz'].includes(l.lesson_type)) emit(lc,'lesson_type','Unknown course lesson type');
        if (l.lesson_type === 'link') required(l,['link_href'],lc); else if (l.lesson_type === 'article') required(l,['content_md'],lc);
      }
    }
  }
  for (const {data:t,ctx,groups} of tests.values()) {
    result.counts.tests++;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.slug)) emit(ctx,'slug','Slug must be ASCII kebab-case');
    const exam = typeof t.exam_type === 'string' ? t.exam_type : 'toeic_full';
    if(t.duration_minutes!==undefined && (!Number.isFinite(t.duration_minutes)||t.duration_minutes<=0)) emit(ctx,'duration','Test duration must be positive');
    if(t.difficulty!==undefined && (!Number.isInteger(t.difficulty)||t.difficulty<1||t.difficulty>5)) emit(ctx,'difficulty','Test difficulty must be an integer 1..5');
    const toeic = exam.startsWith('toeic_') && exam !== 'toeic_sw';
    const entries=[];
    const parts = new Map();
    for (const {g,ctx:gc} of groups) {
      if (!object(g)) {emit(gc,'object','Expected group object');continue;}
      if (!Number.isInteger(g.part) || g.part < (toeic?1:0) || g.part > (toeic?7:20)) emit(gc,'part','Invalid group part');
      const qs=array(g.questions,child(gc,'questions'));
      for(const field of ['passage','passage_vi','transcript','transcript_vi','image_description','instructions']) if(g[field]!=null) scan(g[field],child(gc,field),true);
      parts.set(g.part,(parts.get(g.part)??0)+qs.length);
      if (toeic) {
        const size = {1:1,2:1,3:3,4:3,5:1,6:4}[g.part];
        if (size && qs.length !== size) emit(gc,'group_size',`Part ${g.part} requires ${size} questions per group`);
        if (g.part <= 4) {
          required(g,['transcript'],gc);
          if ([3,4].includes(g.part) && !/(?:^|\n)\s*(?:M\d*|W\d*|N):\s*\S/.test(g.transcript ?? '')) emit(gc,'speaker','Part 3/4 transcript requires speaker labels');
        }
        if (g.part === 1) required(g,['image_description'],gc);
        if ([6,7].includes(g.part)) required(g,['passage'],gc);
        if (g.part === 6) {
          const placeholders = [...String(g.passage??'').matchAll(/-------\((\d+)\)-------/g)].map(m=>Number(m[1])).sort((a,b)=>a-b);
          const numbers=qs.filter(object).map(q=>q.number).sort((a,b)=>a-b);
          if (JSON.stringify(placeholders)!==JSON.stringify(numbers)) emit(gc,'placeholders','Part 6 placeholders must match group question numbers exactly');
        }
      } else if (g.section === 'listening') required(g,['transcript'],gc);
      qs.forEach((q,i)=>{
        const qc=child(gc,`questions[${i}]`);
        question(q,qc,{part:g.part,numbered:true,translation:true,fingerprint:true});
        if(object(q)) {
          entries.push({q,ctx:qc,part:g.part});
          if(toeic && (q.question_type??'mcq')==='mcq') {
            const expected = g.part===2 ? ['A','B','C'] : ['A','B','C','D'];
            if (!Array.isArray(q.options) || q.options.length!==expected.length || !expected.every(k=>q.options.some(o=>o?.key===k))) emit(qc,'toeic_options','TOEIC MCQ option keys/count do not match part');
          }
        }
      });
    }
    entries.sort((a,b)=>a.q.number-b.q.number);
    const expectedCounts={toeic_full:200,toeic_mini:100,toeic_listening:100,toeic_reading:100,toeic_sw:19,thpt:50,vstep:75,ielts_academic_reading:40,ielts_listening:40,cefr_placement:60,grammar_test:40,vocab_test:50};
    const expected=exam==='toeic_part' ? ({1:12,2:30,3:39,4:30,5:40,6:16,7:30}[entries[0]?.part]) : expectedCounts[exam];
    if (expected !== undefined && entries.length !== expected) emit(ctx,'test_count',`${exam} requires ${expected} questions, got ${entries.length}`);
    if (exam==='toeic_part' && parts.size!==1) emit(ctx,'part_test','Standalone part test must contain exactly one part');
    const start=exam==='toeic_reading'?101:1;
    if (entries.some(({q},i)=>q.number!==start+i)) emit(ctx,'numbering',`Question numbers must be unique and continuous from ${start}`);
    if(exam==='toeic_full') {
      const end=[6,31,70,100,130,146,200];
      for(let p=1;p<=7;p++) if(parts.get(p)!==[6,25,39,30,30,16,54][p-1]) emit(ctx,'part_count',`Incorrect Part ${p} question count`);
      for(const e of entries) if (e.q.number <= (end[e.part-2]??0) || e.q.number > end[e.part-1]) emit(e.ctx,'part_number','Full TOEIC question number is outside its part range');
    }
    if (t.total_questions!==undefined && t.total_questions!==entries.length) emit(ctx,'total_questions','Declared total_questions differs from merged count');
    if(t.sections!==undefined) {
      const sections=array(t.sections,child(ctx,'sections'));
      const seen=new Set(); let total=0;
      for(const [i,s] of sections.entries()) {
        const sc=child(ctx,`sections[${i}]`);
        if(!object(s)) {emit(sc,'object','Expected section object');continue;}
        required(s,['key','title'],sc);
        if(seen.has(s.key)) emit(sc,'section_key','Duplicate section key'); seen.add(s.key);
        if(!Number.isInteger(s.count)||s.count<1) emit(sc,'section_count','Section count must be positive'); else total+=s.count;
        if(s.parts!==undefined) {
          const ps=array(s.parts,child(sc,'parts'));
          if(ps.some(p=>!Number.isInteger(p)||!parts.has(p)) || new Set(ps).size!==ps.length) emit(sc,'section_parts','Section parts must be unique existing parts');
          if(entries.filter(e=>ps.includes(e.part)).length!==s.count) emit(sc,'section_count','Section count differs from questions in parts');
        }
      }
      if(total!==entries.length) emit(ctx,'sections_total','Section counts must sum to question count');
    }
    // Balance each option alphabet separately: TOEIC Part 2 has THREE answers,
    // so its target is 1/3 +/- 3%, rather than the impossible 22..28%.
    const alphabets=new Map(); let last,run=0;
    for(const e of entries) {
      if(!['mcq','sentence_insert','error_identification'].includes(e.q.question_type??'mcq')) {last=undefined;run=0;continue;}
      const keys=(Array.isArray(e.q.options)?e.q.options:[]).map(o=>o?.key).sort();
      const id=JSON.stringify(keys); const a=alphabets.get(id)??{keys,answers:[]};a.answers.push(e.q.correct_answer);alphabets.set(id,a);
      run=e.q.correct_answer===last?run+1:1;last=e.q.correct_answer;
      if(run===4) emit(e.ctx,'answer_run','More than three consecutive identical answers',true);
    }
    for(const a of alphabets.values()) if(a.keys.length>=2) for(const key of a.keys) {
      const n=a.answers.filter(x=>x===key).length, total=a.answers.length;
      const low=Math.floor(total*(1/a.keys.length-.03)), high=Math.ceil(total*(1/a.keys.length+.03));
      if(n<low||n>high) emit(ctx,'answer_balance',`Answer ${key}: ${n}/${total} outside balanced range`,true);
    }
  }
  result.counts.lemmas=lemmas.size;
  if (!options.db) result.warnings.push({code:'db_skipped',file:root,path:'$',message:'Database duplicate checks not requested; only local duplicates checked'});
  else {
    for(const [method,values] of [['questionFingerprints',[...fingerprints.keys()]],['words',[...words.values()].map(({word,pos})=>({word,pos}))]]) {
      if(!values.length) continue;
      if(typeof options.db[method]!=='function') {emit({file:root},'db_adapter',`Missing db.${method} callback`);continue;}
      for(let i=0;i<values.length;i+=500) try {
        const matches=await options.db[method](values.slice(i,i+500));
        if(!Array.isArray(matches)) throw new Error('Invalid adapter response');
        for(const match of matches) {
          const ctx=method==='words'?words.get(wordKey(match??{}))?.ctx:fingerprints.get(match?.fingerprint ?? match);
          if(!ctx) {emit({file:root},'db_adapter','Database adapter returned an unrequested match');continue;}
          emit(ctx,method==='words'?'db_duplicate_word':'db_duplicate_question','Content already exists in database');
        }
      } catch {emit({file:root},'db_check','Database duplicate check failed');}
    }
  }
  return result;
}

async function cli() {
  const args=process.argv.slice(2),paths=[],options={}; let json=false,report;
  for(let i=0;i<args.length;i++) {
    const arg=args[i];
    if(arg==='--strict') options.strict=true;
    else if(arg==='--content-root') {if(!args[i+1]||args[i+1].startsWith('--')) throw new Error('--content-root requires a path');options.contentRoot=args[++i];}
    else if(arg==='--check-audio') options.checkAudio=true;
    else if(arg==='--json') json=true;
    else if(arg==='--no-report') report=false;
    else if(arg==='--report') {if(!args[i+1]||args[i+1].startsWith('--')) throw new Error('--report requires a path');report=args[++i];}
    else if(arg==='--help') {console.log('Usage: node scripts/validate/validate-content.mjs [--strict] [--check-audio] [--json] [--content-root path] [--report path|--no-report] <path> [...]');return;}
    else if(arg.startsWith('-')) throw new Error(`Unknown flag: ${arg}`);
    else paths.push(arg);
  }
  if(!paths.length) throw new Error('Supply at least one content path (see --help)');
  const result=await validateContent(paths,options);
  if(json) console.log(JSON.stringify(result,null,2));
  else {
    console.log(`Content validation: ${result.errors.length} errors, ${result.warnings.length} warnings`);
    console.log(JSON.stringify(result.counts));
    for(const [label,rows] of [['ERROR',result.errors],['WARN',result.warnings]]) {
      const grouped={};for(const d of rows) grouped[d.code]=(grouped[d.code]??0)+1;
      console.log(`${label} counts: ${JSON.stringify(grouped)}`);
      for(const d of rows.slice(0,50)) console.log(`${label} ${d.code} ${d.file} ${d.path}: ${d.message}`);
      if(rows.length>50) console.log(`${label}: ${rows.length-50} more diagnostics omitted; see full report.`);
    }
  }
  if(report!==false) {
    const path=resolve(report??join(ROOT,'_reports',`${new Date().toISOString().slice(0,10)}.md`));
    const escape=s=>String(s).replace(/[\r\n|]/g,' ');
    const body=['# Content validation',`\n${result.errors.length} errors; ${result.warnings.length} warnings.`, '\n```json',JSON.stringify(result.counts,null,2),'```','\n| Severity | Code | File | Location | Detail |','|---|---|---|---|---|',...['errors','warnings'].flatMap(severity=>result[severity].map(d=>`| ${severity} | ${[d.code,d.file,d.path,d.message].map(escape).join(' | ')} |`)),''].join('\n');
    await mkdir(dirname(path),{recursive:true}); await writeFile(path,body,'utf8');
    if(!json) console.log(`Report: ${path}`);
  }
  if(result.errors.length) process.exitCode=1;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  cli().catch(error=>{console.error(error.message);process.exitCode=1;});
}
