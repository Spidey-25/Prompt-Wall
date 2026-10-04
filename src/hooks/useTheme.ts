"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "promptwall-theme";

/**
 * useTheme — manages light/dark theme with localStorage persistence and reactive state.
 *
 * Black mode ("dark"): Obsidian black background (#050505) with dark cards & glowing accents.
 * White mode ("light"): Pure crisp white background (#FFFFFF / #FAFAFA) with light cards & dark text.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "dark";
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const html = document.documentElement;
    if (mode === "light") {
      html.classList.add("light");
      html.classList.remove("dark");
    } else {
      html.classList.add("dark");
      html.classList.remove("light");
    }
  };

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    applyTheme(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const toggle = useCallback(() => {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}
