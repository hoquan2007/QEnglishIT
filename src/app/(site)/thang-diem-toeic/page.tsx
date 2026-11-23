import Link from "next/link";
import { Gauge } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { SCORE_TABLE, scaleListening, scaleReading } from "@/lib/toeic";
import { ScoreCalculator } from "@/components/ScoreCalculator";

export const metadata = { title: "Thang điểm TOEIC & cách tính điểm" };

export default function Page() {
  const rows = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHero badge="Thang điểm TOEIC" icon={<Gauge className="h-3.5 w-3.5" />} title={<>Thang điểm <span className="text-brand-500">TOEIC 990</span></>}
        desc="Điểm TOEIC Listening & Reading gồm 2 phần, mỗi phần 5–495 điểm. Điểm quy đổi phụ thuộc vào số câu đúng; bảng dưới đây là ước tính QEnglishIT dùng để chấm bài thi thử." />
      <ScoreCalculator />
      <div className="card mt-6 overflow-x-auto p-5">
        <h2 className="mb-3 font-bold">Trình độ theo điểm số</h2>
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th className="py-2">Điểm</th><th>Trình độ</th><th>CEFR</th><th>Mô tả</th></tr></thead>
          <tbody>{SCORE_TABLE.map((r) => <tr key={r.range} className="border-t border-slate-100"><td className="py-2 font-bold">{r.range}</td><td>{r.level}</td><td>{r.cefr}</td><td className="text-slate-600">{r.desc}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="card mt-6 overflow-x-auto p-5">
        <h2 className="mb-3 font-bold">Bảng quy đổi số câu đúng (ước tính)</h2>
        <table className="w-full min-w-[420px] text-center text-sm">
          <thead className="text-xs text-slate-500"><tr><th className="py-2">Số câu đúng</th><th>Listening</th><th>Reading</th></tr></thead>
          <tbody>{rows.map((n) => <tr key={n} className="border-t border-slate-100"><td className="py-1.5 font-semibold">{n}</td><td>{scaleListening(n)}</td><td>{scaleReading(n)}</td></tr>)}</tbody>
        </table>
        <p className="mt-3 text-xs text-slate-400">Điểm thi thật do ETS quy đổi theo từng đề và có thể chênh lệch. <Link className="text-brand-600" href="/luyen-de-toeic">Làm đề thi thử</Link> để biết điểm ước tính của bạn.</p>
      </div>
    </div>
  );
}
