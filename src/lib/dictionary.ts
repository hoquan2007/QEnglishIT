export type DictionaryLink = { label: string; url: string };

export type DictionaryPronunciation = {
  ipa?: string;
  audioUrl?: string;
  accent?: string;
  credits?: DictionaryLink[];
};

export type DictionaryMeaning = {
  partOfSpeech: string;
  senses: { definition: string; examples: string[]; vietnamese: string[] }[];
};

export type DictionaryEntry = {
  word: string;
  pronunciations: DictionaryPronunciation[];
  meanings: DictionaryMeaning[];
  sources: DictionaryLink[];
};

export const DICTIONARY_QUERY_LIMIT = 80;

export function dictionaryQuery(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").replace(/[‘’]/g, "'");
}

export function isDictionaryQuery(value: string) {
  return value.length <= DICTIONARY_QUERY_LIMIT &&
    /^\p{Script=Latin}+(?:(?:[ '-]|\. ?)\p{Script=Latin}+)*\.?$/u.test(value);
}
