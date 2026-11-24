"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_KEY } from "@/lib/theme";

type Theme = "light" | "dark";
let sessionPreference: Theme | null = null;

function readPreference(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // The current tab still supports manual switching without storage.
  }
  return sessionPreference;
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0b1422" : "#06b6d4");
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function ThemeSync() {
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => applyTheme(readPreference() ?? (media.matches ? "dark" : "light"));
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) {
        sessionPreference = null;
        sync();
      }
    };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return null;
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light");
  const label = theme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối";
  function toggle() {
    const next = getTheme() === "dark" ? "light" : "dark";
    sessionPreference = next;
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    applyTheme(next);
  }

  return (
    <button type="button" className="theme-toggle grid size-9 shrink-0 place-items-center rounded-xl border border-ui-line bg-ui-surface text-ui-secondary hover:bg-ui-brand-tint hover:text-ui-brand-strong"
      aria-label={label} title={label} onClick={toggle}>
      <Moon className="theme-moon size-[18px]" aria-hidden="true" />
      <Sun className="theme-sun size-[18px]" aria-hidden="true" />
    </button>
  );
}
