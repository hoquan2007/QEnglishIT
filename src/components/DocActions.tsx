"use client";

import { Download, Printer } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

export function DocActions({ id, slug, title, content, fileUrl }: { id: string; slug: string; title: string; content: string; fileUrl: string | null }) {
  function download() {
    supabaseBrowser().rpc("increment_document_downloads", { _id: id });
    if (fileUrl) {
      window.open(fileUrl, "_blank");
      return;
    }
    const blob = new Blob([`# ${title}\n\n${content}\n\n— QEnglishIT`], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qenglishit-${slug}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <div className="mt-4 flex gap-2 print:hidden">
      <button onClick={download} className="btn btn-primary"><Download className="h-4 w-4" />Tải về</button>
      <button onClick={() => { supabaseBrowser().rpc("increment_document_downloads", { _id: id }); window.print(); }} className="btn btn-outline"><Printer className="h-4 w-4" />In / Lưu PDF</button>
    </div>
  );
}
