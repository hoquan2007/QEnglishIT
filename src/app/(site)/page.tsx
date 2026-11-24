import Link from "next/link";
import {
  BookOpen, Headphones, Library, Flame, FileText, Map, CheckCircle2, Sparkles, TrendingUp,
  MessageCircleQuestion, ArrowRight, Download, Smartphone,
} from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { CountUp } from "@/components/motion/CountUp";
import { SpotlightCard } from "@/components/motion/SpotlightCard";

export const revalidate = 300;

const FEATURES = [
  { icon: BookOpen, title: "Ngữ pháp TOEIC", desc: "Hệ thống bài học từ cơ bản đến nâng cao, giúp bạn chinh phục Part 5 & Part 6.", href: "/ngu-phap-toeic", color: "bg-ui-sky-soft text-ui-sky-text" },
  { icon: Headphones, title: "Luyện nghe 4 chế độ", desc: "Điền từ, nghe check, nghe chép và nghe full — luyện tai đa chiều cho Part 1–4.", href: "/luyen-nghe-toeic", color: "bg-ui-violet-soft text-ui-violet-text" },
  { icon: Library, title: "Từ vựng thông minh", desc: "Từ vựng TOEIC theo chủ đề kèm flashcard, lặp lại ngắt quãng và lộ trình 50 ngày.", href: "/tu-vung-toeic", color: "bg-ui-emerald-soft text-ui-emerald-text" },
  { icon: Flame, title: "Luyện đề chuẩn format", desc: "Đề full test 200 câu, chấm điểm tự động thang 990 và phân tích theo từng Part.", href: "/luyen-de-toeic", color: "bg-ui-orange-soft text-ui-orange-text" },
  { icon: FileText, title: "Luyện đọc song ngữ", desc: "Part 7 song ngữ Anh – Việt, hiểu từng đoạn văn và mở rộng vốn từ nhanh chóng.", href: "/luyen-doc-toeic", color: "bg-ui-cyan-soft text-ui-cyan-text" },
  { icon: Map, title: "Lộ trình 800+", desc: "Bài viết, bài tập và đề thi sắp xếp theo lộ trình từ dễ đến khó.", href: "/lo-trinh-hoc-toeic", color: "bg-ui-rose-soft text-ui-rose-text" },
];

const STEPS = [
  { n: "01", title: "Chọn kỹ năng bạn muốn cải thiện", desc: "Ngữ pháp, từ vựng, nghe, đọc hay làm đề thi thử — tất cả trên một nền tảng." },
  { n: "02", title: "Làm bài & nhận phản hồi tức thì", desc: "Biết đúng/sai ngay, xem giải thích chi tiết và học từ chính lỗi sai của mình." },
  { n: "03", title: "Theo dõi tiến độ mỗi ngày", desc: "Hệ thống ghi nhận streak, XP và chỉ ra điểm mạnh/yếu để bạn tập trung đúng chỗ." },
];

