// npm run seed -- [sections] [--dry-run] [--only slug] [--strict]
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { sections, root, discoverContent, loadContent, report, databaseReport } from './qa/report.mjs';

const pick = (r, keys) => Object.fromEntries(keys.split(' ').filter(k => r[k] !== undefined).map(k => [k,r[k]]));
const wordFields = 'word pos ipa meaning_vi definition_en example_en example_vi cefr image_url lemma ipa_us ipa_uk audio_us_url audio_uk_url syllables stress frequency_rank word_family synonyms antonyms collocations examples topics lists register reviewed';
const simple = {
  sources: ['content_sources','key title url license attribution notes','key'],
  words: ['vocab_words',wordFields,'word,pos'],
  phrases: ['phrases','kind phrase meaning_vi definition_en examples level topics audio_url','kind,phrase'],
  pronunciation: ['pronunciation_lessons','slug symbol kind title description_md example_words minimal_pairs practice_sentences audio_url sort_order','slug'],
  irregular: ['irregular_verbs','base past past_participle meaning_vi ipa level','base'],
  reading: ['reading_passages','slug title level passage_type paragraphs questions vocabulary sort_order','slug'],
  listening: ['listening_lessons','slug kind title level topic segments audio_url audio_duration_seconds sort_order','slug'],
  speaking: ['speaking_tasks','slug task_type title prompt image_description prep_seconds response_seconds sample_answer tips_md sort_order','slug'],
  writing: ['writing_tasks','slug task_type title prompt keywords image_description time_minutes sample_answer tips_md sort_order','slug'],
  blog: ['blog_posts','slug title excerpt content_md cover_url category tags','slug'],
  documents: ['documents','slug title description category file_type file_url content_md','slug'],
};

