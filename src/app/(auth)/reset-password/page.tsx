import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Đặt lại mật khẩu" };

export default function Page() {
  return (
    <AuthShell title="Đặt lại mật khẩu" subtitle="Nhập mật khẩu mới cho tài khoản">
      <Suspense>
        <AuthForm mode="reset" />
      </Suspense>
    </AuthShell>
  );
}
