"use client";

import { useEffect, useState } from "react";
import { Check, Clock, Image as ImageIcon, Save, X } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn, formatDuration } from "@/lib/utils";

type Task = {
  id: string; task_type: string; prompt: string; keywords: string[] | null; image_description: string | null;
  time_minutes: number | null; sample_answer: string | null; tips_md: string | null;
};

export function WritingTask({ task }: { task: Task }) {
  const limit = (task.time_minutes ?? 10) * 60;
  const [text, setText] = useState("");
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);
  const [showSample, setShowSample] = useState(false);

  useEffect(() => {
    if (!started || saved) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [started, saved]);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const kw = (task.keywords ?? []).map((k) => ({ k, ok: new RegExp(`\\b${k.split(/[\s/]+/)[0].replace(/[^a-z]/gi, "")}`, "i").test(text) }));
  const target = task.task_type === "opinion_essay" ? 300 : task.task_type === "respond_email" ? 120 : 8;
  const remaining = limit - elapsed;

  async function save() {
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    const feedback = { words, keywords: kw, time_seconds: elapsed, meets_length: words >= target };
    if (u.user) {
      await sb.from("practice_submissions").insert({ user_id: u.user.id, kind: "writing", task_id: task.id, content: text, feedback });
      await sb.rpc("record_study", { _activity: "writing", _ref: task.id, _correct: words >= target ? 1 : 0, _total: 1, _xp: 5, _seconds: elapsed });
      setSaved("Đã lưu bài viết vào tài khoản.");
    } else setSaved("Đăng nhập để lưu bài viết. Bạn vẫn có thể xem bài mẫu.");
    setShowSample(true);
  }

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-4">
        <div className="card p-5">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-ui-sky-text">Đề bài</div>
          <Markdown className="prose-sm">{task.prompt}</Markdown>
          {task.image_description && (
            <div className="mt-3 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 p-4 text-sm text-slate-100">
              <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-ui-faint"><ImageIcon className="h-4 w-4" />Hình ảnh</div>
              {task.image_description}
            </div>
          )}
          {kw.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {kw.map(({ k, ok }) => (
                <span key={k} className={cn("chip", ok && "!border-ui-emerald-line !bg-ui-emerald-tint !text-ui-emerald-strong")}>{ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{k}</span>
              ))}
            </div>
          )}
        </div>
        {task.tips_md && <div className="card p-5"><Markdown className="prose-sm">{task.tips_md}</Markdown></div>}
      </div>
      <div className="space-y-4">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className={cn("flex items-center gap-1.5 font-mono font-semibold", remaining < 60 ? "text-ui-rose-text" : "text-ui-brand-strong")}>
              <Clock className="h-4 w-4" />{formatDuration(Math.max(0, remaining))}
            </span>
            <span className={cn("font-semibold", words >= target ? "text-ui-emerald-text" : "text-ui-muted")}>{words} từ{target > 8 ? ` / tối thiểu ${target}` : ""}</span>
          </div>
          <textarea
            className="input min-h-72 font-[inherit] leading-relaxed"
            placeholder={started ? "Viết câu trả lời của bạn..." : "Nhấn vào đây để bắt đầu tính giờ..."}
            value={text}
            onFocus={() => setStarted(true)}
            onChange={(e) => setText(e.target.value)}
            disabled={Boolean(saved)}
          />
          <button className="btn btn-primary mt-3 w-full" disabled={!words || Boolean(saved)} onClick={save}><Save className="h-4 w-4" />Nộp bài</button>
          {saved && <p className="mt-2 text-center text-sm text-ui-emerald-strong">{saved}</p>}
        </div>
        <div className="card p-5">
          <button className="btn btn-outline" onClick={() => setShowSample((v) => !v)}>{showSample ? "Ẩn bài mẫu" : "Xem bài mẫu"}</button>
          {showSample && <div className="mt-3 whitespace-pre-wrap rounded-xl bg-ui-emerald-tint p-4 text-sm leading-relaxed">{task.sample_answer}</div>}
        </div>
      </div>
    </div>
  );
}
