"use client";

import Link from "next/link";
import type { VocabWord } from "@/lib/types";
import { Flashcards } from "./VocabLesson";

export function ReviewSession({ words }: { words: VocabWord[] }) {
  if (!words.length) {
    return (
      <div className="card p-10 text-center">
        <p className="text-lg font-bold">🎉 Không có từ nào đến hạn ôn!</p>
        <p className="mt-1 text-ui-muted">Học thêm từ mới bằng chế độ Flashcard để hệ thống lên lịch ôn tập.</p>
        <Link href="/tu-vung-toeic" className="btn btn-primary mt-4">Học từ mới</Link>
      </div>
    );
  }
  return <Flashcards words={words} />;
}
