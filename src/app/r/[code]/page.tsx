import { ReferralLanding } from "@/components/ReferralLanding";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ReferralLanding code={code.replace(/[^a-z0-9]/gi, "").slice(0, 16)} />;
}
