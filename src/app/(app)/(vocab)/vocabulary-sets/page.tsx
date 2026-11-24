import Link from "next/link";
import { FolderHeart } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { PageHero } from "@/components/PageHero";
import { NewSetForm, DeleteSetButton } from "@/components/vocab/SetForms";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Bộ từ vựng của tôi" };

export default async function Page() {
  const sb = await supabaseServer();
  const { data } = await sb.from("vocabulary_sets").select("id, title, description, created_at, vocabulary_set_items(count)").order("created_at", { ascending: false });
  return (
    <>
      <PageHero badge="Bộ từ vựng" icon={<FolderHeart className="h-3.5 w-3.5" />} title="Bộ từ vựng của tôi" desc="Tự tạo bộ từ, thêm từ từ bất kỳ bài học nào bằng nút thư mục và học lại bằng flashcard." />
      <NewSetForm />
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((s) => (
          <div key={s.id} className="card p-5">
            <Link href={`/vocabulary-sets/${s.id}`} className="text-lg font-bold hover:text-ui-brand-strong">{s.title}</Link>
            {s.description && <p className="text-sm text-ui-muted">{s.description}</p>}
            <div className="mt-3 flex items-center justify-between text-xs text-ui-muted">
              <span>{(s.vocabulary_set_items as unknown as { count: number }[])?.[0]?.count ?? 0} từ · {formatDate(s.created_at)}</span>
              <DeleteSetButton id={s.id} />
            </div>
          </div>
        ))}
      </div>
      {!data?.length && <p className="mt-6 text-center text-ui-muted">Bạn chưa có bộ từ nào.</p>}
    </>
  );
}
