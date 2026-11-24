"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, Save } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function ProfileForm({ email, profile, referralLink }: { email: string; profile: { display_name: string; target_score: number; avatar_url: string }; referralLink: string }) {
  const [p, setP] = useState(profile);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    const { error } = await sb.from("profiles").update({ display_name: p.display_name, target_score: p.target_score, avatar_url: p.avatar_url || null }).eq("id", u.user!.id);
    setMsg(error ? error.message : "Đã lưu thay đổi!");
  }

  return (
    <>
      <form onSubmit={save} className="card mt-6 space-y-4 p-6">
        <label className="block"><span className="mb-1 block text-sm font-medium">Email</span><input className="input bg-ui-canvas" value={email} disabled /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Tên hiển thị</span><input className="input" value={p.display_name} onChange={(e) => setP({ ...p, display_name: e.target.value })} /></label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Mục tiêu điểm TOEIC: <b className="text-ui-brand-text">{p.target_score}</b></span>
          <input type="range" min={300} max={990} step={5} value={p.target_score} onChange={(e) => setP({ ...p, target_score: Number(e.target.value) })} className="w-full accent-cyan-500" />
        </label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Ảnh đại diện (URL)</span><input className="input" value={p.avatar_url} onChange={(e) => setP({ ...p, avatar_url: e.target.value })} placeholder="https://..." /></label>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary"><Save className="h-4 w-4" />Lưu</button>
          <Link href="/reset-password" className="btn btn-ghost">Đổi mật khẩu</Link>
          {msg && <span className="text-sm text-ui-emerald-text">{msg}</span>}
        </div>
      </form>
      <div className="card mt-4 p-6">
        <h2 className="font-bold">Mời bạn bè cùng học</h2>
        <p className="text-sm text-ui-muted">Chia sẻ liên kết giới thiệu của bạn.</p>
        <div className="mt-3 flex gap-2">
          <input className="input" value={referralLink} readOnly />
          <button className="btn btn-outline" onClick={() => { navigator.clipboard.writeText(referralLink); setCopied(true); }}><Copy className="h-4 w-4" />{copied ? "Đã chép" : "Sao chép"}</button>
        </div>
      </div>
    </>
  );
}
