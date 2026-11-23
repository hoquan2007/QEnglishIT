export type Option = { key: string; text: string };

export type ExamType = "toeic_full" | "toeic_mini" | "toeic_listening" | "toeic_reading" | "toeic_part" | "toeic_sw" | "thpt" | "vstep" | "ielts_academic_reading" | "ielts_listening" | "cefr_placement" | "grammar_test" | "vocab_test";
export type QuestionType = "mcq" | "gap_fill" | "tfng" | "ynng" | "matching" | "short_answer" | "sentence_insert" | "error_identification" | "reorder";
export type BilingualExample = { en: string; vi: string; source?: string };

export type Question = {
  id: string;
  test_id: string;
  group_id: string;
  part: number;
  number: number;
  question_text: string | null;
  options: Option[];
  correct_answer: string;
  explanation: string | null;
  translation: string | null;
  tags: string[] | null;
  question_type?: QuestionType;
  answer_data?: { accepted?: string[]; case_sensitive?: boolean; max_words?: number } | null;
  difficulty?: number | null;
  skill_tags?: string[];
  fingerprint?: string | null;
};

export type QuestionGroup = {
  id: string;
  test_id: string;
  part: number;
  group_order: number;
  passage: string | null;
  passage_vi: string | null;
  transcript: string | null;
  transcript_vi: string | null;
  image_url: string | null;
  image_description: string | null;
  audio_url: string | null;
  section?: string | null;
  instructions?: string | null;
  audio_duration_seconds?: number | null;
  questions: Question[];
};

export type Test = {
  id: string;
  slug: string;
  title: string;
  collection: string;
  description: string | null;
  duration_minutes: number;
  total_questions: number;
  attempts_count: number;
  sort_order: number;
  exam_type?: ExamType;
  level?: string | null;
  difficulty?: number | null;
  cefr?: string | null;
  tags?: string[];
  sections?: { key: string; title: string; parts?: number[]; count: number; minutes: number }[];
};

export type Attempt = {
  id: string;
  test_id: string;
  mode: "exam" | "practice";
  parts: number[];
  answers: Record<string, string>;
  status: string;
  correct_listening: number;
  correct_reading: number;
  score_listening: number | null;
  score_reading: number | null;
  total_score: number | null;
  time_spent_seconds: number;
  started_at: string;
  submitted_at: string | null;
};

export type GrammarTopic = {
  id: string;
  slug: string;
  title: string;
  title_vi: string | null;
  level: string;
  category: string;
  difficulty: string | null;
  sort_order: number;
  summary: string | null;
  lecture_md: string | null;
  examples: { en: string; vi: string; note?: string }[];
  tips_md: string | null;
};

export type QuizItem = {
  id?: string;
  question_text: string;
  options: Option[];
  correct_answer: string;
  explanation: string | null;
};

export type VocabWord = {
  id: string;
  word: string;
  ipa: string | null;
  pos: string | null;
  meaning_vi: string;
  definition_en: string | null;
  example_en: string | null;
  example_vi: string | null;
  cefr: string | null;
  lemma?: string | null;
  ipa_us?: string | null;
  ipa_uk?: string | null;
  audio_us_url?: string | null;
  audio_uk_url?: string | null;
  examples?: BilingualExample[];
  word_family?: { word: string; pos: string }[];
  collocations?: { en: string; vi: string }[];
  synonyms?: string[];
  antonyms?: string[];
  topics?: string[];
  lists?: string[];
  register?: string | null;
  frequency_rank?: number | null;
  reviewed?: boolean;
};
