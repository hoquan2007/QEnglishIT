"use client";

import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Mic, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { speak } from "@/lib/tts";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Task = {
  id: string; task_type: string; prompt: string; image_description: string | null;
  prep_seconds: number | null; response_seconds: number | null; sample_answer: string | null; tips_md: string | null;
};

type Phase = "ready" | "prep" | "record" | "done";

export function SpeakingTask({ task }: { task: Task }) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [left, setLeft] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showSample, setShowSample] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (phase !== "prep" && phase !== "record") return;
    if (left <= 0) {
      if (phase === "prep") startRecording();
      else stopRecording();
      return;
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, left]);

  async function startRecording() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        setPhase("done");
        const sb = supabaseBrowser();
        const { data: u } = await sb.auth.getUser();
        if (u.user) {
          const path = `${u.user.id}/${task.id}-${Date.now()}.webm`;
          await sb.storage.from("recordings").upload(path, blob, { contentType: blob.type });
          await sb.from("practice_submissions").insert({ user_id: u.user.id, kind: "speaking", task_id: task.id, audio_path: path });
          await sb.rpc("record_study", { _activity: "speaking", _ref: task.id, _correct: 1, _total: 1, _xp: 5, _seconds: task.response_seconds ?? 0 });
        }
      };
      rec.start();
      recRef.current = rec;
      setLeft(task.response_seconds ?? 45);
      setPhase("record");
    } catch {
      setErr("Không truy cập được micro. Hãy cấp quyền micro cho trình duyệt.");
      setPhase("ready");
    }
  }

  function stopRecording() {
    if (recRef.current?.state === "recording") recRef.current.stop();
  }

  function begin() {
    setAudioUrl(null);
    if ((task.prep_seconds ?? 0) > 0) {
      setLeft(task.prep_seconds ?? 0);
      setPhase("prep");
    } else startRecording();
  }

  const total = phase === "prep" ? task.prep_seconds ?? 1 : task.response_seconds ?? 1;

  return (
    <div className="mt-5 space-y-4">
      <div className="card p-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600">Đề bài</span>
          {task.task_type === "read_aloud" && (
            <button onClick={() => speak(task.prompt, 0.95)} className="btn btn-ghost !py-1 text-xs"><Volume2 className="h-4 w-4" />Nghe mẫu đọc</button>
          )}
        </div>
        <Markdown>{task.prompt}</Markdown>
        {task.image_description && (
          <div className="mt-4 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-5 text-slate-100">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400"><ImageIcon className="h-4 w-4" />Hình ảnh</div>
            {task.image_description}
          </div>
        )}
        <div className="mt-3 text-xs text-slate-500">Chuẩn bị {task.prep_seconds ?? 0}s · Trả lời {task.response_seconds ?? 0}s</div>
      </div>

      <div className="card p-6 text-center">
        {phase === "ready" && <button className="btn btn-primary !px-8" onClick={begin}><Mic className="h-4 w-4" />Bắt đầu</button>}
        {(phase === "prep" || phase === "record") && (
          <>
            <div className={cn("text-sm font-bold uppercase tracking-wider", phase === "prep" ? "text-amber-600" : "text-rose-600")}>
              {phase === "prep" ? "Thời gian chuẩn bị" : "● Đang ghi âm"}
            </div>
            <div className="mt-1 font-mono text-5xl font-extrabold">{left}s</div>
            <div className="mx-auto mt-3 h-2 max-w-sm rounded-full bg-slate-100">
              <div className={cn("h-2 rounded-full", phase === "prep" ? "bg-amber-400" : "bg-rose-500")} style={{ width: `${(left / total) * 100}%` }} />
            </div>
            <div className="mt-4 flex justify-center gap-2">
              {phase === "prep" && <button className="btn btn-outline" onClick={() => { setLeft(0); }}>Bắt đầu nói ngay</button>}
              {phase === "record" && <button className="btn bg-rose-500 text-white" onClick={stopRecording}><Square className="h-4 w-4" />Dừng</button>}
            </div>
          </>
        )}
        {phase === "done" && audioUrl && (
          <>
            <div className="font-bold">Bài nói của bạn</div>
            <audio src={audioUrl} controls className="mx-auto mt-3 w-full max-w-md" />
            <button className="btn btn-outline mt-3" onClick={begin}><RotateCcw className="h-4 w-4" />Nói lại</button>
          </>
        )}
        {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
      </div>

      <div className="card p-6">
        <button className="btn btn-outline" onClick={() => setShowSample((v) => !v)}><Play className="h-4 w-4" />{showSample ? "Ẩn bài mẫu" : "Xem bài mẫu"}</button>
        {showSample && task.sample_answer && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4">
            <p className="leading-relaxed text-slate-800">{task.sample_answer}</p>
            <button onClick={() => speak(task.sample_answer!, 0.95)} className="btn btn-ghost mt-2 !py-1 text-xs"><Volume2 className="h-4 w-4" />Nghe bài mẫu</button>
          </div>
        )}
        {task.tips_md && <div className="mt-4"><Markdown className="prose-sm">{task.tips_md}</Markdown></div>}
      </div>
    </div>
  );
}
