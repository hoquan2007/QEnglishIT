import { FamilyPage } from "@/components/vocab/FamilyPage";
import { FAMILIES } from "@/lib/vocab";

export const metadata = { title: `${FAMILIES["1000-50-ngay"].title} ${FAMILIES["1000-50-ngay"].highlight}` };
export const revalidate = 300;

export default function Page() {
  return <FamilyPage family="1000-50-ngay" />;
}
