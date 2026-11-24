"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Menu, X } from "lucide-react";
import { LogoMark } from "./Logo";
import { cn } from "@/lib/utils";
import { ICONS, type IconName } from "./icons";

export type ShellItem = { href: string; label: string; desc?: string; icon: IconName; color?: string };
export type ShellGroup = { heading?: string; items: ShellItem[] };

export function SectionShell({
  brandSubtitle,
  title,
  groups,
  children,
}: {
  brandSubtitle: string;
  title: string;
  groups: ShellGroup[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  const sidebar = (
    <div className="flex h-full flex-col gap-1 overflow-y-auto p-4">
      <Link href="/" className="mb-4 flex items-center gap-2.5 px-1">
        <LogoMark size={34} />
        <span>
          <span className="block font-extrabold leading-none">QEnglish<span className="text-brand-500">IT</span></span>
          <span className="text-[11px] text-slate-500">{brandSubtitle}</span>
        </span>
      </Link>
      <Link href="/" className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
        <ArrowLeft className="h-4 w-4" /> Quay về trang chủ
      </Link>
      {groups.map((g, gi) => (
        <div key={gi} className="mb-1">
          {g.heading && <div className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g.heading}</div>}
          {g.items.map((it) => {
            const Icon = ICONS[it.icon];
            const active = isActive(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-100",
                  active && "bg-brand-50 ring-1 ring-brand-100",
                )}
              >
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", it.color ?? "bg-brand-100 text-brand-600")}>
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-sm font-semibold text-slate-800", active && "text-brand-700")}>{it.label}</span>
                  {it.desc && <span className="block truncate text-xs text-slate-500">{it.desc}</span>}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl">{sidebar}</aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur">
          <button className="rounded-lg p-1.5 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-semibold text-slate-700">{title}</span>
          <Link href="/tien-do-hoc-tap" prefetch={false} className="ml-auto text-sm font-medium text-brand-600 hover:underline">Tiến độ của tôi</Link>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}
