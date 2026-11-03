import { graphCanvas } from "./hover";
import { inks } from "./colors";
import { lenses, useRepo } from "./state";

/** Renders the current drawing with a title block, the way a printed sheet carries its revision. */
export async function exportPng() {
  const source = graphCanvas.current,
    s = useRepo.getState();
  if (!source) throw new Error("The spatial view is not available to export.");
  const ink = inks[s.theme],
    scale = Math.max(1, source.width / Math.max(1, source.clientWidth)),
    strip = Math.round(64 * scale),
    out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height + strip;
  const g = out.getContext("2d")!;
  g.fillStyle = ink.ground;
  g.fillRect(0, 0, out.width, out.height);
  g.strokeStyle = ink.line;
  g.globalAlpha = 0.12;
  g.lineWidth = 1;
  const cell = 24 * scale;
  for (let x = 0; x < out.width; x += cell)
    g.strokeRect(x, 0, 0, source.height);
  for (let y = 0; y < source.height; y += cell)
    g.strokeRect(0, y, out.width, 0);
  g.globalAlpha = 1;
  g.drawImage(source, 0, 0);
  g.strokeStyle = ink.ink;
  g.globalAlpha = 0.5;
  g.strokeRect(0.5, source.height + 0.5, out.width - 1, strip - 1);
  g.globalAlpha = 1;
  const commit = s.commits.find((c) => c.sha === s.snapshot.sha),
    lens = lenses.find((l) => l.id === s.lens)?.name ?? "",
    cells = [
      [
        "Repository",
        s.snapshot.repository + (s.snapshot.demo ? " (demo)" : ""),
      ],
      ["Lens", `${lens} · ${s.layout === "layers" ? "Layers" : "Cloud"}`],
      [
        "Revision",
        (s.compareBase ? s.compareBase.slice(0, 7) + " → " : "") +
          s.snapshot.sha.slice(0, 7),
      ],
      ["Sheet", commit?.message ?? ""],
    ];
  const w = out.width / cells.length;
  cells.forEach(([label, value], i) => {
    const x = i * w + 16 * scale;
    g.fillStyle = ink.line;
    g.font = `600 ${10 * scale}px "Barlow Condensed", sans-serif`;
    g.fillText(label.toUpperCase(), x, source.height + 24 * scale);
    g.fillStyle = ink.ink;
    g.font = `500 ${14 * scale}px Barlow, sans-serif`;
    g.fillText(
      value.slice(0, 48),
      x,
      source.height + 46 * scale,
      w - 24 * scale,
    );
  });
  const blob = await new Promise<Blob | null>((r) =>
    out.toBlob(r, "image/png"),
  );
  if (!blob) throw new Error("The browser could not create the image.");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${s.snapshot.repository.replace("/", "-")}-${s.snapshot.sha.slice(0, 7)}-${s.lens}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
