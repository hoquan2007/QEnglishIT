import { supabaseServer } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/ProfileForm";
import { SITE_URL } from "@/lib/utils";

export const metadata = { title: "Hồ sơ cá nhân" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const sb = await supabaseServer();
  const { data: u } = await sb.auth.getUser();
  const { data: p } = await sb.from("profiles").select("*").eq("id", u.user!.id).single();
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-extrabold">Hồ sơ cá nhân</h1>
      <ProfileForm
        email={u.user!.email ?? ""}
        profile={{ display_name: p?.display_name ?? "", target_score: p?.target_score ?? 650, avatar_url: p?.avatar_url ?? "" }}
        referralLink={`${SITE_URL}/r/${p?.referral_code}`}
      />
    </div>
  );
}
