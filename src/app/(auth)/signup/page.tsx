import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Tạo tài khoản miễn phí" };

export default function Page() {
  return (
    <AuthShell title="Tạo tài khoản miễn phí" subtitle="Lưu tiến độ, streak và lịch sử thi của bạn">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
