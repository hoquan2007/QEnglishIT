import { notFound } from "next/navigation";
import { getTestBySlug, getTestGroups } from "@/lib/queries";
import { TestRunner } from "@/components/tests/TestRunner";
import { getToeicParts } from "@/lib/toeic";

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
  const availableParts = getToeicParts(test);
  const requestedParts = sp.parts?.split(",").map(Number).filter((part) => part >= 1 && part <= 7);
  const groups = await getTestGroups(test.id, availableParts.length && requestedParts?.length ? requestedParts : availableParts);
  const parts = [...new Set(groups.map((group) => group.part))];
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
