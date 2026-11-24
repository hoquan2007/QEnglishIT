// Persist independently submitted answers; never interpret this as admin approval.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { discoverContent, loadContent, root } from './report.mjs';
import { gradeReview } from './review-tests.mjs';
import { batch, fetchAll } from '../seed.mjs';

const { values:args } = parseArgs({options:{
  'dry-run':{type:'boolean'},
  only:{type:'string',multiple:true},
}});
const selected = new Set(args.only);
const reviews = [];
for (const {item:test} of loadContent(discoverContent(['tests']))) {
  if (selected.size && !selected.has(test.slug)) continue;
  const file = join(root, '_reviews', `${test.slug}.answers.json`);
  if (!existsSync(file)) continue;
  const result = gradeReview(test, JSON.parse(readFileSync(file, 'utf8')));
  reviews.push(result);
}
for (const slug of selected) if (!reviews.some(review => review.slug === slug)) {
  throw new Error(`No independently submitted review for ${slug}`);
}
if (!reviews.length) throw new Error('No independently submitted reviews found');
console.table(reviews.map(r => ({slug:r.slug, status:r.status, questions:r.total, editorialNotes:r.reviewer_notes.length, admin:'pending'})));
if (args['dry-run']) {
  console.log('Dry-run: no credentials loaded and no writes.');
} else {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error('Supabase server environment required');
  const {createClient} = await import('@supabase/supabase-js');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const tests = new Map((await fetchAll(sb,'tests','id,slug')).map(t=>[t.slug,t.id]));
  if (reviews.some(r=>!tests.has(r.slug))) throw new Error('Seed all reviewed tests before syncing QA');
  const rows = reviews.flatMap(r=>[
    {check_name:'independent_answer_review',status:r.status,detail:JSON.stringify(r)},
    {check_name:'admin_sample_review',status:'warn',detail:JSON.stringify({revision:r.revision,questions:r.admin_sample,status:'pending',publication_ready:false})},
  ].map(check=>{
    // Stable custom UUID (v8) makes replay of this exact revision idempotent.
    const hex = createHash('sha256').update(`${tests.get(r.slug)}|${check.check_name}|${r.revision}`).digest('hex');
    const id = `${hex.slice(0,8)}-${hex.slice(8,12)}-8${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
    return {id,item_table:'tests',item_id:tests.get(r.slug),...check};
  }));
  const existing = new Set((await fetchAll(sb,'content_qa','id')).map(r=>r.id));
  // A later manual decision on the same sample must survive a QA replay.
  await batch(sb,'content_qa',rows.filter(r=>r.check_name!=='admin_sample_review' || !existing.has(r.id)),'id');
  console.log(`Recorded ${reviews.length} independent reviews; admin samples remain pending.`);
}
