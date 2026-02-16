import type { Metadata } from "next";
import "@/styles/globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "PaperPath Technologies",
  description: "Deadlines, reminders, vault, and profile tracking for students + PGWP.",
};

const themeScript = `
(function () {
  try {
    var key = 'paperpath_theme';
    var saved = localStorage.getItem(key);
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved === 'dark' || (saved !== 'light' && prefersDark) ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <div style={{ position: "fixed", top: "0.85rem", right: "0.85rem", zIndex: 50 }}>
          <ThemeToggle />
        </div>
        {children}
      </body>
    </html>
  );
}
