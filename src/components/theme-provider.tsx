"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("timetap-theme") as Theme | null;
    const initial = stored === "light" ? "light" : "dark";
    setThemeState(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  function applyTheme(t: Theme) {
    if (t === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem("timetap-theme", t);
    applyTheme(t);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
