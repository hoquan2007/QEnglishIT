import Link from "next/link";
import { DictionaryLookup } from "@/components/vocab/DictionaryLookup";

export const metadata = {
  title: "Tra từ điển tiếng Anh",
  description: "Tra từ và cụm tiếng Anh, xem phiên âm IPA, ví dụ và nghĩa tiếng Việt khi có.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Tra từ điển tiếng Anh</h1>
        <p className="mt-2 text-sm text-slate-600">
          Nhập từ hoặc cụm tiếng Anh để xem cách phát âm, nghĩa và ví dụ.
        </p>
      </header>
      <DictionaryLookup />
      <p className="text-sm">
        <Link href="/tu-vung-tieng-anh" className="font-semibold text-brand-700 underline underline-offset-4">
          Tìm theo nghĩa tiếng Việt trong kho từ vựng
        </Link>
      </p>
    </div>
  );
}
