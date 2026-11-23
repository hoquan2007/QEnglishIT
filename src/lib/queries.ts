import { supabaseServer } from "./supabase/server";
import type { Attempt, QuestionGroup, Test } from "./types";

export async function getTests(): Promise<Test[]> {
  const sb = await supabaseServer();
  const { data } = await sb.from("tests").select("*").eq("is_published", true).order("collection", { ascending: false }).order("sort_order");
  return (data ?? []) as Test[];
}

export async function getTestBySlug(slug: string): Promise<Test | null> {
  const sb = await supabaseServer();
  const { data } = await sb.from("tests").select("*").eq("slug", slug).maybeSingle();
  return data as Test | null;
}

export async function getTestGroups(testId: string, parts?: number[]): Promise<QuestionGroup[]> {
  const sb = await supabaseServer();
  let q = sb.from("question_groups").select("*, questions(*)").eq("test_id", testId);
  if (parts?.length) q = q.in("part", parts);
  const { data } = await q.order("part").order("group_order");
  const groups = (data ?? []) as QuestionGroup[];
  groups.forEach((g) => g.questions.sort((a, b) => a.number - b.number));
  return groups;
}

export async function getMyAttempts(): Promise<Attempt[]> {
  const sb = await supabaseServer();
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return [];
  const { data } = await sb.from("test_attempts").select("*").eq("user_id", u.user.id).order("started_at", { ascending: false });
  return (data ?? []) as Attempt[];
}
