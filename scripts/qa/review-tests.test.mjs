import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blindPack, gradeReview } from './review-tests.mjs';
const original = {slug:'qe-review', title:'Review', exam_type:'grammar_test', groups:[{part:1, questions:[
  {number:1,question_text:'Question',options:[{key:'A',text:'Option'}],correct_answer:'A',explanation:'private explanation',translation:'private translation'},
]}]};
test('blind review cannot reveal answer keys or explanations', () => {
  const pack = blindPack(original);
  assert.equal(pack.groups[0].questions[0].correct_answer, undefined);
  assert.equal(pack.groups[0].questions[0].explanation, undefined);
  assert.equal(pack.groups[0].questions[0].translation, undefined);
});
test('passing independent answers never substitutes for admin approval', () => {
  const result = gradeReview(original,{...blindPack(original),answers:{1:'A'}});
  assert.equal(result.status,'pass');
  assert.equal(result.publication_ready,false);
  assert.equal(result.admin_review,'pending');
  assert.deepEqual(result.admin_sample,[1]);
});
test('stale answers and partial reviews cannot pass', () => {
  const pack = blindPack(original);
  assert.throws(()=>gradeReview({...original,title:'Changed'},{...pack,answers:{1:'A'}}),/revision/);
  assert.equal(gradeReview(original,{...pack,answers:{}}).status,'fail');
  assert.equal(gradeReview(original,{...pack,answers:{1:'B'}}).status,'fail');
});
