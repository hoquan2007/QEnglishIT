"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen, GraduationCap, Headphones, FileText, PenLine, Flame, Library, Map, Info,
  ChevronDown, Mail, Menu, X, User, LogOut, BarChart3, Settings, Shield,
} from "lucide-react";
import { Logo } from "./Logo";
import { NAV } from "./nav";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useAuthUser } from "@/lib/useAuth";

const ICONS = { BookOpen, GraduationCap, Headphones, FileText, PenLine, Flame, Library, Map, Info } as const;

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabaseBrowser()
      .from("feedback_messages")
      .select("id", { count: "exact", head: true })
      .eq("from_admin", true)
      .is("read_at", null)
      .then(({ count }) => setUnread(count ?? 0));
  }, [user]);

  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMobileOpen(false);
    setMenuOpen(false);
  }

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Logo />
        <nav className="mx-auto hidden items-center gap-0.5 xl:flex">
          {NAV.map((item) => {
            const Icon = ICONS[item.icon as keyof typeof ICONS];
            const isActive = active(item.href) || item.children?.some((c) => active(c.href));
            return (
              <div key={item.label} className="group relative">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700",
                    isActive && "bg-brand-50 text-brand-700",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.children && <ChevronDown className="h-3.5 w-3.5" />}
                </Link>
                {item.children && (
                  <div className="invisible absolute left-0 top-full pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
                    <div className="card w-64 p-2 shadow-xl">
                      {item.children.map((c) => (
                        <Link key={c.href} href={c.href} className="block rounded-lg px-3 py-2 hover:bg-brand-50">
                          <div className="text-sm font-semibold text-slate-800">{c.label}</div>
                          {c.desc && <div className="text-xs text-slate-500">{c.desc}</div>}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-0">
          {user ? (
            <>
              <Link href="/hop-thu" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Hộp thư">
                <Mail className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
              <div className="relative">
                <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white">
                    {(user.email ?? "U")[0].toUpperCase()}
                  </span>
                  <span className="hidden max-w-36 truncate text-sm font-medium text-slate-700 xl:block">{user.email}</span>
                </button>
                {menuOpen && (
                  <div className="card absolute right-0 top-full mt-2 w-56 p-1.5 shadow-xl">
                    <MenuLink href="/tien-do-hoc-tap" icon={<BarChart3 className="h-4 w-4" />}>Tiến độ học tập</MenuLink>
                    <MenuLink href="/account-profile" icon={<Settings className="h-4 w-4" />}>Hồ sơ cá nhân</MenuLink>
                    <MenuLink href="/vocabulary-sets" icon={<Library className="h-4 w-4" />}>Bộ từ vựng của tôi</MenuLink>
                    <MenuLink href="/hop-thu" icon={<Mail className="h-4 w-4" />}>Hộp thư</MenuLink>
                    <MenuLink href="/admin" icon={<Shield className="h-4 w-4" />}>Quản trị</MenuLink>
                    <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">
                      <LogOut className="h-4 w-4" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : user === undefined ? (
            <span className="h-9 w-24 animate-pulse rounded-xl bg-slate-100" aria-hidden />
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">Đăng nhập</Link>
              <Link href="/signup" className="btn btn-primary !py-2">
                <User className="h-4 w-4" /> Đăng ký
              </Link>
            </>
          )}
          <button className="rounded-lg p-2 xl:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 xl:hidden">
          {NAV.map((item) => (
            <div key={item.label} className="py-1">
              <Link href={item.href} className="block rounded-lg px-3 py-2 font-semibold text-slate-800 hover:bg-brand-50">
                {item.label}
              </Link>
              {item.children?.map((c) => (
                <Link key={c.href} href={c.href} className="block rounded-lg px-6 py-1.5 text-sm text-slate-600 hover:bg-brand-50">
                  {c.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
      {icon}
      {children}
    </Link>
  );
}
