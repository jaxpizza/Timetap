import { create } from "zustand";

interface SidebarState {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: typeof window !== "undefined"
    ? localStorage.getItem("timetap-sidebar-collapsed") === "true"
    : false,
  setCollapsed: (collapsed) => {
    localStorage.setItem("timetap-sidebar-collapsed", String(collapsed));
    set({ collapsed });
  },
  toggle: () =>
    set((state) => {
      const next = !state.collapsed;
      localStorage.setItem("timetap-sidebar-collapsed", String(next));
      return { collapsed: next };
    }),
}));
