import { Shield } from "lucide-react";
import { isAdmin, supabaseServer } from "@/lib/supabase/server";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const metadata = { title: "Quản trị" };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Shield className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-slate-600">Bạn không có quyền truy cập trang quản trị.</p>
      </div>
    );
  }
  const sb = await supabaseServer();
  const [{ data: stats }, { data: feedback }, { data: reviews }, { data: attempts }] = await Promise.all([
    sb.rpc("get_site_stats"),
    sb.from("user_feedback").select("id, user_id, kind, message, page_url, status, created_at, question_id").order("created_at", { ascending: false }).limit(100),
    sb.from("student_reviews").select("*").eq("is_approved", false).order("created_at", { ascending: false }),
    sb.from("test_attempts").select("id", { count: "exact", head: true }),
  ]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-extrabold"><Shield className="h-7 w-7 text-brand-500" />Quản trị QEnglishIT</h1>
      <AdminPanel stats={{ ...(stats as Record<string, number>), attempts: (attempts as unknown as { count?: number })?.count ?? 0 }} feedback={feedback ?? []} reviews={reviews ?? []} />
    </div>
  );
}
