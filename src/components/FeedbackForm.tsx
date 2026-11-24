"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function FeedbackForm() {
  const [kind, setKind] = useState("suggestion");
  const [message, setMessage] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    const { error } = await sb.from("user_feedback").insert({ user_id: u.user?.id ?? null, kind, message, page_url: "/gop-y-chia-se" });
    if (error) setMsg(error.message);
    else {
      setMessage("");
      setMsg(u.user ? "Đã gửi! Theo dõi phản hồi trong Hộp thư." : "Đã gửi! Đăng nhập lần sau để nhận phản hồi trong Hộp thư.");
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div className="flex gap-2">
        {[["suggestion", "Góp ý tính năng"], ["report", "Báo lỗi"], ["story", "Chia sẻ"]].map(([k, l]) => (
          <button type="button" key={k} className="chip" data-active={kind === k} onClick={() => setKind(k)}>{l}</button>
        ))}
      </div>
      <textarea className="input min-h-40" required placeholder="Nội dung..." value={message} onChange={(e) => setMessage(e.target.value)} />
      <button className="btn btn-primary"><Send className="h-4 w-4" />Gửi</button>
      {msg && <p className="text-sm text-ui-emerald-strong">{msg}</p>}
    </form>
  );
}
