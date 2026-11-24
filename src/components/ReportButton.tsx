"use client";

import { useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function ReportButton({ questionId, label = "Báo lỗi/Góp ý" }: { questionId?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    const { error } = await sb.from("user_feedback").insert({
      user_id: u.user?.id ?? null,
      kind: "report",
      question_id: questionId ?? null,
      page_url: window.location.pathname + window.location.search,
      message: msg,
    });
    setSending(false);
    if (!error) {
      setDone(true);
      setMsg("");
    }
  }

  return (
    <>
      <button onClick={() => { setOpen(true); setDone(false); }} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-ui-muted hover:bg-ui-subtle">
        <TriangleAlert className="h-3.5 w-3.5" /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ui-overlay/50 dark:bg-ui-overlay/75 p-4" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Báo lỗi / Góp ý</h3>
              <button onClick={() => setOpen(false)} aria-label="Đóng"><X className="h-5 w-5" /></button>
            </div>
            {done ? (
              <p className="mt-4 rounded-lg bg-ui-emerald-tint p-3 text-sm text-ui-emerald-strong">Cảm ơn bạn! Phản hồi đã được gửi, đội ngũ sẽ trả lời trong Hộp thư.</p>
            ) : (
              <>
                <textarea className="input mt-4 min-h-28" placeholder="Mô tả lỗi: đáp án sai, giải thích chưa đúng, audio lỗi..." value={msg} onChange={(e) => setMsg(e.target.value)} />
                <button className="btn btn-primary mt-3 w-full" disabled={!msg.trim() || sending} onClick={send}>{sending ? "Đang gửi..." : "Gửi phản hồi"}</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
