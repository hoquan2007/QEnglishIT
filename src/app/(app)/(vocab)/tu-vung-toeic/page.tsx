import { FamilyPage } from "@/components/vocab/FamilyPage";
import { FAMILIES } from "@/lib/vocab";

export const metadata = { title: `${FAMILIES["toeic"].title} ${FAMILIES["toeic"].highlight}` };
export const revalidate = 300;

export default function Page() {
  return <FamilyPage family="toeic" />;
}
