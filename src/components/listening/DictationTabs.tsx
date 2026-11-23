"use client";

import { useState } from "react";
import { Headphones, FileText, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function DictationTabs({ byPart, byTest, progress }: { byPart: React.ReactNode; byTest: React.ReactNode; progress: React.ReactNode }) {
  const [tab, setTab] = useState(0);
  const tabs = [
    { l: "Nghe chép theo Part", i: Headphones, c: byPart },
    { l: "Nghe chép theo từng đề", i: FileText, c: byTest },
    { l: "Tiến độ", i: BarChart3, c: progress },
  ];
  return (
    <>
      <div className="mb-5 flex justify-center">
        <div className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1">
          {tabs.map((t, i) => (
            <button key={t.l} onClick={() => setTab(i)} className={cn("flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold", tab === i ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-100")}>
              <t.i className="h-4 w-4" />{t.l}
            </button>
          ))}
        </div>
      </div>
      {tabs[tab].c}
    </>
  );
}
