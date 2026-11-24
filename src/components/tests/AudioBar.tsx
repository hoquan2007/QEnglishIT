"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { parseTranscript, speakLines, stopSpeaking } from "@/lib/tts";

const RATES = [0.75, 1, 1.25];

// TTS-based audio player that reads the group transcript; uses audio_url when available.
export function AudioBar({
  transcript,
  audioUrl,
  autoPlay,
  onKeyboard = true,
}: {
  transcript: string | null;
  audioUrl?: string | null;
  autoPlay?: boolean;
  onKeyboard?: boolean;
}) {
  const lines = parseTranscript(transcript);
  const [playing, setPlaying] = useState(false);
  const [line, setLine] = useState(-1);
  const [rate, setRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const play = useCallback(
    (from = 0) => {
      if (audioUrl && audioRef.current) {
        audioRef.current.playbackRate = rate;
        audioRef.current.play();
        setPlaying(true);
        return;
      }
      setPlaying(true);
      speakLines(lines, {
        rate,
        startAt: from,
        onLine: setLine,
        onEnd: () => {
          setPlaying(false);
          setLine(-1);
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [audioUrl, rate, transcript],
  );

  const pause = useCallback(() => {
    if (audioUrl) audioRef.current?.pause();
    else stopSpeaking();
    setPlaying(false);
  }, [audioUrl]);

  useEffect(() => {
    if (autoPlay) {
      const t = setTimeout(() => play(0), 400);
      return () => {
        clearTimeout(t);
        stopSpeaking();
      };
    }
    return () => stopSpeaking();
  }, [autoPlay, play]);

  useEffect(() => {
    if (!onKeyboard) return;
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        if (playing) pause();
        else play(Math.max(line, 0));
      } else if (e.key === "r" || e.key === "R") {
        pause();
        play(0);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onKeyboard, playing, line, play, pause]);

  const progress = lines.length ? ((line + 1) / lines.length) * 100 : 0;

  return (
    <div className="rounded-2xl bg-ui-surface p-3 shadow-sm ring-1 ring-ui-brand-soft">
      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setPlaying(false)} />}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (playing ? pause() : play(Math.max(line, 0)))}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ui-brand-fill text-white hover:bg-ui-brand-fill-hover"
          aria-label={playing ? "Tạm dừng" : "Phát"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <div className="flex h-8 flex-1 items-center gap-[3px] overflow-hidden">
          {Array.from({ length: 48 }).map((_, i) => (
            <span
              key={i}
              className={`w-1 rounded-full ${(i / 48) * 100 < progress ? "bg-brand-500" : "bg-ui-track"}`}
              style={{ height: `${30 + ((i * 37) % 70)}%` }}
            />
          ))}
        </div>
        <button onClick={() => { pause(); play(0); }} className="rounded-lg p-2 text-ui-muted hover:bg-ui-subtle" aria-label="Nghe lại">
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={() => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length])}
          className="w-12 rounded-lg py-1 text-sm font-semibold text-ui-secondary hover:bg-ui-subtle"
        >
          {rate}x
        </button>
        <Volume2 className="hidden h-4 w-4 text-ui-faint sm:block" />
      </div>
      {onKeyboard && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ui-muted">
          <Kbd k="Space" t="Phát/Dừng" /> <Kbd k="R" t="Nghe lại" /> <Kbd k="1-4" t="Đáp án" /> <Kbd k="← →" t="Chuyển câu" />
        </div>
      )}
    </div>
  );
}

function Kbd({ k, t }: { k: string; t: string }) {
  return (
    <span className="flex items-center gap-1">
      <kbd className="rounded border border-ui-outline bg-ui-canvas px-1 font-mono text-[10px]">{k}</kbd>
      {t}
    </span>
  );
}
