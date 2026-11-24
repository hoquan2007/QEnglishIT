"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/lib/useAuth";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CountUp } from "@/components/motion/CountUp";

export function DictationProgress() {
  const user = useAuthUser();
  const [done, setDone] = useState<number | null>(null);
  useEffect(() => {
    if (!user) return;
    supabaseBrowser()
      .from("listening_check_progress")
      .select("item_key", { count: "exact", head: true })
      .eq("correct", true)
      .then(({ count }) => setDone(count ?? 0));
  }, [user]);

  if (user === undefined) return <div className="card h-28 animate-pulse bg-ui-subtle/60" />;
  return (
    <div className="card p-6">
      {user ? (
        <>
          <div className="text-sm text-ui-muted">Số câu đã nghe chép đúng</div>
          <div className="text-4xl font-extrabold text-ui-emerald-text">{done === null ? "…" : <CountUp to={done} />}</div>
        </>
      ) : (
        <p className="text-ui-muted"><Link href="/login?next=/luyen-nghe-toeic" className="text-ui-brand-text underline">Đăng nhập</Link> để lưu tiến độ nghe chép.</p>
      )}
    </div>
  );
}
