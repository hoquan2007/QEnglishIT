"use client";

import Link from "next/link";
import { useState } from "react";
import { Star } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function ReviewForm() {
  const [f, setF] = useState({ display_name: "", rating: 5, score_before: "", score_after: "", content: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return setNeedLogin(true);
    const { error } = await sb.from("student_reviews").insert({
      user_id: u.user.id, display_name: f.display_name, rating: f.rating, content: f.content,
      score_before: f.score_before ? Number(f.score_before) : null, score_after: f.score_after ? Number(f.score_after) : null,
    });
    setMsg(error ? error.message : "Cảm ơn bạn! Đánh giá sẽ hiển thị sau khi được duyệt.");
  }

  return (
    <form onSubmit={submit} className="card h-fit space-y-3 p-5 lg:sticky lg:top-20">
      <h2 className="font-bold">Viết đánh giá</h2>
      <input className="input" placeholder="Tên hiển thị" required value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} />
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setF({ ...f, rating: n })} aria-label={`${n} sao`}>
            <Star className={`h-6 w-6 ${n <= f.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className="input" type="number" placeholder="Điểm trước" value={f.score_before} onChange={(e) => setF({ ...f, score_before: e.target.value })} />
        <input className="input" type="number" placeholder="Điểm sau" value={f.score_after} onChange={(e) => setF({ ...f, score_after: e.target.value })} />
      </div>
      <textarea className="input min-h-28" placeholder="Chia sẻ trải nghiệm của bạn..." required value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
      <button className="btn btn-primary w-full">Gửi đánh giá</button>
      {needLogin && <p className="text-sm text-slate-600">Vui lòng <Link href="/login?next=/danh-gia" className="text-brand-600 underline">đăng nhập</Link> để gửi đánh giá.</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
    </form>
  );
}
