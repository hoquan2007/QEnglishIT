"use client";

import Link from "next/link";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Card with a soft spotlight that follows the cursor (React Bits "SpotlightCard" style).
 * Only two CSS variables change on pointer move — no React re-render, no layout.
 */
export function SpotlightCard({
  href,
  className,
  children,
}: {
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const cls = cn("spotlight-card", className);
  if (href)
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} onPointerMove={onMove} className={cls}>
        {children}
      </Link>
    );
  return (
    <div ref={ref as React.Ref<HTMLDivElement>} onPointerMove={onMove} className={cls}>
      {children}
    </div>
  );
}
