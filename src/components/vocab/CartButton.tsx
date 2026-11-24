"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

let cartCache: Set<string> | null = null;
let loading: Promise<Set<string>> | null = null;

async function loadCart() {
  if (cartCache) return cartCache;
  if (!loading) {
    loading = (async () => {
      const sb = supabaseBrowser();
      const { data: u } = await sb.auth.getUser();
      if (!u.user) return new Set<string>();
      const { data } = await sb.from("user_vocabulary_cart").select("word_id");
      cartCache = new Set((data ?? []).map((d) => d.word_id as string));
      return cartCache;
    })();
  }
  return loading;
}

export function CartButton({ wordId, className }: { wordId: string; className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    loadCart().then((s) => setOn(s.has(wordId)));
  }, [wordId]);

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    const sb = supabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    if (!u.user) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    const cart = await loadCart();
    if (on) {
      await sb.from("user_vocabulary_cart").delete().eq("user_id", u.user.id).eq("word_id", wordId);
      cart.delete(wordId);
    } else {
      await sb.from("user_vocabulary_cart").insert({ user_id: u.user.id, word_id: wordId });
      cart.add(wordId);
    }
    setOn(!on);
  }

  return (
    <button onClick={toggle} className={cn("rounded-full p-2 hover:bg-ui-rose-tint", className)} aria-label="Đánh dấu từ">
      <Heart className={cn("h-4 w-4", on ? "fill-rose-500 text-ui-rose-bright" : "text-ui-faint")} />
    </button>
  );
}