export async function request(factory,label) {
  for (let attempt = 0;;attempt++) {
    try {
      const result = await factory();
      if (result.error) throw Object.assign(new Error(result.error.message),result.error,{ status:result.status });
      return result;
    } catch (error) {
      const network = /fetch failed|network|ECONNRESET|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|socket|timeout/i.test(`${error.message} ${error.details ?? ''} ${error.cause?.code ?? ''}`) || [502,503,504].includes(error.status);
      if (!network || attempt >= 3) throw new Error(`${label}: ${error.message}`,{ cause:error });
      console.warn(`${label}: network retry ${attempt + 1}/3`);
      await new Promise(resolve => setTimeout(resolve,250 * 2 ** attempt));
    }
  }
}
export async function fetchAll(sb,table,columns = '*',filter = q => q) {
  const rows = [];
  for (let offset = 0;;offset += 500) {
    const { data } = await request(() => filter(sb.from(table).select(columns)).order(table === 'irregular_verbs' ? 'base' : 'id').range(offset,offset + 499),`${table} read`);
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export async function batch(sb,table,rows,onConflict = 'slug',select = 'id') {
  // Keep absent fields absent: mixed enriched/legacy row shapes must never
  // cause PostgREST to NULL omitted fields in a bulk upsert.
  const shapes = new Map(), written = [];
  for (const row of rows) {
    const shape = Object.keys(row).sort().join('|');
    if (!shapes.has(shape)) shapes.set(shape,[]);
    shapes.get(shape).push(row);
  }
  for (const group of shapes.values()) for (let i = 0;i < group.length;i += 500) {
    const { data } = await request(() => sb.from(table).upsert(group.slice(i,i + 500),{ onConflict,defaultToNull:false }).select(select),`${table} upsert`);
    written.push(...data);
    console.log(`✓ ${table}: ${Math.min(i + 500,group.length)}/${group.length}`);
  }
  return written;
}
function mapper(sources) {
  return (r,fields,parent) => {
    const row = pick(r,fields), source = r.source ?? parent;
    if (source != null) {
      if (!sources.has(source)) throw new Error(`Unknown source: ${source}`);
      row.source_id = sources.get(source);
    }
    return row;
  };
}
export async function seedTests(sb,entries,map,fingerprint) {
  for (const { item:t } of entries) {
    const [old] = await fetchAll(sb,'tests','id,slug,is_published',q => q.eq('slug',t.slug));
    const id = old?.id ?? randomUUID();
    const oldGroups = old ? await fetchAll(sb,'question_groups','id,group_order',q => q.eq('test_id',id)) : [];
    const oldQs = old ? await fetchAll(sb,'questions','id,number,group_id',q => q.eq('test_id',id)) : [];
    const numbers = new Map(oldQs.map(q => [q.number,q])), used = new Set();
    const groups = [...t.groups].sort((a,b) => a.part - b.part || a.questions[0].number - b.questions[0].number);
    const gs = groups.map((g,i) => {
      const ids = new Set(g.questions.map(q => numbers.get(q.number)?.group_id).filter(Boolean));
      if (ids.size > 1) throw new Error(`${t.slug}: grouping would merge existing IDs; reconcile manually`);
      const candidates = oldGroups.filter(g => g.group_order === i + 1 && !used.has(g.id));
      if (!ids.size && candidates.length > 1) throw new Error(`${t.slug}: ambiguous existing group order ${i + 1}`);
      const gid = [...ids][0] ?? candidates[0]?.id ?? randomUUID();
      if (used.has(gid)) throw new Error(`${t.slug}: grouping would split an existing ID; reconcile manually`);
      used.add(gid);
      return { ...map(g,'part passage passage_vi transcript transcript_vi image_url image_description audio_url section instructions audio_duration_seconds',t.source),id:gid,test_id:id,group_order:i + 1 };
    });
    const row = { ...map(t,'slug title collection description duration_minutes sort_order exam_type level difficulty cefr tags sections'),id,total_questions:new Set([...oldQs.map(q => q.number),...groups.flatMap(g => g.questions.map(q => q.number))]).size };
    // Preserve existing publication; new tests are always drafts, regardless
    // of JSON flags. Publishing requires the separate admin review workflow.
    if (!old) row.is_published = false;
    await batch(sb,'tests',[row]);
    // Group PK is the conflict key; no unique(test_id,group_order) required.
    // UUIDs are assigned before retrying, so uncertain responses are replayable.
    await batch(sb,'question_groups',gs,'id');
    await batch(sb,'questions',groups.flatMap((g,i) => g.questions.map(q => ({ ...map(q,'number question_text options correct_answer explanation translation tags question_type answer_data difficulty skill_tags',g.source ?? t.source),test_id:id,group_id:gs[i].id,part:g.part,fingerprint:fingerprint(q) }))),'test_id,number');
    console.log(`✓ ${t.slug}: publication ${old ? 'preserved' : 'draft'}; omitted rows retained`);
  }
}
async function seedGrammar(sb,entries,map) {
  for (const { item:t } of entries) {
    const [row] = await batch(sb,'grammar_topics',[map(t,'slug title title_vi level category difficulty sort_order summary lecture_md examples tips_md')]);
    const existing = await fetchAll(sb,'grammar_questions','id,kind,sort_order',q => q.eq('topic_id',row.id));
    const qs = ['exercises','quiz'].flatMap(key => (t[key] ?? []).map((q,i) => {
      const kind = key === 'quiz' ? 'quiz' : 'exercise', matches = existing.filter(r => r.kind === kind && r.sort_order === i);
      if (matches.length > 1) throw new Error(`${t.slug}: ambiguous ${kind}/${i}`);
      return { ...map(q,'question_text options correct_answer explanation',t.source),id:matches[0]?.id ?? randomUUID(),topic_id:row.id,kind,sort_order:i };
    }));
    await batch(sb,'grammar_questions',qs,'id');
  }
}
export async function seedCollections(sb,entries,map,legacy) {
  // Load once, then resolve references locally rather than one request/word.
  const current = await fetchAll(sb,'vocab_words');
  const words = new Map(current.map(w => [`${w.word}|${w.pos ?? ''}`,w]));
  for (const { item:c } of entries) {
    const [col] = await batch(sb,'vocab_collections',[map(c,'slug family title description level color sort_order')]);
    for (const [i,l] of c.lessons.entries()) {
      const [lesson] = await batch(sb,'vocab_lessons',[{ ...map(l,'slug title title_vi day_number',c.source),collection_id:col.id,sort_order:l.sort_order ?? i + 1 }],'collection_id,slug');
      const refs = [...new Map(l.words.map(w => [`${w.word.trim()}|${w.pos ?? ''}`,w])).values()];
      if (legacy) {
        const payload = refs.map(w => {
          const r = map({ ...w,word:w.word.trim(),pos:w.pos ?? '' },wordFields,l.source ?? c.source);
          const old = words.get(`${r.word}|${r.pos}`);
          // Legacy collections only fill missing values; never overwrite any
          // existing enrichment, review, pronunciation or provenance fields.
          return old ? Object.fromEntries(Object.entries(r).filter(([k]) => ['word','pos'].includes(k) || old[k] == null)) : r;
        });
        const written = await batch(sb,'vocab_words',payload,'word,pos','*');
        written.forEach(w => words.set(`${w.word}|${w.pos ?? ''}`,w));
      }
      const links = refs.map((w,i) => {
        const word = words.get(`${w.word.trim()}|${w.pos ?? ''}`);
        if (!word) throw new Error(`${c.slug}/${l.slug}: unresolved word ${w.word}/${w.pos}; seed words first`);
        return { lesson_id:lesson.id,word_id:word.id,sort_order:i };
      });
      await batch(sb,'vocab_lesson_words',links,'lesson_id,word_id');
    }
  }
}
async function seedCourses(sb,entries,map) {
  for (const { item:c } of entries) {
    const [course] = await batch(sb,'courses',[map(c,'slug title description target_score cover_url sort_order')]);
    await batch(sb,'course_lessons',c.lessons.map((l,i) => ({ ...map(l,'slug title lesson_type content_md link_href video_url duration_minutes',c.source),course_id:course.id,sort_order:l.sort_order ?? i + 1 })),'course_id,slug');
  }
}
function markSeeded(entries,only) {
  const path = join(root,'_manifest.json'), manifest = existsSync(path) ? JSON.parse(readFileSync(path,'utf8')) : {};
  for (const e of entries) for (const p of e.paths) {
    const name = relative(root,p).replaceAll('\\','/').replace(/\.json$/,'');
    manifest[only ? `${name}#${only}` : name] = 'seeded';
  }
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary,`${JSON.stringify(manifest,null,2)}\n`);
  renameSync(temporary,path);
}
export async function main(args = process.argv.slice(2)) {
  const selected = []; let dryRun = false, only, strict = false;
  for (let i = 0;i < args.length;i++) {
    const arg = args[i];
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--strict') strict = true;
    else if (arg === '--only') { only = args[++i]; if (!only || only.startsWith('--')) throw new Error('--only requires a slug'); }
    else if (sections.includes(arg)) selected.push(arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  const entries = loadContent(discoverContent(selected.length ? selected : sections),only);
  if (!entries.length) throw new Error('No matching content');
  const paths = [...new Set(entries.flatMap(e => e.paths))];
  const { validateContent,questionFingerprint } = await import('./validate/validate-content.mjs');
  const validation = await validateContent(paths,{ contentRoot:root,strict,only,writeReport:false });
  if (!Array.isArray(validation.errors) || !Array.isArray(validation.warnings) || !validation.counts) throw new Error('Expected validator {errors,warnings,counts}');
  // Full diagnostics are the one permitted local dry-run artifact. Never write
  // the manifest or contact the database during a dry-run.
  const reportDir = join(root,'_reports');
  mkdirSync(reportDir,{ recursive:true });
  const reportPath = join(reportDir,`seed-${new Date().toISOString().replaceAll(':','-')}-${process.pid}.json`);
  writeFileSync(reportPath,`${JSON.stringify({ mode:dryRun ? 'dry-run' : 'preflight',paths,only:only ?? null,...validation },null,2)}\n`);
  const diagnostics = [...validation.errors.map(detail => ({ severity:'ERROR',detail })),...validation.warnings.map(detail => ({ severity:'WARN',detail }))];
  for (const { severity,detail } of diagnostics.slice(0,50)) console[severity === 'ERROR' ? 'error' : 'warn'](severity,JSON.stringify(detail));
  if (diagnostics.length > 50) console.warn(`${diagnostics.length - 50} additional diagnostics omitted from console.`);
  console.log(`Full validation report: ${reportPath}`);
  console.log('Validator counts:',JSON.stringify(validation.counts));
  report(entries,{ fingerprint:questionFingerprint,validation,mode:dryRun ? 'dry-run; database/media not verified' : 'preflight' });
  if (validation.errors.length) throw new Error(`Validation failed: ${validation.errors.length} errors; nothing written`);
  if (dryRun) { console.log('Dry-run complete: no credentials required, no client, no database/manifest writes; diagnostics report saved.'); return; }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{ auth:{ persistSession:false,autoRefreshToken:false } });
  // Check ALL old questions, including migration-era NULL fingerprints, before
  // any write. Same test+number is an update, every other owner is a collision.
  if (entries.some(e => e.section === 'tests')) {
    const qs = await fetchAll(sb,'questions','test_id,number,fingerprint,question_text,options');
    const tests = await fetchAll(sb,'tests','id,slug'), slugs = new Map(tests.map(t => [t.id,t.slug]));
    const hashes = new Map();
    for (const q of qs) {
      const hash = q.fingerprint ?? questionFingerprint(q);
      if (!hashes.has(hash)) hashes.set(hash,new Set());
      hashes.get(hash).add(`${slugs.get(q.test_id)}:${q.number}`);
    }
    for (const { item:t } of entries.filter(e => e.section === 'tests')) for (const g of t.groups) for (const q of g.questions) {
      const owners = hashes.get(questionFingerprint(q));
      if (owners && [...owners].some(owner => owner !== `${t.slug}:${q.number}`)) throw new Error(`DB fingerprint collision ${t.slug}/${q.number}; nothing written`);
    }
  }
  const sources = new Map((await fetchAll(sb,'content_sources','id,key')).map(s => [s.key,s.id]));
  const known = new Set([...sources.keys(),...entries.filter(e => e.section === 'sources').map(e => e.item.key)]);
  const check = value => {
    if (!value || typeof value !== 'object') return;
    if (value.source && !known.has(value.source) && !(value.en && /^tatoeba:\d+$/.test(value.source) && [...known].some(k => k === 'tatoeba' || k.startsWith('tatoeba-')))) throw new Error(`Unknown source ${value.source}; seed sources first; nothing written`);
    Object.values(value).forEach(check);
  };
  entries.forEach(e => check(e.item));
  for (const section of sections) {
    const items = entries.filter(e => e.section === section);
    if (!items.length) continue;
    const map = mapper(sources);
    if (section === 'tests') await seedTests(sb,items,map,questionFingerprint);
    else if (section === 'grammar') await seedGrammar(sb,items,map);
    else if (['vocab','collections'].includes(section)) await seedCollections(sb,items,map,section === 'vocab');
    else if (section === 'courses') await seedCourses(sb,items,map);
    else {
      const [table,fields,conflict] = simple[section];
      const rows = items.map(({ item }) => {
        const row = section === 'sources' ? pick(item,fields) : map(item,fields);
        if (section === 'words') { row.word = row.word.trim(); if (row.ipa_us !== undefined) row.ipa = row.ipa_us; }
        return row;
      });
      const written = await batch(sb,table,rows,conflict,section === 'sources' ? 'id,key' : section === 'irregular' ? 'base' : 'id');
      if (section === 'sources') written.forEach(s => sources.set(s.key,s.id));
    }
  }
  markSeeded(entries,only);
  report(entries,{ fingerprint:questionFingerprint,validation,mode:'successfully seeded selection; not whole-database totals' });
  await databaseReport(sb,{ fetchAll,request,fingerprint:questionFingerprint });
  console.log('Done. Manifest marked seeded only after all selected writes succeeded.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.message);process.exitCode = 1; });
