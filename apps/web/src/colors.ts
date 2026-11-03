export type Theme = "cyanotype" | "whiteprint";

/** Graph inks for each print process. Cyanotype: white linework on Prussian blue. Whiteprint: navy ink on cool paper. */
export interface Inks {
  ground: string;
  ink: string;
  muted: string;
  line: string;
  select: string;
  added: string;
  revision: string;
  groups: string[];
  categorical: string[];
  language: { TypeScript: string; JavaScript: string; other: string };
}

export const inks: Record<Theme, Inks> = {
  cyanotype: {
    ground: "#0f3157",
    ink: "#eef5ff",
    muted: "#6f93bb",
    line: "#a9c3df",
    select: "#ffd45c",
    added: "#8ff0c8",
    revision: "#ff8a75",
    groups: ["#eef5ff", "#9fe3ff", "#c9b6ff", "#8ff0c8", "#e9d8a6", "#9db4ff"],
    categorical: [
      "#9fe3ff",
      "#c9b6ff",
      "#8ff0c8",
      "#e9d8a6",
      "#ffb59e",
      "#9db4ff",
    ],
    language: {
      TypeScript: "#9fe3ff",
      JavaScript: "#e9d8a6",
      other: "#c9b6ff",
    },
  },
  whiteprint: {
    ground: "#edf1f5",
    ink: "#12305a",
    muted: "#93a8c0",
    line: "#4f6a8a",
    select: "#b87a00",
    added: "#0d7a58",
    revision: "#c8402a",
    groups: ["#12305a", "#1d6fb8", "#6b4fb0", "#0d7a58", "#8a6a1f", "#3f5f8f"],
    categorical: [
      "#1d6fb8",
      "#6b4fb0",
      "#0d7a58",
      "#8a6a1f",
      "#a4452f",
      "#3f5f8f",
    ],
    language: {
      TypeScript: "#1d6fb8",
      JavaScript: "#8a6a1f",
      other: "#6b4fb0",
    },
  },
};

export function groupColor(
  group: string,
  groups: string[],
  theme: Theme = "cyanotype",
): string {
  const list = inks[theme].groups;
  return list[Math.max(0, groups.indexOf(group)) % list.length];
}

export function authorColor(
  author: string | undefined,
  ranked: string[],
  theme: Theme,
): string {
  const i = author ? ranked.indexOf(author) : -1;
  return i < 0 || i >= inks[theme].categorical.length
    ? inks[theme].muted
    : inks[theme].categorical[i];
}

/** Linear blend of two hex colours, used to keep edges and dimmed nodes on the paper instead of fading to black. */
export function mixHex(
  a: string,
  b: string,
  t: number,
): [number, number, number] {
  const p = (h: string) =>
    [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const x = p(a),
    y = p(b);
  return [0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as [
    number,
    number,
    number,
  ];
}
