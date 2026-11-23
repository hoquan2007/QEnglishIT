// Independent answer review. Preparing a pack never includes the answer key,
// explanations, translations, or an author's private specification.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function blindPack(test) {
  return {
    slug: test.slug,
    revision: hash(test),
    title: test.title,
    exam_type: test.exam_type,
    groups: test.groups.map(g => ({
      part: g.part,
      section: g.section,
      instructions: g.instructions,
      passage: g.passage,
      transcript: g.transcript,
      image_description: g.image_description,
      questions: g.questions.map(q => ({
        number: q.number,
        question_type: q.question_type ?? 'mcq',
        question_text: q.question_text,
        options: q.options,
      })),
    })),
  };
}

export function gradeReview(test, review) {
  if (review.slug !== test.slug || review.revision !== hash(test)) {
    throw new Error('Review does not match the current test revision; prepare and solve a new blind pack.');
  }
  const questions = test.groups.flatMap(g => g.questions);
  const answers = review.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('Expected answers keyed by question number.');
  const expectedNumbers = new Set(questions.map(q => String(q.number)));
  const extra = Object.keys(answers).filter(n => !expectedNumbers.has(n));
  if (extra.length) throw new Error(`Unknown question numbers: ${extra.join(', ')}`);
  const missing = questions.filter(q => typeof answers[q.number] !== 'string' || !answers[q.number].trim()).map(q => q.number);
  const disagreements = questions.filter(q => {
    const answer = answers[q.number];
    if (typeof answer !== 'string') return false;
    const accepted = q.answer_data?.accepted ?? [q.correct_answer];
    const normalize = text => q.answer_data?.case_sensitive ? text.trim() : text.trim().toLowerCase();
    return !accepted.some(a => normalize(a) === normalize(answer));
  }).map(q => ({ number: q.number, reviewer_answer: answers[q.number], author_answer: q.correct_answer }));
  // Stable sample tied to the exact revision; includes at least 5% of questions.
  const sample = [...questions].sort((a,b) => hash([review.revision,a.number]).localeCompare(hash([review.revision,b.number])))
    .slice(0, Math.max(1, Math.ceil(questions.length * 0.05))).map(q => q.number).sort((a,b)=>a-b);
  return {
    slug: test.slug, revision: review.revision,
    check_name: 'independent_answer_review',
    status: missing.length || disagreements.length ? 'fail' : 'pass',
    total: questions.length, missing, disagreements,
    reviewer_notes: review.notes ?? '',
    admin_sample: sample,
    admin_review: 'pending',
    // This result records answer agreement, not editorial quality or human approval.
    publication_ready: false,
  };
}

async function main() {
  const [command, input, answersFile] = process.argv.slice(2);
  if (!['prepare', 'grade'].includes(command) || !input || (command === 'grade' && !answersFile)) {
    throw new Error('Usage: node scripts/qa/review-tests.mjs prepare <test.json> | grade <test.json> <review-answers.json>');
  }
  const test = JSON.parse(readFileSync(resolve(input), 'utf8'));
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(test.slug ?? '')) throw new Error('Invalid test slug');
  const directory = join(root, 'content/_reviews');
  mkdirSync(directory, {recursive:true});
  const result = command === 'prepare' ? blindPack(test) : gradeReview(test, JSON.parse(readFileSync(resolve(answersFile),'utf8')));
  const output = join(directory, `${test.slug}.${command === 'prepare' ? 'blind' : 'result'}.json`);
  writeFileSync(output, JSON.stringify(result,null,2) + '\n', 'utf8');
  console.log(output);
  if (result.status === 'fail') process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {console.error(error.message); process.exitCode = 1;});
}
