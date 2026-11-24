"use client";

import { Volume2 } from "lucide-react";
import type { VocabWord } from "@/lib/types";
import { speakWord } from "@/lib/tts";

export function WordPronunciation({ word }: { word: VocabWord }) {
  const dialects = [
    { key: "us", label: "Mỹ", ipa: word.ipa_us, url: word.audio_us_url },
    { key: "uk", label: "Anh", ipa: word.ipa_uk, url: word.audio_uk_url },
  ] as const;
  const available = dialects.filter(({ ipa, url }) => ipa || url);
  const buttonClass = "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-brand-700 hover:bg-brand-50";

  return (
    <div className="flex flex-wrap items-center gap-x-1">
      {available.length ? available.map(({ key, label, ipa }) => (
        <button key={key} type="button" onClick={() => speakWord(word, key)} className={buttonClass}
          aria-label={`Nghe ${word.word}, giọng Anh–${label}`}>
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          {key.toUpperCase()} {ipa}
        </button>
      )) : (
        <button type="button" onClick={() => speakWord(word)} className={buttonClass} aria-label={`Nghe ${word.word}`}>
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          {word.ipa}
        </button>
      )}
    </div>
  );
}
