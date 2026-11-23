import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Đăng nhập" };

export default function Page() {
  return (
    <AuthShell title="Đăng nhập" subtitle="Chào mừng trở lại QEnglishIT">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
