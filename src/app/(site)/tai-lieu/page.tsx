import Link from "next/link";
import { FolderOpen, Download, FileText } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { PageHero } from "@/components/PageHero";

export const metadata = { title: "Tài liệu TOEIC miễn phí" };
export const revalidate = 300;

export default async function Page() {
  const sb = supabasePublic();
  const { data } = await sb.from("documents").select("slug, title, description, category, file_type, downloads").order("created_at");
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHero badge="Tài liệu" icon={<FolderOpen className="h-3.5 w-3.5" />} title={<>Tài liệu <span className="text-brand-500">TOEIC</span> miễn phí</>}
        desc="Bảng tổng hợp, cheat sheet và mẫu câu do đội ngũ QEnglishIT biên soạn — đọc online, in hoặc tải về." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((d) => (
          <Link key={d.slug} href={`/tai-lieu/${d.slug}`} className="card flex gap-4 p-5 transition hover:shadow-lg">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500"><FileText className="h-6 w-6" /></span>
            <div className="min-w-0">
              <div className="font-bold">{d.title}</div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{d.description}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                <span className="chip !py-0">{d.category}</span>
                <span className="flex items-center gap-1"><Download className="h-3 w-3" />{d.downloads}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
