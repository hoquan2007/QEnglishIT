import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Quên mật khẩu" };

export default function Page() {
  return (
    <AuthShell title="Quên mật khẩu" subtitle="Nhập email để nhận liên kết đặt lại mật khẩu">
      <Suspense>
        <AuthForm mode="forgot" />
      </Suspense>
    </AuthShell>
  );
}
