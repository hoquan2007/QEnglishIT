import { notFound } from "next/navigation";
import { getTestBySlug, getTestGroups } from "@/lib/queries";
import { TestRunner } from "@/components/tests/TestRunner";

export const metadata = { title: "Làm đề TOEIC – Thi thử và luyện tập" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mode?: string; parts?: string; time?: string; review?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const test = await getTestBySlug(slug);
  if (!test) notFound();
  const parts = sp.parts
    ? sp.parts.split(",").map(Number).filter((n) => n >= 1 && n <= 7)
    : [1, 2, 3, 4, 5, 6, 7];
  const groups = await getTestGroups(test.id, parts);
  const mode = sp.mode === "practice" ? "practice" : "exam";
  const time = sp.time ? Number(sp.time) : 0;
  return (
    <TestRunner
      key={`${slug}-${mode}-${parts.join("")}-${sp.review ?? ""}`}
      test={test}
      groups={groups}
      mode={mode}
      parts={parts}
      timeLimitMinutes={time}
      reviewAttemptId={sp.review}
    />
  );
}
