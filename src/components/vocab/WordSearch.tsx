"use client";

import { useEffect, useState } from "react";
import { Search, Volume2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { speak } from "@/lib/tts";
import type { VocabWord } from "@/lib/types";
import { CartButton } from "./CartButton";

export function WordSearch() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<VocabWord[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const t = setTimeout(async () => {
      const safe = term.replace(/[%_,()]/g, "");
      const { data } = await supabaseBrowser()
        .from("vocab_words")
        .select("*")
        .or(`word.ilike.${safe}%,meaning_vi.ilike.%${safe}%`)
        .limit(12);
      setRes((data ?? []) as VocabWord[]);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
      <input className="input !py-3 !pl-9" placeholder="Tra từ vựng tiếng Anh hoặc nghĩa tiếng Việt..." value={q} onChange={(e) => setQ(e.target.value)} />
      {q.trim().length >= 2 && res.length > 0 && (
        <div className="card absolute inset-x-0 top-full z-20 mt-2 max-h-96 divide-y divide-slate-100 overflow-y-auto shadow-xl">
          {res.map((w) => (
            <div key={w.id} className="flex items-start gap-3 p-3">
              <button onClick={() => speak(w.word)} className="mt-0.5 rounded-full bg-brand-50 p-2 text-brand-600" aria-label="Phát âm"><Volume2 className="h-4 w-4" /></button>
              <div className="flex-1">
                <div><b>{w.word}</b> <span className="text-sm text-slate-400">{w.ipa} · {w.pos}</span></div>
                <div className="text-sm text-slate-700">{w.meaning_vi}</div>
                {w.example_en && <div className="text-xs italic text-slate-500">{w.example_en}</div>}
              </div>
              <CartButton wordId={w.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
