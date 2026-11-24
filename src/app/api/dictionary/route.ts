import {
  dictionaryQuery,
  isDictionaryQuery,
  type DictionaryEntry,
  type DictionaryLink,
  type DictionaryMeaning,
} from "@/lib/dictionary";

type Pronunciation = { type?: string; text?: string; audio?: string; tags?: string[]; sourceUrl?: string; license?: License };
type License = { name?: string; url?: string };
type WiktionaryResponse = {
  word?: string;
  entries: {
    partOfSpeech: string;
    pronunciations?: Pronunciation[];
    senses?: {
      definition: string;
      examples?: string[];
      translations?: { language: { code: string }; word: string }[];
    }[];
  }[] | null;
  source?: { url?: string; license?: License };
};
type FreeDictionaryResponse = {
  word?: string;
  phonetic?: string;
  phonetics?: Pronunciation[];
  meanings?: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[];
  sourceUrls?: string[];
  license?: License;
}[];

function httpsUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value.startsWith("//") ? "https:" + value : value);
    if (url.protocol === "https:" && !url.username && !url.password) return url.href;
  } catch {
    return undefined;
  }
}

function link(label: string, value?: string): DictionaryLink[] {
  const url = httpsUrl(value);
  return url ? [{ label, url }] : [];
}

function mergeMeanings(groups: DictionaryMeaning[]) {
  const meanings: DictionaryMeaning[] = [];
  for (const group of groups) {
    const senses = group.senses.filter(sense => sense.definition?.trim());
    if (senses.length === 0) continue;
    const current = meanings.find(meaning => meaning.partOfSpeech === group.partOfSpeech);
    if (current) current.senses.push(...senses);
    else meanings.push({ partOfSpeech: group.partOfSpeech, senses });
  }
  return meanings;
}

function wiktionaryEntry(data: WiktionaryResponse, query: string): DictionaryEntry | null {
  const word = data.word || query;
  if (!data.entries?.length) return null;
  const meanings = mergeMeanings(data.entries.map(entry => ({
    partOfSpeech: entry.partOfSpeech,
    senses: (entry.senses ?? []).map(sense => ({
      definition: sense.definition,
      examples: sense.examples?.slice(0, 2) ?? [],
      vietnamese: [...new Set(sense.translations?.flatMap(item =>
        item.language.code === "vi" && item.word.trim() ? [item.word] : [],
      ))].slice(0, 8),
    })),
  })));
  if (!meanings.length) return null;

  const pronunciations = data.entries.flatMap(entry => (entry.pronunciations ?? []).flatMap(item => {
    const accent = item.tags?.join(", ");
    if (item.type === "ipa" && item.text) return [{ ipa: item.text, accent }];
    return [];
  }));

  return {
    word,
    meanings,
    pronunciations,
    sources: [
      { label: "FreeDictionaryAPI.com", url: "https://freedictionaryapi.com/" },
      ...link("Wiktionary", data.source?.url ?? "https://en.wiktionary.org/wiki/" + encodeURIComponent(word)),
      ...link(data.source?.license?.name ?? "CC BY-SA 4.0", data.source?.license?.url ?? "https://creativecommons.org/licenses/by-sa/4.0/"),
    ],
  };
}

function freeDictionaryEntry(data: FreeDictionaryResponse, query: string): DictionaryEntry | null {
  const meanings = mergeMeanings(data.flatMap(entry => (entry.meanings ?? []).map(meaning => ({
    partOfSpeech: meaning.partOfSpeech,
    senses: meaning.definitions.map(sense => ({
      definition: sense.definition,
      examples: sense.example ? [sense.example] : [],
      vietnamese: [],
    })),
  }))));
  if (!meanings.length) return null;

  const pronunciations = data.flatMap(entry => [
    ...(entry.phonetic ? [{ ipa: entry.phonetic }] : []),
    ...(entry.phonetics ?? []).map(item => ({
      ipa: item.text,
      audioUrl: httpsUrl(item.audio),
      credits: [
        ...link("Nguồn bản ghi", item.sourceUrl),
        ...link(item.license?.name ?? "Giấy phép bản ghi", item.license?.url),
      ],
    })),
  ]);

  return {
    word: data[0].word || query,
    meanings,
    pronunciations,
    sources: [
      { label: "DictionaryAPI.dev", url: "https://dictionaryapi.dev/" },
      ...data.flatMap(entry => [
        ...(entry.sourceUrls ?? []).flatMap(url => link("Nguồn định nghĩa", url)),
        ...link(entry.license?.name ?? "Giấy phép nội dung", entry.license?.url),
      ]),
    ],
  };
}

async function lookup<T>(
  url: string,
  parse: (data: T, query: string) => DictionaryEntry | null,
  query: string,
) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4000), next: { revalidate: 86400 } });
    if (response.status === 404) return { status: "missing" } as const;
    if (!response.ok) return { status: "unavailable" } as const;

    const entry = parse(await response.json(), query);
    return entry ? { status: "found", entry } as const : { status: "missing" } as const;
  } catch {
    return { status: "unavailable" } as const;
  }
}

async function lookupWithCaseFallback<T>(
  url: (escapedWord: string) => string,
  parse: (data: T, query: string) => DictionaryEntry | null,
  query: string,
) {
  const entry = await lookup(url(encodeURIComponent(query)), parse, query);
  const lowercase = query.toLowerCase();
  return entry.status === "missing" && lowercase !== query
    ? lookup(url(encodeURIComponent(lowercase)), parse, lowercase)
    : entry;
}

export async function GET(request: Request) {
  const query = dictionaryQuery(new URL(request.url).searchParams.get("q") ?? "");
  if (!isDictionaryQuery(query)) return Response.json({ error: "invalid" }, { status: 400 });

  const [primary, secondary] = await Promise.all([
    lookupWithCaseFallback(word => "https://freedictionaryapi.com/api/v1/entries/en/" + word + "?translations=true", wiktionaryEntry, query),
    lookupWithCaseFallback(word => "https://api.dictionaryapi.dev/api/v2/entries/en/" + word, freeDictionaryEntry, query),
  ]);
  const result = primary.status === "found" ? primary : secondary;
  if (result.status !== "found") {
    if (primary.status === "missing" && result.status === "missing") {
      return Response.json({ error: "missing" }, { status: 404 });
    }
    return Response.json({ error: "unavailable" }, { status: 503 });
  }

  const unique = <T,>(values: T[], key: (value: T) => string) =>
    [...new Map(values.map(value => [key(value), value])).values()];
  const recordings = primary.status === "found" && secondary.status === "found" &&
    primary.entry.word === secondary.entry.word
    ? secondary.entry.pronunciations.filter(item => item.audioUrl)
    : [];
  const pronunciations = unique(
    [...result.entry.pronunciations, ...recordings].filter(item => item.ipa || item.audioUrl),
    item => item.audioUrl ?? item.ipa ?? "",
  );
  const sources = unique([
    ...result.entry.sources,
    ...(recordings.length ? [{ label: "DictionaryAPI.dev", url: "https://dictionaryapi.dev/" }] : []),
  ], source => source.url);

  return Response.json(
    { ...result.entry, pronunciations, sources },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
