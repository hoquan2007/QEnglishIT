"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function ViewPing({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `qe-view-${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    supabaseBrowser().rpc("increment_blog_views", { _slug: slug });
  }, [slug]);
  return null;
}
