"use client";

// Browser text-to-speech helpers. Lines like "M: ...", "W: ...", "N: ..." get different voices.
export type SpeakLine = { speaker: string; text: string };

export function parseTranscript(t: string | null | undefined): SpeakLine[] {
  if (!t) return [];
  return t
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^([A-Z][A-Za-z0-9]{0,3}|\([A-D]\)|Q)\s*[:.)]?\s+(.*)$/);
      if (m && /^(M\d?|W\d?|N|Q|Man|Woman|\([A-D]\))$/.test(m[1])) return { speaker: m[1], text: m[2] };
      return { speaker: "N", text: l };
    });
}

let cachedVoices: SpeechSynthesisVoice[] = [];
export function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) cachedVoices = v.filter((x) => x.lang.startsWith("en"));
  return cachedVoices;
}

function pickVoice(speaker: string): SpeechSynthesisVoice | undefined {
  const voices = getVoices();
  if (!voices.length) return undefined;
  const female = voices.filter((v) => /female|zira|samantha|aria|jenny|libby|sonia|susan|karen|moira|tessa|google us english/i.test(v.name));
  const male = voices.filter((v) => /male|david|mark|guy|ryan|daniel|alex|fred|george|google uk english male/i.test(v.name) && !/female/i.test(v.name));
  const s = speaker.toUpperCase();
  if (s.startsWith("W")) return female[0] ?? voices[0];
  if (s.startsWith("M")) return (s === "M2" ? male[1] : male[0]) ?? voices[1] ?? voices[0];
  if (s === "Q") return male[0] ?? voices[0];
  return voices.find((v) => /en-GB|en-AU/.test(v.lang)) ?? voices[0];
}

export function speakLines(
  lines: SpeakLine[],
  opts: { rate?: number; onLine?: (i: number) => void; onEnd?: () => void; startAt?: number } = {},
) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const start = opts.startAt ?? 0;
  lines.slice(start).forEach((line, idx) => {
    const u = new SpeechSynthesisUtterance(line.text);
    const v = pickVoice(line.speaker);
    if (v) u.voice = v;
    u.lang = v?.lang ?? "en-US";
    u.rate = opts.rate ?? 1;
    u.onstart = () => opts.onLine?.(start + idx);
    if (idx === lines.length - start - 1) u.onend = () => opts.onEnd?.();
    window.speechSynthesis.speak(u);
  });
}

export function speak(text: string, rate = 1) {
  speakLines([{ speaker: "N", text }], { rate });
}

export function stopSpeaking() {
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}
