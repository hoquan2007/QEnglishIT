"use client";

import { useState } from "react";
import { FolderPlus, Check } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Set = { id: string; title: string };

export function AddToSet({ wordId }: { wordId: string }) {
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState<Set[] | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  async function openMenu() {
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    const { data } = await sb.from("vocabulary_sets").select("id, title").order("created_at", { ascending: false });
    setSets(data ?? []);
    setOpen(true);
  }

  async function add(setId: string) {
    await supabaseBrowser().from("vocabulary_set_items").upsert({ set_id: setId, word_id: wordId });
    setAdded(setId);
    setTimeout(() => setOpen(false), 600);
  }

  async function create() {
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    if (!u.user || !newTitle.trim()) return;
    const { data } = await sb.from("vocabulary_sets").insert({ user_id: u.user.id, title: newTitle.trim() }).select("id, title").single();
    if (data) {
      setNewTitle("");
      await add(data.id);
    }
  }

  return (
    <div className="relative">
      <button onClick={openMenu} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600" aria-label="Thêm vào bộ từ">
        <FolderPlus className="h-4 w-4" />
      </button>
      {open && (
        <div className="card absolute right-0 top-full z-20 mt-1 w-56 p-2 shadow-xl">
          <div className="px-2 pb-1 text-xs font-semibold text-slate-500">Thêm vào bộ từ</div>
          {(sets ?? []).map((s) => (
            <button key={s.id} onClick={() => add(s.id)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100">
              {s.title}{added === s.id && <Check className="h-4 w-4 text-emerald-500" />}
            </button>
          ))}
          <div className="mt-1 flex gap-1 border-t border-slate-100 pt-2">
            <input className="input !py-1 text-sm" placeholder="Bộ mới..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <button className="btn btn-primary !px-2 !py-1 text-xs" onClick={create}>Tạo</button>
          </div>
          <button className="mt-1 w-full text-xs text-slate-400" onClick={() => setOpen(false)}>Đóng</button>
        </div>
      )}
    </div>
  );
}