export default async function HomePage() {
  const supabase = supabasePublic();
  const { data } = await supabase.rpc("get_site_stats");
  const s = (data ?? {}) as Record<string, number>;
  const stats = [
    { v: s.learners ?? 0, label: "Học viên đang học" },
    { v: s.listening_questions ?? 0, label: "Câu luyện nghe" },
    { v: s.grammar_questions ?? 0, label: "Câu hỏi ngữ pháp" },
    { v: s.words ?? 0, label: "Từ vựng" },
  ];

  return (
    <>
      <section className="hero-bg">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="enter chip !border-ui-brand-line !bg-ui-brand-tint !text-ui-brand-strong">
              <Sparkles className="h-3.5 w-3.5" /> <span className="shiny-text">Nền tảng luyện TOEIC miễn phí hiệu quả</span>
            </span>
            <h1 style={{ "--d": 1 } as React.CSSProperties} className="enter mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Luyện Thi <span className="text-gradient">TOEIC Online</span>
              <br />
              Dễ dàng hơn bao giờ hết
            </h1>
            <p style={{ "--d": 2 } as React.CSSProperties} className="enter mt-5 max-w-xl text-lg text-ui-secondary">
              <b>QEnglishIT</b> — Miễn phí khóa học và luyện TOEIC. Luyện đề, Nghe, Đọc, Ngữ pháp & Từ vựng với đa dạng chế độ học và giải thích chi tiết từng đáp án.
            </p>
            <div style={{ "--d": 3 } as React.CSSProperties} className="enter mt-8 flex flex-wrap gap-3">
              <Link href="/hoc-toeic-online" className="btn btn-primary !px-6 !py-3">Khóa học miễn phí <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/luyen-de-toeic" className="btn btn-outline !px-6 !py-3">Luyện đề thi TOEIC</Link>
            </div>
            <ul style={{ "--d": 4 } as React.CSSProperties} className="enter mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ui-secondary">
              {["Đăng ký miễn phí, bắt đầu ngay", "Theo dõi tiến độ học tập", "Giải thích chi tiết từng câu"].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-ui-emerald-bright" />{t}</li>
              ))}
            </ul>
          </div>
          <HeroVisual />
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 pb-16 md:grid-cols-4">
          {stats.map((st, i) => (
            <div key={st.label} style={{ "--d": i + 3 } as React.CSSProperties} className="enter card lift p-5 text-center">
              <div className="text-3xl font-extrabold text-ui-brand-text"><CountUp to={st.v} suffix="+" /></div>
              <div className="mt-1 text-sm text-ui-muted">{st.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="reveal mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold md:text-4xl">Luyện TOEIC toàn diện — Chỉ cần 1 nền tảng</h2>
          <p className="mt-3 text-ui-secondary">Từ ngữ pháp, từ vựng, luyện nghe đến luyện đề chuẩn format — tất cả đều có trên QEnglishIT.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <SpotlightCard key={f.title} href={f.href} className="reveal card lift group p-6">
              <div className={`grid h-12 w-12 place-items-center rounded-xl ${f.color}`}><f.icon className="h-6 w-6" /></div>
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-ui-secondary">{f.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ui-brand-text">
                Khám phá ngay <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </SpotlightCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4">
        <div className="reveal grid items-center gap-10 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 dark:from-brand-800 to-sky-700 p-8 text-white md:grid-cols-2 md:p-14">
          <div>
            <div className="text-sm font-semibold uppercase tracking-widest text-brand-100">Học TOEIC miễn phí</div>
            <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">Chinh phục TOEIC 800+ ngay hôm nay</h2>
            <p className="mt-3 text-brand-50">Hàng nghìn câu hỏi, đề thi thử và lộ trình cá nhân hoá — tất cả miễn phí.</p>
            <Link href="/lo-trinh-hoc-toeic" className="btn mt-7 bg-ui-surface !px-6 !py-3 text-ui-brand-strong hover:bg-ui-brand-tint">Bắt đầu luyện ngay <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <ul className="grid gap-3">
            {[
              [Headphones, "Luyện nghe, ngữ pháp, từ vựng toàn diện"],
              [CheckCircle2, "Giải thích chi tiết từng đáp án"],
              [MessageCircleQuestion, "Báo lỗi & hỏi đáp trực tiếp với đội ngũ"],
              [TrendingUp, "Lưu tiến độ & streak học tập"],
            ].map(([Icon, t]) => {
              const I = Icon as typeof Headphones;
              return (
                <li key={t as string} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                  <I className="h-5 w-5 shrink-0" /> {t as string}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="reveal text-center">
          <h2 className="text-3xl font-extrabold md:text-4xl">Chỉ 3 bước để chinh phục TOEIC</h2>
          <p className="mt-3 text-ui-secondary">Lộ trình đơn giản, hiệu quả — giúp bạn tiến bộ rõ rệt từng ngày.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="reveal card lift p-7">
              <div className="text-4xl font-extrabold text-ui-brand-decoration">{s.n}</div>
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm text-ui-secondary">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4">
        <div className="reveal card grid items-center gap-8 p-8 md:grid-cols-[auto_1fr] md:p-12">
          <div className="grid h-20 w-20 place-items-center rounded-3xl bg-ui-brand-tint text-ui-brand-text"><Smartphone className="h-10 w-10" /></div>
          <div>
            <div className="text-sm font-semibold text-ui-brand-text"><Download className="mr-1 inline h-4 w-4" />Tải app miễn phí</div>
            <h2 className="mt-1 text-2xl font-extrabold">Biến điện thoại thành lớp học TOEIC cá nhân</h2>
            <ol className="mt-4 grid gap-2 text-sm text-ui-secondary md:grid-cols-3">
              <li><b>1.</b> Mở QEnglishIT trên Chrome/Safari điện thoại</li>
              <li><b>2.</b> Nhấn biểu tượng ⋮ hoặc nút Chia sẻ</li>
              <li><b>3.</b> Chọn “Thêm vào màn hình chính” — học ngay</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="reveal mx-auto max-w-3xl px-4 pt-20 text-center">
        <h2 className="text-3xl font-extrabold">Đừng để TOEIC cản bước thăng tiến của bạn!</h2>
        <p className="mt-3 text-ui-secondary">Luyện tập đều đặn 30 phút mỗi ngày — bạn sẽ thấy điểm số thay đổi sau 30 ngày.</p>
        <Link href="/signup" className="btn btn-primary mt-7 !px-8 !py-3">Bắt đầu luyện ngay</Link>
      </section>
    </>
  );
}

function HeroVisual() {
  return (
    <div style={{ "--d": 2 } as React.CSSProperties} className="enter relative mx-auto w-full max-w-md">
      <div className="float-slow card rotate-1 p-5 shadow-2xl">
        <div className="flex items-center justify-between text-xs text-ui-muted">
          <span className="font-semibold text-ui-brand-text">Câu 104 · Part 5</span>
          <span className="rounded-full bg-ui-orange-soft px-2 py-0.5 font-semibold text-ui-orange-text">01:24:10</span>
        </div>
        <p className="mt-3 text-sm font-medium">The marketing team will ------- the results of the survey at Friday&apos;s meeting.</p>
        <div className="mt-3 grid gap-2 text-sm">
          {["(A) presentation", "(B) present", "(C) presented", "(D) presenting"].map((o, i) => (
            <div key={o} className={`rounded-lg border px-3 py-2 ${i === 1 ? "border-emerald-400 bg-ui-emerald-tint font-semibold text-ui-emerald-strong" : "border-ui-line"}`}>{o}</div>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-ui-brand-tint p-3 text-xs text-ui-secondary">
          <b className="text-ui-brand-strong">Giải thích:</b> sau động từ khuyết thiếu “will” cần động từ nguyên mẫu → <b>present</b>.
        </div>
      </div>
      <div className="float card absolute -bottom-8 -left-6 hidden w-44 -rotate-3 p-4 shadow-xl sm:block">
        <div className="text-xs text-ui-muted">Điểm dự đoán</div>
        <div className="text-3xl font-extrabold text-ui-brand-text"><CountUp to={785} /></div>
        <div className="mt-2 h-2 rounded-full bg-ui-subtle"><div className="bar-grow h-2 w-4/5 rounded-full bg-brand-500" /></div>
      </div>
      <div className="float card absolute -right-4 -top-6 hidden -rotate-6 px-4 py-3 shadow-xl sm:block">
        <div className="flex items-center gap-2 text-sm font-bold text-ui-orange-bright"><Flame className="h-5 w-5" />12 ngày streak</div>
      </div>
    </div>
  );
}
