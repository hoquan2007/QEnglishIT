import { FamilyPage } from "@/components/vocab/FamilyPage";

export const metadata = { title: "Từ vựng tiếng Anh CNTT" };
export const revalidate = 300;

export default function Page() {
  return <FamilyPage family="it" />;
}
