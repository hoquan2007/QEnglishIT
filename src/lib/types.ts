export type Option = { key: string; text: string };

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
};
