"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Send } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

type FB = { id: string; user_id: string | null; kind: string; message: string; page_url: string | null; status: string; created_at: string; question_id: string | null };
type RV = { id: string; display_name: string; content: string; rating: number; created_at: string };

const STAT_LABEL: Record<string, string> = { learners: "Học viên", tests: "Đề thi", listening_questions: "Câu nghe", grammar_questions: "Câu ngữ pháp", words: "Từ vựng", grammar_topics: "Chủ điểm", attempts: "Lượt làm bài" };

export function AdminPanel({ stats, feedback, reviews }: { stats: Record<string, number>; feedback: FB[]; reviews: RV[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"fb" | "rv">("fb");
  const [reply, setReply] = useState<Record<string, string>>({});

  async function sendReply(f: FB) {
    const body = reply[f.id]?.trim();
    if (!body || !f.user_id) return;
    const sb = supabaseBrowser();
    await sb.from("feedback_messages").insert({ user_id: f.user_id, feedback_id: f.id, from_admin: true, body });
    await sb.from("user_feedback").update({ status: "resolved" }).eq("id", f.id);
    setReply({ ...reply, [f.id]: "" });
    router.refresh();
  }

  async function approve(id: string) {
    await supabaseBrowser().from("student_reviews").update({ is_approved: true }).eq("id", id);
    router.refresh();
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {Object.entries(stats).map(([k, v]) => (
          <div key={k} className="card p-4"><div className="text-xs text-slate-500">{STAT_LABEL[k] ?? k}</div><div className="text-2xl font-extrabold text-brand-600">{v}</div></div>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        <button className="chip" data-active={tab === "fb"} onClick={() => setTab("fb")}>Phản hồi ({feedback.filter((f) => f.status === "open").length} mở)</button>
        <button className="chip" data-active={tab === "rv"} onClick={() => setTab("rv")}>Đánh giá chờ duyệt ({reviews.length})</button>
      </div>
      {tab === "fb" ? (
        <div className="mt-4 space-y-3">
          {feedback.map((f) => (
            <div key={f.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="chip !py-0">{f.kind}</span>
                <span className={f.status === "open" ? "text-amber-600" : "text-emerald-600"}>{f.status}</span>
                <span>{formatDate(f.created_at)}</span>
                {f.page_url && <a href={f.page_url} className="text-brand-600 underline">{f.page_url}</a>}
                {f.question_id && <span>QID {f.question_id.slice(0, 8)}</span>}
              </div>
              <p className="mt-2">{f.message}</p>
              {f.user_id ? (
                <div className="mt-3 flex gap-2">
                  <input className="input !py-1.5" placeholder="Trả lời người dùng..." value={reply[f.id] ?? ""} onChange={(e) => setReply({ ...reply, [f.id]: e.target.value })} />
                  <button className="btn btn-primary !py-1.5" onClick={() => sendReply(f)}><Send className="h-4 w-4" /></button>
                </div>
              ) : <p className="mt-2 text-xs text-slate-400">Khách (không đăng nhập) — không thể trả lời.</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="card flex items-start gap-4 p-4">
              <div className="flex-1"><b>{r.display_name}</b> · {r.rating}★<p className="mt-1 text-sm text-slate-600">{r.content}</p></div>
              <button className="btn btn-primary !py-1.5" onClick={() => approve(r.id)}><Check className="h-4 w-4" />Duyệt</button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-8 text-sm text-slate-500">Nhập nội dung hàng loạt: chỉnh file JSON trong <code>content/</code> rồi chạy <code>npm run seed</code>.</p>
    </>
  );
}
