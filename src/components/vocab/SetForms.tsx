"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function NewSetForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    if (!u.user || !title.trim()) return;
    await sb.from("vocabulary_sets").insert({ user_id: u.user.id, title: title.trim(), description: desc.trim() || null });
    setTitle("");
    setDesc("");
    router.refresh();
  }
  return (
    <form onSubmit={create} className="card flex flex-col gap-2 p-4 sm:flex-row">
      <input className="input" placeholder="Tên bộ từ mới" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <input className="input" placeholder="Mô tả (không bắt buộc)" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <button className="btn btn-primary"><Plus className="h-4 w-4" />Tạo bộ từ</button>
    </form>
  );
}

export function DeleteSetButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      className="rounded p-1 text-ui-faint hover:text-ui-rose-text"
      aria-label="Xoá bộ từ"
      onClick={async () => {
        if (!confirm("Xoá bộ từ này?")) return;
        await supabaseBrowser().from("vocabulary_sets").delete().eq("id", id);
        router.refresh();
      }}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
