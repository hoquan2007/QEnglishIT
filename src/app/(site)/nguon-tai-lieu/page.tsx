import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { supabasePublic } from "@/lib/supabase/public";

export const metadata = { title: "Nguồn tài liệu và ghi công" };
export const revalidate = 3600;

type ContentSource = {
  id: string;
  title: string;
  license: string;
  attribution: string | null;
  notes: string | null;
  url: string | null;
};

function officialUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export default async function Page() {
  let sources: ContentSource[] = [];
  let loadFailed = false;

  try {
    const sb = supabasePublic();
    const { data, error } = await sb
      .from("content_sources")
      .select("id, title, license, attribution, notes, url")
      .order("title")
      .order("id")
      .returns<ContentSource[]>();
    if (error) loadFailed = true;
    else sources = data ?? [];
  } catch {
    loadFailed = true;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PageHero
        title="Nguồn tài liệu và ghi công"
        desc="Thông tin nguồn, giấy phép và ghi công của các tài liệu được sử dụng trên QEnglishIT. Xem ghi chú và trang chính thức của từng nguồn để biết thêm chi tiết."
      />
      {loadFailed ? (
        <div role="alert" className="card p-6">
          <h2 className="font-bold">Chưa tải được nguồn tài liệu</h2>
          <p className="mt-2 text-sm text-slate-600">
            Không thể tải danh sách nguồn lúc này. Vui lòng tải lại trang hoặc thử lại sau.
          </p>
          <Link href="/nguon-tai-lieu" className="btn btn-outline mt-4">Thử lại</Link>
        </div>
      ) : sources.length === 0 ? (
        <div className="card p-6">
          <h2 className="font-bold">Chưa có nguồn tài liệu</h2>
          <p className="mt-2 text-sm text-slate-600">
            Danh sách nguồn chưa được cập nhật. Vui lòng quay lại sau để xem thông tin giấy phép và ghi công.
          </p>
        </div>
      ) : (
        <ul aria-label="Danh sách nguồn tài liệu" className="space-y-4">
          {sources.map((source) => {
            const url = officialUrl(source.url);
            return (
              <li key={source.id} className="card min-w-0 p-5 md:p-6">
                <h2 className="break-words text-lg font-bold">{source.title}</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  {[
                    ["Giấy phép", source.license],
                    ["Ghi công", source.attribution],
                    ["Ghi chú", source.notes],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="font-semibold text-slate-900">{label}</dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words text-slate-600">
                        {value?.trim() || "Chưa có thông tin."}
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt className="font-semibold text-slate-900">Trang chính thức</dt>
                    <dd className="mt-1 break-words text-slate-600">
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 underline underline-offset-4 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
                        >
                          {url}<span className="sr-only"> (mở trong thẻ mới)</span>
                        </a>
                      ) : source.url?.trim() ? "URL không hợp lệ hoặc không được hỗ trợ." : "Chưa có liên kết chính thức."}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
