import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { InstallPrompt } from "@/components/InstallPrompt";

const font = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam",
});

export const metadata: Metadata = {
  title: { default: "QEnglishIT — Luyện Thi TOEIC Miễn Phí Online", template: "%s | QEnglishIT" },
  description:
    "QEnglishIT — Miễn phí khóa học và luyện TOEIC. Luyện đề, Nghe, Đọc, Ngữ pháp & Từ vựng với nhiều chế độ học và giải thích chi tiết từng đáp án.",
  applicationName: "QEnglishIT",
};

export const viewport: Viewport = { themeColor: "#06b6d4" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={font.variable}>
      <body className="min-h-screen font-sans antialiased">
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
