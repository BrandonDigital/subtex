"use client";

import { create } from "zustand";

interface SidebarStore {
  isOpen: boolean;
  isHovered: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setHovered: (hovered: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>((set) => ({
  isOpen: false,
  isHovered: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open: boolean) => set({ isOpen: open }),
  setHovered: (hovered: boolean) => set({ isHovered: hovered }),
}));
