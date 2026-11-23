"use client";

import Link from "next/link";
import { useState } from "react";
import { Layers, List } from "lucide-react";
import type { VocabWord } from "@/lib/types";
import { Flashcards, WordList } from "./VocabLesson";
import { cn } from "@/lib/utils";

export function WordCollectionView({ words, empty }: { words: VocabWord[]; empty: React.ReactNode }) {
  const [mode, setMode] = useState<"list" | "flash">("list");
  if (!words.length) return <div className="card p-10 text-center text-slate-500">{empty}</div>;
  return (
    <>
      <div className="mb-4 flex gap-2">
        <button className={cn("btn !py-2", mode === "list" ? "btn-primary" : "btn-outline")} onClick={() => setMode("list")}><List className="h-4 w-4" />Danh sách</button>
        <button className={cn("btn !py-2", mode === "flash" ? "btn-primary" : "btn-outline")} onClick={() => setMode("flash")}><Layers className="h-4 w-4" />Flashcard</button>
      </div>
      {mode === "list" ? <WordList words={words} /> : <Flashcards words={words} />}
    </>
  );
}

export function LoginNeeded({ next }: { next: string }) {
  return (
    <div className="card p-10 text-center">
      <p className="text-slate-600">Đăng nhập để sử dụng tính năng này.</p>
      <Link href={`/login?next=${next}`} className="btn btn-primary mt-4">Đăng nhập</Link>
    </div>
  );
}
