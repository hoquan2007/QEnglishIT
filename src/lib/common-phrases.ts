export type PhraseKind = "conversation" | "verb" | "collocation";
export type Phrase = {
  id: string;
  english: string;
  vietnamese: string;
  kind: PhraseKind;
  source: { document: string; page?: number };
};

export const LESSON_SIZE = 20;
export const KIND_LABELS: Record<PhraseKind, string> = {
  conversation: "Giao tiếp",
  verb: "Cụm động từ",
  collocation: "Kết hợp từ",
};

export function normalizeSearch(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/[’‘]/g, "'").trim();
}

export function makeLessons(phrases: Phrase[]) {
  return Array.from({ length: Math.ceil(phrases.length / LESSON_SIZE) }, (_, index) => ({
    number: index + 1,
    phrases: phrases.slice(index * LESSON_SIZE, (index + 1) * LESSON_SIZE),
    kind: phrases[index * LESSON_SIZE].kind,
  }));
}

export function matchesPhrase(phrase: Phrase, query: string) {
  const normalized = normalizeSearch(query);
  return normalizeSearch(phrase.english).includes(normalized) || normalizeSearch(phrase.vietnamese).includes(normalized);
}

export function quizOptions(phrase: Phrase, pool: Phrase[]) {
  const options = [phrase.vietnamese];
  const seen = new Set([normalizeSearch(phrase.vietnamese)]);
  const start = Number(phrase.id.split("-")[1]) * 7 % pool.length;
  for (let offset = 0; offset < pool.length && options.length < 4; offset++) {
    const candidate = pool[(start + offset) % pool.length].vietnamese;
    const key = normalizeSearch(candidate);
    if (!seen.has(key)) {
      seen.add(key);
      options.push(candidate);
    }
  }
  const rotation = Number(phrase.id.split("-")[1]) % options.length;
  return [...options.slice(rotation), ...options.slice(0, rotation)];
}
