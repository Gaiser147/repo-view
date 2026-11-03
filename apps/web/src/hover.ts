import { create } from "zustand";
/** Pointer hover lives in its own store so pointer movement never re-renders the whole shell. */
export const useHover = create<{
  id: string | null;
  x: number;
  y: number;
  set: (id: string | null, x?: number, y?: number) => void;
}>((set) => ({
  id: null,
  x: 0,
  y: 0,
  set: (id, x = 0, y = 0) => set({ id, x, y }),
}));
/** The live WebGL canvas, read by PNG export without importing the lazy graph module. */
export const graphCanvas: { current: HTMLCanvasElement | null } = {
  current: null,
};
