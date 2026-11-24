"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot" | "reset";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/tien-do-hoc-tap";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const sb = supabaseBrowser();
    try {
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else if (mode === "signup") {
        const ref = (() => {
          try {
            return localStorage.getItem("qe-ref");
          } catch {
            return null;
          }
        })();
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, ref },
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) throw error;
        if (ref) await sb.from("referral_events").insert({ code: ref, event: "signup" });
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setInfo("Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư để kích hoạt tài khoản.");
        }
      } else if (mode === "forgot") {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback?next=/reset-password`,
        });
        if (error) throw error;
        setInfo("Đã gửi liên kết đặt lại mật khẩu tới email của bạn.");
      } else {
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
        setInfo("Đổi mật khẩu thành công!");
        setTimeout(() => router.push("/tien-do-hoc-tap"), 800);
      }
    } catch (err) {
      setError(translateError((err as Error).message));
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {(mode === "login" || mode === "signup") && (
        <>
          <button type="button" onClick={google} className="btn btn-outline w-full !border-ui-line !text-ui-body">
            <GoogleIcon /> Tiếp tục với Google
          </button>
          <div className="flex items-center gap-3 text-xs text-ui-faint">
            <div className="h-px flex-1 bg-ui-track" /> hoặc <div className="h-px flex-1 bg-ui-track" />
          </div>
        </>
      )}
      {mode === "signup" && (
        <Field label="Họ và tên"><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
      )}
      {mode !== "reset" && (
        <Field label="Email"><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></Field>
      )}
      {mode !== "forgot" && (
        <Field label={mode === "reset" ? "Mật khẩu mới" : "Mật khẩu"}>
          <input type="password" className="input" value={password} minLength={6} onChange={(e) => setPassword(e.target.value)} required
            autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </Field>
      )}
      {mode === "login" && (
        <div className="text-right text-sm"><Link href="/forgot-password" className="text-ui-brand-text hover:underline">Quên mật khẩu?</Link></div>
      )}
      {error && <p className="rounded-lg bg-ui-rose-tint p-3 text-sm text-ui-rose-text">{error}</p>}
      {info && <p className="rounded-lg bg-ui-emerald-tint p-3 text-sm text-ui-emerald-strong">{info}</p>}
      <button className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Đang xử lý..." : { login: "Đăng nhập", signup: "Đăng ký miễn phí", forgot: "Gửi liên kết", reset: "Đổi mật khẩu" }[mode]}
      </button>
      <p className="text-center text-sm text-ui-muted">
        {mode === "login" ? (
          <>Chưa có tài khoản? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-ui-brand-text">Đăng ký</Link></>
        ) : (
          <>Đã có tài khoản? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-ui-brand-text">Đăng nhập</Link></>
        )}
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ui-body">{label}</span>
      {children}
    </label>
  );
}

function translateError(m: string) {
  if (/invalid login/i.test(m)) return "Email hoặc mật khẩu không đúng.";
  if (/already registered/i.test(m)) return "Email này đã được đăng ký.";
  if (/email not confirmed/i.test(m)) return "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.";
  if (/password/i.test(m) && /6/.test(m)) return "Mật khẩu cần ít nhất 6 ký tự.";
  return m;
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
