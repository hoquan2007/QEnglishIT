"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void> };

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("qe-install-dismissed") === "1";
    } catch {}
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      if (!dismissed) setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (hidden || !evt) return null;
  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem("qe-install-dismissed", "1");
    } catch {}
  };
  return (
    <div className="card fixed bottom-4 left-4 right-4 z-50 flex max-w-sm gap-3 p-4 shadow-2xl sm:left-auto">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ui-brand-fill text-white">
        <Download className="h-5 w-5" />
      </div>
      <div className="text-sm">
        <div className="font-bold">Cài đặt ứng dụng QEnglishIT</div>
        <p className="text-ui-muted">Truy cập nhanh từ màn hình chính, học TOEIC như một ứng dụng thật.</p>
        <div className="mt-2 flex gap-2">
          <button className="btn btn-primary !px-3 !py-1.5 text-xs" onClick={() => evt.prompt().then(close)}>Cài đặt</button>
          <button className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={close}>Để sau</button>
        </div>
      </div>
      <button onClick={close} className="self-start text-ui-faint" aria-label="Đóng"><X className="h-4 w-4" /></button>
    </div>
  );
}
