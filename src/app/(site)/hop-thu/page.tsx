import { Mail } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { Inbox } from "@/components/Inbox";

export const metadata = { title: "Hộp thư" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const sb = await supabaseServer();
  const { data: threads } = await sb
    .from("user_feedback")
    .select("id, kind, message, page_url, status, created_at, feedback_messages(id, body, from_admin, read_at, created_at)")
    .order("created_at", { ascending: false });
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-extrabold"><Mail className="h-7 w-7 text-brand-500" />Hộp thư</h1>
      <p className="text-slate-500">Phản hồi, báo lỗi của bạn và câu trả lời từ đội ngũ QEnglishIT.</p>
      <Inbox threads={(threads ?? []) as never} />
    </div>
  );
}
