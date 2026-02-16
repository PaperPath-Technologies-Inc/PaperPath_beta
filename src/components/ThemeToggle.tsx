"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "paperpath_theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    setTheme(current);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(THEME_KEY, next);
    setTheme(next);
  };

  return (
    <button className="theme-btn" onClick={toggle} type="button" aria-label="Toggle theme">
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
