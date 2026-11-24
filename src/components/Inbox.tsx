"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn, formatDate } from "@/lib/utils";

type Msg = { id: string; body: string; from_admin: boolean; read_at: string | null; created_at: string };
type Thread = { id: string; kind: string; message: string; page_url: string | null; status: string; created_at: string; feedback_messages: Msg[] };

export function Inbox({ threads }: { threads: Thread[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(threads[0]?.id ?? null);
  const [reply, setReply] = useState("");

  useEffect(() => {
    const t = threads.find((x) => x.id === open);
    const unread = t?.feedback_messages.filter((m) => m.from_admin && !m.read_at).map((m) => m.id) ?? [];
    if (unread.length) supabaseBrowser().from("feedback_messages").update({ read_at: new Date().toISOString() }).in("id", unread);
  }, [open, threads]);

  async function send(t: Thread) {
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    if (!reply.trim() || !u.user) return;
    await sb.from("feedback_messages").insert({ user_id: u.user.id, feedback_id: t.id, body: reply.trim() });
    setReply("");
    router.refresh();
  }

  if (!threads.length) {
    return <div className="card mt-6 p-10 text-center text-ui-muted">Chưa có tin nhắn. Gửi góp ý tại <Link className="text-ui-brand-text underline" href="/gop-y-chia-se">Góp ý & chia sẻ</Link>.</div>;
  }

  return (
    <div className="mt-6 space-y-3">
      {threads.map((t) => {
        const msgs = [...t.feedback_messages].sort((a, b) => a.created_at.localeCompare(b.created_at));
        const unread = msgs.some((m) => m.from_admin && !m.read_at);
        return (
          <div key={t.id} className="card overflow-hidden">
            <button onClick={() => setOpen(open === t.id ? null : t.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-ui-canvas">
              {unread && <span className="h-2 w-2 rounded-full bg-rose-500" />}
              <span className="chip !py-0.5 text-xs">{t.kind === "report" ? "Báo lỗi" : "Góp ý"}</span>
              <span className="flex-1 truncate font-medium">{t.message}</span>
              <span className={cn("text-xs", t.status === "resolved" ? "text-ui-emerald-text" : "text-ui-amber-text")}>{t.status === "resolved" ? "Đã xử lý" : "Đang xử lý"}</span>
              <span className="text-xs text-ui-faint">{formatDate(t.created_at)}</span>
            </button>
            {open === t.id && (
              <div className="space-y-3 border-t border-ui-divider bg-ui-canvas p-4">
                <Bubble mine body={t.message} at={t.created_at} />
                {msgs.map((m) => <Bubble key={m.id} mine={!m.from_admin} body={m.body} at={m.created_at} />)}
                {t.page_url && <p className="text-xs text-ui-faint">Trang: {t.page_url}</p>}
                <div className="flex gap-2">
                  <input className="input" placeholder="Trả lời..." value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(t)} />
                  <button className="btn btn-primary" onClick={() => send(t)}><Send className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Bubble({ mine, body, at }: { mine: boolean; body: string; at: string }) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[80%] rounded-2xl px-4 py-2 text-sm", mine ? "bg-ui-brand-fill text-white" : "bg-ui-surface ring-1 ring-ui-line")}>
        {!mine && <div className="mb-0.5 text-xs font-bold text-ui-brand-strong">QEnglishIT</div>}
        <div className="whitespace-pre-wrap">{body}</div>
        <div className={cn("mt-1 text-[10px]", mine ? "text-brand-100" : "text-ui-faint")}>{formatDate(at)}</div>
      </div>
    </div>
  );
}
