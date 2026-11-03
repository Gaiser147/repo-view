import { graphCanvas } from "./hover";
import { inks } from "./colors";
import { lenses, useRepo } from "./state";

/**
 * Renders the current drawing as a sheet: the part of the graph not covered by
 * floating panels, its visible labels, a zone-referenced frame and a title
 * block with repository, lens, legend and revision.
 */
export async function exportPng() {
  const source = graphCanvas.current,
    s = useRepo.getState();
  if (!source) throw new Error("The spatial view is not available to export.");
  const ink = inks[s.theme],
    rect = source.getBoundingClientRect(),
    scale = source.width / Math.max(1, rect.width),
    wide = rect.width > 760,
    card = wide ? document.querySelector(".lens-card:not(.collapsed)") : null,
    inspector = wide ? document.querySelector(".inspector") : null,
    left = card ? card.getBoundingClientRect().right - rect.left + 8 : 0,
    right = inspector
      ? rect.right - inspector.getBoundingClientRect().left + 8
      : 0,
    crop = {
      x: left,
      y: 0,
      w: Math.max(200, rect.width - left - right),
      h: rect.height,
    },
    margin = 28,
    strip = 76,
    out = document.createElement("canvas");
  out.width = Math.round((crop.w + margin * 2) * scale);
  out.height = Math.round((crop.h + margin * 2 + strip) * scale);
  const g = out.getContext("2d")!;
  g.scale(scale, scale);
  const W = crop.w + margin * 2,
    H = crop.h + margin * 2;
  g.fillStyle = ink.ground;
  g.fillRect(0, 0, W, H + strip);
  g.strokeStyle = ink.line;
  g.globalAlpha = 0.12;
  g.lineWidth = 1;
  for (let x = margin; x < W - margin; x += 24)
    g.strokeRect(x, margin, 0, crop.h);
  for (let y = margin; y < H - margin; y += 24)
    g.strokeRect(margin, y, crop.w, 0);
  g.globalAlpha = 1;
  g.drawImage(
    source,
    crop.x * scale,
    crop.y * scale,
    crop.w * scale,
    crop.h * scale,
    margin,
    margin,
    crop.w,
    crop.h,
  );
  // Labels that are on screen, drawn as the drawing's own callouts.
  g.textBaseline = "middle";
  for (const el of document.querySelectorAll<HTMLElement>(
    ".cluster-label, .node-label",
  )) {
    const r = el.getBoundingClientRect();
    if (!r.width || getComputedStyle(el.parentElement!).visibility === "hidden")
      continue;
    const x = r.left - rect.left - crop.x + margin,
      y = r.top - rect.top - crop.y + margin;
    if (
      x < margin ||
      y < margin ||
      x + r.width > W - margin ||
      y + r.height > H - margin
    )
      continue;
    g.fillStyle = s.theme === "cyanotype" ? "#0d2c4f" : "#f8fafc";
    g.fillRect(x, y, r.width, r.height);
    g.strokeStyle = el.textContent?.includes("Δ") ? ink.revision : ink.line;
    g.strokeRect(x + 0.5, y + 0.5, r.width - 1, r.height - 1);
    g.fillStyle = ink.ink;
    g.font = el.classList.contains("cluster-label")
      ? '600 11px "Barlow Condensed", sans-serif'
      : '400 11px "JetBrains Mono", monospace';
    g.fillText(
      Array.from(el.childNodes)
        .map((n) => n.textContent?.trim() ?? "")
        .filter(Boolean)
        .join(" ")
        .slice(0, 40),
      x + 6,
      y + r.height / 2,
      r.width - 10,
    );
  }
  g.textBaseline = "alphabetic";
  // Sheet frame with zone references.
  const cols = 8,
    rows = 6;
  g.strokeStyle = ink.ink;
  g.globalAlpha = 0.5;
  g.strokeRect(margin - 0.5, margin - 0.5, crop.w + 1, crop.h + 1);
  g.fillStyle = ink.line;
  g.font = '600 10px "Barlow Condensed", sans-serif';
  g.textAlign = "center";
  for (let i = 0; i < cols; i++) {
    g.fillText(
      String(i + 1),
      margin + ((i + 0.5) * crop.w) / cols,
      margin - 10,
    );
    if (i) g.fillRect(margin + (i * crop.w) / cols, margin - 6, 1, 6);
  }
  for (let j = 0; j < rows; j++) {
    g.fillText(
      "ABCDEF"[j],
      margin / 2,
      margin + ((j + 0.5) * crop.h) / rows + 3,
    );
    if (j) g.fillRect(margin - 6, margin + (j * crop.h) / rows, 6, 1);
  }
  g.textAlign = "start";
  g.globalAlpha = 1;
  // Title block.
  const commit = s.commits.find((c) => c.sha === s.snapshot.sha),
    lens = lenses.find((l) => l.id === s.lens)?.name ?? "",
    legend = document.querySelector(".lens-lead")?.textContent?.trim() ?? "",
    cells: [string, string, number][] = [
      [
        "Repository",
        s.snapshot.repository + (s.snapshot.demo ? " (demo)" : ""),
        1,
      ],
      ["Lens", `${lens} · ${s.layout === "layers" ? "Layers" : "Cloud"}`, 0.8],
      ["Legend", legend, 1.8],
      [
        "Revision",
        (s.compareBase ? s.compareBase.slice(0, 7) + " → " : "") +
          s.snapshot.sha.slice(0, 7),
        0.8,
      ],
      ["Sheet", commit?.message ?? "", 1.4],
    ];
  const top = H,
    total = cells.reduce((a, c) => a + c[2], 0);
  g.strokeStyle = ink.ink;
  g.globalAlpha = 0.5;
  g.strokeRect(margin - 0.5, top + 0.5, crop.w + 1, strip - margin / 2);
  g.globalAlpha = 1;
  let x = margin;
  for (const [label, value, weight] of cells) {
    const w = (crop.w * weight) / total;
    if (x > margin) {
      g.globalAlpha = 0.3;
      g.fillStyle = ink.ink;
      g.fillRect(x, top, 1, strip - margin / 2);
      g.globalAlpha = 1;
    }
    g.fillStyle = ink.line;
    g.font = '600 10px "Barlow Condensed", sans-serif';
    g.fillText(label.toUpperCase(), x + 10, top + 18);
    g.fillStyle = ink.ink;
    g.font = "500 13px Barlow, sans-serif";
    g.fillText(value, x + 10, top + 38, w - 20);
    x += w;
  }
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
