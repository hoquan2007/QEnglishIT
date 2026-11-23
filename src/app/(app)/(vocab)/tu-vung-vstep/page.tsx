import { FamilyPage } from "@/components/vocab/FamilyPage";
import { FAMILIES } from "@/lib/vocab";

export const metadata = { title: `${FAMILIES["vstep"].title} ${FAMILIES["vstep"].highlight}` };
export const revalidate = 300;

export default function Page() {
  return <FamilyPage family="vstep" />;
}
