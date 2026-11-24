"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X, FileText, Target, Play, Timer, GraduationCap, Dumbbell } from "lucide-react";
import type { Test } from "@/lib/types";
import { getToeicParts, PARTS } from "@/lib/toeic";
import { cn } from "@/lib/utils";

export function ModeDialog({
  test,
  initialMode,
  fixedParts,
  onClose,
}: {
  test: Test;
  initialMode: "exam" | "practice";
  fixedParts?: number[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [parts, setParts] = useState<number[]>(fixedParts ?? []);
  const [customTime, setCustomTime] = useState(false);
  const [minutes, setMinutes] = useState(0);

  const availableParts = getToeicParts(test);
  const options = PARTS.filter((p) => availableParts.includes(p.part));
  const suggested = test.exam_type === "toeic_part"
    ? test.duration_minutes
    : Math.round(parts.reduce((s, p) => s + PARTS[p - 1].count, 0) * 0.6);
  const toggle = (p: number) => setParts((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p].sort()));
  const allSelected = parts.length === availableParts.length;

  function go(selected: number[] | "full") {
    const q = new URLSearchParams({ mode });
    if (selected !== "full") q.set("parts", selected.join(","));
    if (selected !== "full" && customTime && minutes > 0) q.set("time", String(minutes));
    if (selected === "full" && mode === "exam") q.set("time", String(test.duration_minutes));
    router.push(`/luyen-de-toeic/${test.slug}?${q}`);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ui-overlay/50 dark:bg-ui-overlay/75 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-xl overflow-y-auto p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-extrabold">Chọn chế độ</h2>
            <p className="text-sm text-ui-muted">{test.title}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-ui-subtle" aria-label="Đóng"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-xl bg-ui-subtle p-1">
          {([["exam", "Luyện thi", GraduationCap], ["practice", "Luyện tập", Dumbbell]] as const).map(([m, label, Icon]) => (
            <button key={m} onClick={() => setMode(m)} className={cn("flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold", mode === m ? "bg-ui-surface shadow" : "text-ui-muted")}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ui-muted">
          {mode === "exam" ? "Mô phỏng đề thi thật, đáp án ẩn cho đến khi nộp bài." : "Kiểm tra đáp án và xem giải thích ngay sau mỗi câu."}
        </p>

        {!fixedParts && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-ui-line p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-ui-brand-tint text-ui-brand-text"><FileText className="h-5 w-5" /></span>
            <div className="flex-1">
              <div className="font-bold">Làm cả đề ({test.total_questions} câu)</div>
              <div className="text-xs text-ui-muted">{test.duration_minutes} phút</div>
            </div>
            <button className="btn btn-primary !py-2" onClick={() => go("full")}><Play className="h-4 w-4" />Bắt đầu</button>
          </div>
        )}

        {(fixedParts || options.length > 1) && <div className="mt-3 rounded-2xl border border-ui-line p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-ui-violet-tint text-ui-violet-text"><Target className="h-5 w-5" /></span>
            <div className="flex-1">
              <div className="font-bold">{mode === "exam" ? "Thi theo Part" : "Luyện theo Part"}</div>
              <div className="text-xs text-ui-muted">Chọn Part cụ thể để luyện</div>
            </div>
            <button className="btn btn-primary !py-2" disabled={!parts.length} onClick={() => go(parts)}><Play className="h-4 w-4" />Bắt đầu</button>
          </div>
          {!fixedParts && (
            <>
              <label className="mt-4 flex cursor-pointer items-center gap-2 rounded-lg border border-ui-line px-3 py-2 text-sm">
                <input type="checkbox" checked={allSelected} onChange={() => setParts(allSelected ? [] : availableParts)} />
                Chọn tất cả {availableParts.length} Part
              </label>
              {(["Nghe", "Đọc"] as const).map((skill) => (
                <div key={skill}>
                  <div className="mb-2 mt-3 text-[11px] font-bold uppercase tracking-wider text-ui-faint">{skill === "Nghe" ? "Listening" : "Reading"}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {options.filter((p) => p.skill === skill).map((p) => (
                      <label key={p.part} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm", parts.includes(p.part) ? "border-brand-400 bg-ui-brand-tint" : "border-ui-line")}>
                        <input type="checkbox" checked={parts.includes(p.part)} onChange={() => toggle(p.part)} />
                        {p.name}<span className="ml-auto text-xs text-ui-faint">{p.count} câu</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
          <div className="mt-4 rounded-xl bg-ui-canvas p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Timer className="h-4 w-4" /> Thời gian làm bài
              <label className="ml-auto flex items-center gap-2 text-xs font-normal text-ui-muted">
                Tự đặt <input type="checkbox" checked={customTime} onChange={(e) => { setCustomTime(e.target.checked); setMinutes(suggested); }} />
              </label>
            </div>
            {customTime ? (
              <input type="number" min={1} max={200} className="input mt-2 !py-1.5" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
            ) : (
              <div className="mt-1 text-xs text-ui-muted">Không giới hạn · thời gian đề xuất {suggested} phút</div>
            )}
          </div>
        </div>}
      </div>
    </div>
  );
}
