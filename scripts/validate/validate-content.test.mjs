import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { validateContent, questionFingerprint } from './validate-content.mjs';

const SCRIPT=fileURLToPath(new URL('./validate-content.mjs',import.meta.url));
const sources=[{key:'original',title:'QEnglishIT original',license:'Original (QEnglishIT)'}];
async function fixture(t) {
  const root=await mkdtemp(join(tmpdir(),'qe-validation-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const save=async(path,data,raw=false)=>{const file=join(root,path);await mkdir(dirname(file),{recursive:true});await writeFile(file,raw?data:JSON.stringify(data));return file;};
  await save('sources/sources.json',sources);
  return {root,save,validate:(paths=root,options={})=>validateContent(paths,{contentRoot:root,...options})};
}
function q(number,part=5) {
  const keys=part===2?['A','B','C']:['A','B','C','D'];
  return {number,question_text:part===2?null:`Which original item ${number} is correct?`,options:keys.map(key=>({key,text:`Item ${number} option ${key}`})),correct_answer:keys[(number-1)%keys.length],explanation:'Đây là đáp án đúng.',translation:'Câu hỏi và đáp án được dịch đầy đủ.'};
}
function partTest() {
  return {slug:'qe-p5-001',title:'Original Part 5',exam_type:'toeic_part',source:'original',groups:Array.from({length:40},(_,i)=>({part:5,questions:[q(i+1)]}))};
}
function fullTest() {
  const groups=[];let number=1;
  for (const [i,count] of [6,25,39,30,30,16,54].entries()) {
    const part=i+1,size=({1:1,2:1,3:3,4:3,5:1,6:4,7:3})[part];
    for(let n=0;n<count;n+=size) {
      const questions=Array.from({length:Math.min(size,count-n)},()=>q(number++,part));
      groups.push({part,questions,...(part<=4?{transcript:part>=3?'M: This is an original conversation.\nW: Here is the reply.':'Original spoken options.'}:{}),...(part===1?{image_description:'An original office photo.'}:{}),...(part===6?{passage:questions.map(q=>`-------(${q.number})-------`).join(' ')}:{}),...(part===7?{passage:`Original reading passage ${n}`}:{})});
    }
  }
  return {slug:'qe-full-003',title:'Original full test',exam_type:'toeic_full',source:'original',groups};
}
function word(overrides={}) {
  return {word:'throughput',lemma:'throughput',pos:'n',meaning_vi:'thông lượng',ipa_us:'/ˈθruːpʊt/',ipa_uk:'/ˈθruːpʊt/',source:'original',examples:[{en:'Our throughput improved today.',vi:'Thông lượng của chúng tôi đã tăng hôm nay.',source:'original'},{en:'The team measured throughput yesterday.',vi:'Nhóm đã đo thông lượng hôm qua.',source:'original'}],...overrides};
}
const has=(r,code)=>r.errors.some(d=>d.code===code);

test('fingerprint is deterministic, punctuation/case/order invariant and content sensitive',()=>{
  const a={question_text:' Hello, WORLD! ',options:[{key:'A',text:'Yes.'},{key:'B',text:'No!'}]};
  const b={question_text:'hello world',options:[{key:'Z',text:'NO'},{key:'X',text:'yes'}],correct_answer:'X'};
  assert.equal(questionFingerprint(a),questionFingerprint(b));
  assert.equal(questionFingerprint(a),createHash('sha1').update('hello world|["no","yes"]').digest('hex'));
  assert.notEqual(questionFingerprint({...a,question_text:'Goodbye'}),questionFingerprint(a));
  assert.notEqual(questionFingerprint({options:[{text:'First answer'}]}),questionFingerprint({options:[{text:'Second answer'}]}));
});

test('standalone Part 5 numbers 1..40 pass strict validation; overlapping inputs are deduplicated',async t=>{
  const f=await fixture(t),file=await f.save('tests/toeic_part/qe-p5-001.json',partTest());
  const r=await f.validate([file,join(f.root,'tests')],{strict:true});
  assert.deepEqual(r.errors,[]);assert.equal(r.counts.tests,1);assert.equal(r.counts.questions,40);assert.equal(r.counts.files,1);
  assert.ok(r.warnings.some(d=>d.code==='db_skipped'));
});

test('full test shards merge by slug before count and numbering checks',async t=>{
  const f=await fixture(t),full=fullTest();
  const l=await f.save('tests/toeic_full/qe-full-003-listening.json',{...full,groups:full.groups.filter(g=>g.part<=4)});
  const r=await f.save('tests/toeic_full/qe-full-003-reading.json',{...full,groups:full.groups.filter(g=>g.part>=5)});
  const merged=await f.validate([r,l]);assert.deepEqual(merged.errors,[]);assert.equal(merged.counts.questions,200);assert.equal(merged.counts.tests,1);
  assert.ok(has(await f.validate(l),'test_count'));
  await f.save('tests/toeic_full/qe-full-003-reading.json',{...full,title:'Conflicting title',groups:full.groups.filter(g=>g.part>=5)});
  assert.ok(has(await f.validate([l,r]),'split_metadata'));
});

test('full-test errors cover part boundaries, group sizes, media text, and placeholders',async t=>{
  const f=await fixture(t),full=fullTest();
  delete full.groups[0].image_description;delete full.groups[0].transcript;
  full.groups.find(g=>g.part===3).transcript='There are no speaker labels.';
  full.groups.find(g=>g.part===6).passage='-------(999)-------';
  full.groups.find(g=>g.part===3).questions.pop();
  full.groups.find(g=>g.part===5).questions[0].number=7;
  await f.save('tests/toeic_full/bad.json',full);
  const r=await f.validate();
  for(const code of ['required','speaker','placeholders','group_size','part_count','part_number','numbering','test_count']) assert.ok(has(r,code),code);
});

test('legacy metadata omissions warn, but broken options, numbering, JSON and groups remain errors',async t=>{
  const f=await fixture(t),full=fullTest();delete full.exam_type;delete full.source;
  const file=await f.save('tests/qe-test-01-listening.json',full);
  let r=await f.validate(file);assert.deepEqual(r.errors,[]);assert.ok(r.warnings.some(d=>d.code==='source_missing'));
  full.groups[0].questions[0].correct_answer='Z';full.groups[0].questions[0].number=2;
  await f.save('tests/qe-test-01-listening.json',full);
  r=await f.validate(file);assert.ok(has(r,'answer'));assert.ok(has(r,'numbering'));
  assert.ok(has(await f.validate(file,{strict:true}),'exam_type'));
  await f.save('tests/qe-test-01-listening.json','{',true);assert.ok(has(await f.validate(file),'json'));
});

test('new content cannot opt into legacy by omitting exam_type or source',async t=>{
  const f=await fixture(t),data=partTest();delete data.exam_type;delete data.source;
  await f.save('tests/toeic_part/new.json',data);
  const r=await f.validate();assert.ok(has(r,'exam_type'));assert.ok(has(r,'source_missing'));
});

test('malformed nested records produce actionable diagnostics instead of throwing',async t=>{
  const f=await fixture(t);
  await f.save('tests/malformed.json',{slug:'broken',title:'Broken',exam_type:'toeic_part',source:'original',groups:[null,{part:5,questions:[null,{number:1,question_text:'text',options:[null,{key:'A',text:'x'},{key:'A',text:'y'}],correct_answer:'Z',explanation:'',translation:''}]}]});
  const r=await f.validate();assert.ok(has(r,'object'));assert.ok(has(r,'option_key'));assert.ok(has(r,'answer'));
  assert.ok(r.errors.every(d=>typeof d.file==='string'&&typeof d.path==='string'&&typeof d.message==='string'));
});

test('duplicates, bad stored fingerprints, answer imbalance and long answer runs fail new batches',async t=>{
  const f=await fixture(t),data=partTest();
  data.groups[1].questions[0]={...data.groups[0].questions[0],number:2};
  data.groups[0].questions[0].fingerprint='wrong';
  data.groups.forEach(g=>g.questions[0].correct_answer='A');
  await f.save('tests/toeic_part/bad.json',data);
  const r=await f.validate();for(const code of ['duplicate_question','fingerprint','answer_balance','answer_run']) assert.ok(has(r,code),code);
});

test('gap fill accepts text answers; invalid accepted answers and tfng keys fail',async t=>{
  const f=await fixture(t),data={slug:'ielts-original',title:'Original IELTS',exam_type:'ielts_academic_reading',source:'original',groups:[{part:1,section:'reading',questions:Array.from({length:40},(_,i)=>({...q(i+1),question_type:'gap_fill',options:[],correct_answer:'reception',answer_data:{accepted:['Reception'],case_sensitive:false}}))}]};
  const file=await f.save('tests/ielts/original.json',data);
  assert.deepEqual((await f.validate(file)).errors,[]);
  data.groups[0].questions[0].answer_data.accepted=[];
  data.groups[0].questions[1]={...q(2),question_type:'tfng'};
  await f.save('tests/ielts/original.json',data);
  const r=await f.validate(file);assert.ok(has(r,'array_min'));assert.ok(has(r,'tfng_options'));
});

test('source catalogs reject unknown keys and duplicates; Tatoeba sentence references resolve',async t=>{
  const f=await fixture(t);
  const data=word();data.examples[0].source='tatoeba:12345';
  const file=await f.save('vocab/words/batch.json',[data]);
  assert.ok(has(await f.validate(file),'source_unknown'));
  await f.save('sources/sources.json',[...sources,{key:'tatoeba-2026-11',title:'Tatoeba',license:'CC BY 2.0 FR'}]);
  assert.deepEqual((await f.validate(file)).errors,[]);
  await f.save('sources/sources.json',[...sources,...sources]);assert.ok(has(await f.validate(file),'duplicate_source'));
});

test('IPA Greek symbols, complete Vietnamese accents, and short unaccented glosses are accepted',async t=>{
  const f=await fixture(t);
  const rows=['/ˈθruːpʊt/','/helθ/','/ˈbændwɪdθ/','/βaχ/'].map((ipa,i)=>word({word:`term${i}`,lemma:`term${i}`,meaning_vi:['cha','ba','kho','ga'][i],ipa_us:ipa,ipa_uk:ipa,examples:[{en:`A term${i} example.`,vi:'Bà và bé.',source:'original'},{en:`Another term${i} example.`,vi:'Chú và dì.',source:'original'}]}));
  await f.save('vocab/words/batch.json',rows);assert.deepEqual((await f.validate()).errors,[]);
  rows[0].ipa_us='/123/';rows[1].ipa_uk='/😀/';rows[2].ipa_us='helθ';
  await f.save('vocab/words/batch.json',rows);assert.equal((await f.validate()).errors.filter(d=>d.code==='ipa').length,3);
});

test('word validation catches duplicate natural keys, malformed examples, and substring false matches',async t=>{
  const f=await fixture(t),data=word({word:'go',lemma:'go',examples:[{en:'The goal is clear.',vi:'Mục tiêu rất rõ.',source:'original'},{en:'They went home.',vi:'Họ đã về nhà.',source:'original'}]});
  await f.save('vocab/words/batch.json',[data,{...data,pos:'invalid'}]);
  const r=await f.validate();assert.ok(has(r,'example_lemma'));assert.ok(has(r,'pos'));
  await f.save('vocab/words/batch.json',[word(),word()]);assert.ok(has(await f.validate(),'duplicate_word'));
});

test('regular spelling changes and supplied irregular forms validate examples',async t=>{
  const f=await fixture(t);
  await f.save('irregular/verbs.json',[{base:'bring',past:'brought',past_participle:'brought',meaning_vi:'mang đến',source:'original'}]);
  const pairs=[['study','studied'],['make','making'],['stop','stopped'],['bring','brought']];
  await f.save('vocab/words/batch.json',pairs.map(([lemma,form])=>word({word:lemma,lemma,examples:[{en:`We ${form} yesterday.`,vi:'Chúng tôi đã thực hiện hôm qua.',source:'original'},{en:`They ${form} too.`,vi:'Họ cũng đã làm vậy.',source:'original'}]})));
  assert.deepEqual((await f.validate()).errors,[]);
});

test('audio probes enforce real existence and duration only when requested',async t=>{
  const f=await fixture(t);await f.save('vocab/words/batch.json',[word({audio_us_url:'https://media.example/word.mp3'})]);
  assert.deepEqual((await f.validate()).errors,[]);
  assert.ok(has(await f.validate(undefined,{checkAudio:true}),'audio_probe'));
  assert.ok(has(await f.validate(undefined,{probeAudio:async()=>({exists:true,durationSeconds:9})}),'audio_invalid'));
  assert.deepEqual((await f.validate(undefined,{checkAudio:true,probeAudio:async()=>({exists:true,durationSeconds:.3})})).errors,[]);
});

test('DB adapters receive fingerprints and natural keys and report collisions or failures without leaking credentials',async t=>{
  const f=await fixture(t);await f.save('tests/toeic_part/valid.json',partTest());await f.save('vocab/words/batch.json',[word()]);
  const calls=[];
  let r=await f.validate(undefined,{db:{questionFingerprints:async fps=>{calls.push(fps);return [{fingerprint:fps[0]}];},words:async ws=>{calls.push(ws);return ws;}}});
  assert.ok(has(r,'db_duplicate_question'));assert.ok(has(r,'db_duplicate_word'));assert.equal(calls[0].length,40);assert.deepEqual(calls[1],[{word:'throughput',pos:'n'}]);
  r=await f.validate(undefined,{db:{questionFingerprints:async()=>{throw new Error('SECRET_KEY');},words:async()=>[]}});
  assert.ok(has(r,'db_check'));assert.ok(!JSON.stringify(r).includes('SECRET_KEY'));
});

test('generic expanded sections validate required records and external-resource documents allow brands/URLs',async t=>{
  const f=await fixture(t);
  await f.save('documents/external-resources.json',[{slug:'ets-reference',title:'ETS TOEIC official site',description:'Liên kết thông tin kỳ thi.',category:'Tài nguyên ngoài',file_url:'https://www.ets.org/toeic',source:'original'}]);
  await f.save('phrases/original.json',[{kind:'idiom',phrase:'break the ice',meaning_vi:'phá vỡ sự ngại ngùng',source:'original',examples:[{en:'We break the ice.',vi:'Chúng tôi bắt đầu làm quen.',source:'original'},{en:'Games break the ice.',vi:'Trò chơi giúp làm quen.',source:'original'}]}]);
  await f.save('pronunciation/lessons.json',[{slug:'theta',symbol:'θ',kind:'consonant',title:'Âm θ',source:'original',example_words:[],minimal_pairs:[]}]);
  await f.save('irregular/verbs.json',[{base:'go',past:'went',past_participle:'gone',meaning_vi:'đi',source:'original'}]);
  assert.deepEqual((await f.validate(undefined,{strict:true})).errors,[]);
  await f.save('phrases/original.json',[{kind:'bad',phrase:'bad',source:'original',examples:[null]}]);
  const r=await f.validate();for(const code of ['required','phrase_kind','array_min','object']) assert.ok(has(r,code),code);
});

test('prohibited content includes passages/questions but metadata URLs and reference documents remain allowed',async t=>{
  const f=await fixture(t),data=partTest();data.groups[0].questions[0].question_text='Copied from https://anhngu24h.example';
  data.groups[1].passage='Cambridge Assessment https://copied.example';
  data.groups[0].audio_url='https://media.example/original.mp3';
  await f.save('tests/toeic_part/bad.json',data);
  const r=await f.validate();assert.ok(r.errors.filter(d=>d.code==='prohibited').length>=2);
});

test('fictional .example domains in original reading tasks are allowed, real links still fail',async t=>{
  const f=await fixture(t),data=partTest();
  data.groups[0].passage='Register at www.original-company.example/preview or www.other-company.example.';
  const file=await f.save('tests/toeic_part/original.json',data);
  assert.deepEqual((await f.validate(file)).errors,[]);
  data.groups[0].passage='Register at https://original-company.example.evil.org/preview';
  await f.save('tests/toeic_part/original.json',data);assert.ok(has(await f.validate(file),'prohibited'));
});

test('discovery skips specs, manifests, raw downloads, reports and headword work queues',async t=>{
  const f=await fixture(t);
  for(const path of ['_manifest.json','tests/_specs/spec.json','_reports/report.json','vocab/raw/raw.json','vocab/headwords.json']) await f.save(path,'not JSON',true);
  await f.save('vocab/words/batch.json',[word()]);
  const r=await f.validate();assert.deepEqual(r.errors,[]);assert.equal(r.counts.files,2);assert.equal(r.counts.words,1);
  assert.ok(has(await f.validate(join(f.root,'missing.json')),'file_read'));
  assert.ok(has(await f.validate([]),'input'));
});

test('counts.questions counts public.questions only, separating reading and grammar exercises',async t=>{
  const f=await fixture(t);await f.save('tests/toeic_part/valid.json',partTest());
  await f.save('reading/passages.json',[{slug:'reading-original',title:'Title',level:'B1',passage_type:'article',paragraphs:[{en:'Original passage.',vi:'Đoạn văn nguyên bản.'}],questions:[{q:'Which item?',answer:'A',options:q(1).options,explanation:'Đáp án đúng.'}]}]);
  const r=await f.validate();assert.deepEqual(r.errors,[]);assert.equal(r.counts.questions,40);assert.equal(r.counts.reading_questions,1);assert.equal(r.counts.exercise_questions,0);
});

test('CLI returns exit status, writes full report, and keeps console diagnostics bounded',async t=>{
  const f=await fixture(t),report=join(f.root,'report.md');await f.save('phrases/broken.json',Array.from({length:100},()=>({})));
  const run=spawnSync(process.execPath,[SCRIPT,'--content-root',f.root,'--report',report,join(f.root,'phrases')],{encoding:'utf8'});
  assert.equal(run.status,1);assert.ok(run.stdout.includes('more diagnostics omitted'));assert.ok(run.stdout.split('\n').length<115);
  assert.ok((await readFile(report,'utf8')).includes('source_missing'));
  const help=spawnSync(process.execPath,[SCRIPT,'--help'],{encoding:'utf8'});assert.equal(help.status,0);
  const flag=spawnSync(process.execPath,[SCRIPT,'--unknown'],{encoding:'utf8'});assert.equal(flag.status,1);
  const missing=spawnSync(process.execPath,[SCRIPT,'--report'],{encoding:'utf8'});assert.equal(missing.status,1);
});

test('API import is side-effect free and does not read credentials or emit CLI output',()=>{
  const run=spawnSync(process.execPath,['--input-type=module','-e',`await import(${JSON.stringify(new URL('./validate-content.mjs',import.meta.url).href)})`],{encoding:'utf8',cwd:resolve(tmpdir()),env:{...process.env,SUPABASE_SECRET_KEY:'do-not-print'}});
  assert.equal(run.status,0);assert.equal(run.stdout,'');assert.equal(run.stderr,'');
});

test('invalid exam type and source-catalog keys report errors without crashing source resolution',async t=>{
  const f=await fixture(t),data=partTest();data.exam_type={invalid:true};data.source='tatoeba:7';
  await f.save('sources/sources.json',[...sources,{title:'Missing key',license:'Original'}]);
  await f.save('tests/toeic_part/bad.json',data);
  const r=await f.validate();assert.ok(has(r,'exam_type'));assert.ok(has(r,'required'));assert.ok(has(r,'source_unknown'));
});
