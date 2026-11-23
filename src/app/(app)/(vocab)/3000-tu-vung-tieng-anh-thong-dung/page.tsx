import { FamilyPage } from "@/components/vocab/FamilyPage";
import { FAMILIES } from "@/lib/vocab";

export const metadata = { title: `${FAMILIES["3000"].title} ${FAMILIES["3000"].highlight}` };
export const revalidate = 300;

export default function Page() {
  return <FamilyPage family="3000" />;
}
