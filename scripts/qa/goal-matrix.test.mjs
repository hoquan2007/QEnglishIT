import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAM_TARGETS, goalMatrix } from './goal-matrix.mjs';

test('the exam distribution totals 317 including two original full tests', () => {
  assert.equal(Object.values(EXAM_TARGETS).reduce((a,b) => a + b,0),317);
});

test('goal matrix distinguishes headword coverage, media, and quantity gaps', () => {
  const snapshot = {
    counts:[{table:'tests',rows:8},{table:'vocab_words',rows:1553}],
    coverage:{distinctExplicitLemmas:1534,missingIpaUS:150,missingIpaUK:1553,
      missingAudioUS:1553,missingAudioUK:1553,fewerThanTwoExamples:1553,missingWordSources:1553,
      duplicateComputedFingerprints:0,missingStoredFingerprints:0,staleStoredFingerprints:0},
    exams:{toeic_full:{tests:2}},phrases:{phrasal_verb:50,idiom:50,collocation:100,expression:80},
    pronunciation:{distinctMinimalPairs:154},grammar:{qualifiedTopics:16},
  };
  const report = goalMatrix(snapshot);
  assert.deepEqual(report.metrics.find(m => m.metric === 'tests'),{metric:'tests',actual:8,target:300,missing:292,passed:false});
  assert.deepEqual(report.metrics.find(m => m.metric === 'distinct_lemmas'),{metric:'distinct_lemmas',actual:1534,target:10000,missing:8466,passed:false});
  assert.equal(report.examDistribution.find(m => m.metric === 'toeic_full').missing,60);
  assert.deepEqual(report.metrics.find(m => m.metric === 'expression'),{metric:'expression',actual:80,target:400,missing:320,passed:false});
  assert.equal(report.wordQuality.find(m => m.metric === 'ipa_us coverage').actual,1403);
  assert.equal(report.wordQuality.find(m => m.metric === 'audio_uk_url coverage (90%)').target,1398);
  assert.deepEqual(report.metrics.find(m => m.metric === 'grammar_topics_qualified'),
    {metric:'grammar_topics_qualified',actual:16,target:120,missing:104,passed:false});
});
