"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function ReferralLanding({ code }: { code: string }) {
  const router = useRouter();
  useEffect(() => {
    try {
      localStorage.setItem("qe-ref", code);
    } catch {}
    supabaseBrowser().from("referral_events").insert({ code, event: "visit" }).then(() => router.replace("/signup"));
  }, [code, router]);
  return <div className="grid min-h-screen place-items-center text-ui-muted">Đang chuyển hướng...</div>;
}
