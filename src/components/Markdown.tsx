import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function Markdown({ children, className }: { children: string | null | undefined; className?: string }) {
  if (!children) return null;
  return (
    <div className={cn("prose prose-slate max-w-none prose-headings:font-extrabold prose-a:text-brand-600 prose-table:text-sm prose-th:bg-slate-50 prose-td:border prose-th:border prose-th:px-3 prose-td:px-3", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
