"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "./supabase/client";

/**
 * Shared, client-side auth state. Reads the session locally (no network round
 * trip) and keeps one onAuthStateChange subscription for the whole app.
 * `undefined` = still loading, `null` = signed out. UI-only: data access is
 * still protected by RLS on the server.
 */
let current: User | null | undefined = undefined;
const listeners = new Set<() => void>();
let started = false;

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const sb = supabaseBrowser();
  const set = (u: User | null) => {
    current = u;
    listeners.forEach((l) => l());
  };
  sb.auth.getSession().then(({ data }) => set(data.session?.user ?? null));
  sb.auth.onAuthStateChange((_e, s) => set(s?.user ?? null));
}

function subscribe(cb: () => void) {
  start();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAuthUser(): User | null | undefined {
  return useSyncExternalStore(subscribe, () => current, () => undefined);
}

/** Map of item_id → progress for the signed-in user (empty when signed out). */
export function useUserProgress(itemType: string, onlyCompleted = false) {
  const user = useAuthUser();
  const [progress, setProgress] = useState<Record<string, { status: string; score: number | null }>>({});
  useEffect(() => {
    if (!user) return;
    let q = supabaseBrowser().from("user_progress").select("item_id, status, score").eq("item_type", itemType);
    if (onlyCompleted) q = q.eq("status", "completed");
    let alive = true;
    q.then(({ data }) => {
      if (alive) setProgress(Object.fromEntries((data ?? []).map((p) => [p.item_id, { status: p.status, score: p.score }])));
    });
    return () => {
      alive = false;
    };
  }, [user, itemType, onlyCompleted]);
  return user ? progress : {};
}
