import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QEnglishIT — Luyện thi TOEIC",
    short_name: "QEnglishIT",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f9fc",
    theme_color: "#06b6d4",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
