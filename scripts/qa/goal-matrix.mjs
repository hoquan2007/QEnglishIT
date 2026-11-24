// Numeric targets from Plandataenglish.md, with the two pre-existing TOEIC
// full tests included in the intended 317-test final distribution.
export const EXAM_TARGETS = Object.freeze({
  toeic_full: 62,
  toeic_mini: 30,
  toeic_listening: 15,
  toeic_reading: 15,
  toeic_part: 70,
  toeic_sw: 10,
  thpt: 25,
  vstep: 15,
  ielts_academic_reading: 15,
  ielts_listening: 15,
  cefr_placement: 5,
  grammar_test: 20,
  vocab_test: 20,
});

const METRIC_TARGETS = Object.freeze({
  tests: 300,
  questions: 25000,
  distinct_lemmas: 10000,
  grammar_topics: 120,
  grammar_topics_qualified: 120,
  grammar_questions: 2400,
  reading_passages: 500,
  listening_lessons: 400,
  speaking_tasks: 200,
  writing_tasks: 150,
  blog_posts: 100,
  documents: 60,
  courses: 12,
  distinct_ipa_sounds: 44,
  irregular_verbs: 200,
  distinct_minimal_pairs: 300,
  pronunciation_audio_lessons: 44,
  listening_audio_lessons: 400,
  phrasal_verb: 800,
  idiom: 500,
  collocation: 1500,
  expression: 400,
});

function row(metric, actual, target) {
  if (!Number.isFinite(actual) || !Number.isFinite(target)) throw new Error(`Invalid numeric metric ${metric}`);
  return { metric, actual, target, missing: Math.max(0, target - actual), passed: actual >= target };
}

export function goalMatrix({ counts, coverage, exams, phrases, pronunciation = {}, media = {}, grammar = {} }) {
  const tables = Object.fromEntries(counts.map(({ table, rows }) => [table, rows]));
  const figures = {
    ...tables,
    distinct_lemmas: coverage.distinctExplicitLemmas,
    grammar_topics_qualified: grammar.qualifiedTopics ?? 0,
    distinct_minimal_pairs: pronunciation.distinctMinimalPairs ?? 0,
    distinct_ipa_sounds: pronunciation.distinctIpaSounds ?? 0,
    pronunciation_audio_lessons: media.pronunciationAudioLessons ?? 0,
    listening_audio_lessons: media.listeningAudioLessons ?? 0,
    ...phrases,
  };
  const metrics = Object.entries(METRIC_TARGETS).map(([metric, target]) => row(metric, figures[metric] ?? 0, target));
  const examDistribution = Object.entries(EXAM_TARGETS)
    .map(([type, target]) => row(type, exams[type]?.tests ?? 0, target));
  const wordCount = tables.vocab_words ?? 0;
  const wordQuality = [
    row('ipa_us coverage', wordCount - coverage.missingIpaUS, wordCount),
    row('ipa_uk coverage', wordCount - coverage.missingIpaUK, wordCount),
    row('audio_us_url coverage', wordCount - coverage.missingAudioUS, wordCount),
    row('audio_uk_url coverage (90%)', wordCount - coverage.missingAudioUK, Math.ceil(wordCount * 0.9)),
    row('>=2 bilingual examples', wordCount - coverage.fewerThanTwoExamples, wordCount),
    row('word source provenance', wordCount - coverage.missingWordSources, wordCount),
  ];
  const integrity = {
    duplicateFingerprints: coverage.duplicateComputedFingerprints,
    missingFingerprints: coverage.missingStoredFingerprints,
    staleFingerprints: coverage.staleStoredFingerprints,
  };
  return { metrics, examDistribution, wordQuality, integrity };
}
