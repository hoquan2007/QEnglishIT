export const THEME_KEY = "qe-theme";

// Run before the page paints, including when localStorage is unavailable.
export const THEME_BOOTSTRAP = `(() => {
  let theme;
  try { theme = localStorage.getItem(${JSON.stringify(THEME_KEY)}); } catch {}
  document.documentElement.dataset.theme =
    theme === "dark" || theme === "light" ? theme :
      matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
})();`;
