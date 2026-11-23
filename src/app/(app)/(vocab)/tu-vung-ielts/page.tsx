import { FamilyPage } from "@/components/vocab/FamilyPage";
import { FAMILIES } from "@/lib/vocab";

export const metadata = { title: `${FAMILIES["ielts"].title} ${FAMILIES["ielts"].highlight}` };
export const revalidate = 300;

export default function Page() {
  return <FamilyPage family="ielts" />;
}
