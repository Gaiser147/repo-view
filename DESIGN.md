---
name: repo-view
description: A luminous spatial instrument for exploring repository structure and change.
colors:
  background: "#060b14"
  panel: "#0a111b"
  separator: "#1c2a3a"
  text: "#d7e2f0"
  muted: "#8a9bb1"
  action: "#57c6ff"
  selection: "#6ee8c5"
  finding: "#e1b673"
  error: "#ff8b95"
  field: "#0c1623"
  field-border: "#293d52"
  field-text: "#dce8f7"
  button: "#183e57"
  button-border: "#346786"
  button-hover: "#20516f"
  module-cyan: "#46bcff"
  module-teal: "#6ee7e0"
  module-blue: "#4f7dff"
  module-lilac: "#b29cff"
  module-amber: "#f2b86f"
  module-slate: "#80a3ce"
typography:
  body:
    fontFamily: '"Inter Variable", sans-serif'
    fontSize: "13px"
  headline:
    fontFamily: '"Inter Variable", sans-serif'
    fontSize: "19px"
    fontWeight: 550
    lineHeight: 1.4
    letterSpacing: "-0.04em"
  title:
    fontFamily: '"Inter Variable", sans-serif'
    fontSize: "16px"
    fontWeight: 500
    letterSpacing: "-0.035em"
  label:
    fontFamily: '"Inter Variable", sans-serif'
    fontSize: "11px"
  code:
    fontFamily: '"JetBrains Mono", monospace'
    fontSize: "10px"
rounded:
  compact: "4px"
  control: "5px"
  floating: "7px"
spacing:
  compact: "4px"
  control-gap: "7px"
  panel: "20px"
  workspace: "23px"
components:
  button-primary:
    backgroundColor: "{colors.button}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.button-hover}"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-text}"
    rounded: "{rounded.control}"
    padding: "9px 11px"
  icon-button:
    rounded: "{rounded.compact}"
    width: "28px"
    height: "28px"
---

# Design System: repo-view

## Overview

The approved identity is **Morph with local Lens focus**, drawing on Flux's luminous cloud and commit timeline. A dark, dense instrument frame supports immersive spatial exploration. One persistent graph moves between organic Cloud and ordered Layers; the local focus opens one group while preserving its surroundings.

The graph supplies atmosphere and depth. Interface text, paths, measurements, and controls stay sharp. Repository state, selection, and evidence take priority over decorative effects.

**Key Characteristics:**

- Luminous point cores and additive halos within a nearly black blue workspace.
- Compact, precise controls and restrained panel surfaces.
- Stable node identities across layout changes, with local context retained.
- Explicit status, coverage, unavailable-data, and demo labels.

## Colors

The frontmatter records implemented values from `apps/web/src/styles.css` and `apps/web/src/colors.ts`.

### Primary

Cyan identifies actions, focus outlines, and active controls. Mint identifies selection and success. Graph selection uses a brighter shader tint; bloom can change the apparent brightness of graph colors.

### Secondary

Amber marks findings and coverage notes; coral marks errors and failed pipeline states. Status always carries text or a symbol alongside color. The six module colors are a categorical graph palette, repeated in group order; they do not imply quality or architectural responsibility.

### Neutral

The background, panel, separator, text, and muted tokens define the instrument frame. Fields and primary buttons use the darker blue surface variants recorded above. The graph workspace adds a radial gradient (`ellipse at 46% 47%, #09203955 0%, #060d18 64%`).

**The Evidence Rule.** Demo, missing, limited, loading, and error states remain explicit. A visual transition must never imply that repository data changed.

## Typography

Self-hosted Inter Variable supplies interface text. Self-hosted JetBrains Mono supplies code, paths, keyboard hints, and measurements. The default interface size is compact; workspace titles and Inspector headings carry hierarchy rather than large decorative display type.

The frontmatter records the base hierarchy. Navigation and primary buttons use the label size. File paths and technical metadata use the code role, with smaller local variants for dense timeline and legend labels. Paragraphs use a line height of 1.7. Strong text uses weight 550. Uppercase panel labels use 9px, weight 550, and `0.08em` tracking.

## Layout

A full-height flex instrument frame keeps the graph central, with a persistent commit history and CI strip below it. The base desktop geometry is a 63px header, 52px repository toolbar, 205px files panel, 269px Inspector, 141px history panel, 66px pipeline strip, and 28px status bar. The Inspector shows overview content when nothing is selected. The graph flexes into the remaining width; desktop panels use separators rather than floating cards.

At 1650px and wider, files and Inspector widen to 230px and 295px; header, repository toolbar, history, and CI become 68px, 56px, 155px, and 73px. At 1250px and below, files and Inspector narrow to 180px and 235px. At 1000px and below, the Inspector becomes a 280px overlay opened for context. At 700px and below, files becomes a 245px overlay, the header is 50px, and timeline, legends, and CI compress around the graph. The shell has a 620px minimum height, reduced to 570px on small screens.

Spacing is intentionally dense: compact control gaps and small field insets, with larger workspace and panel margins. Do not replace the spatial workbench with a card dashboard.

## Elevation & Depth

Panel depth comes primarily from dark tonal layering and fine borders. Floating controls, search results, settings, and mobile panels use soft black shadows. The Morph control uses `0 6px 24px #0003`; search results use `0 12px 40px #000a`; settings use `0 14px 40px #0009`. Small active indicators may glow, but text remains crisp.

The graph uses point cores, additive halos, non-interactive atmospheric specks, and bloom. Bloom belongs to spatial geometry. There is no ambient camera rotation. Low-power mode removes bloom, reduces atmospheric specks from 2600 to 600, and fixes pixel ratio at 1 instead of the normal 1–1.6 range. Software renderers are detected where renderer information is available; a slow initial frame sample also enables low-power mode. If WebGL cannot start, an explicit fallback directs users to Files and Inspector.

## Shapes

Controls have compact, gently rounded corners: four pixels for icon buttons and small labels, five for fields and primary buttons, seven for floating settings and the Morph container. Circles mark point nodes, status dots, and pipeline icons. The frame remains rectangular and divided by fine one-pixel borders.

## Components

### Buttons, fields, and navigation

Primary buttons use the blue surface, border, hover, radius, and padding tokens above. Icon buttons are compact squares with a darker blue active/hover surface. Disabled buttons use opacity 0.35 and a not-allowed cursor. Interactive controls and links receive a two-pixel cyan focus-visible outline with a four-pixel offset. Inputs use the field surface and border, muted placeholders, and cyan caret. Navigation uses a cyan active underline with a restrained glow.

### Morph and local focus

Cloud and Layers are two targets for the same graph, with attached edge endpoints and stable selection. The implemented transition uses reversible exponential damping (5.1, capped frame delta 0.05s, settling threshold 0.0005), settling in approximately 1.5 seconds under normal frame timing. It is not a fixed-duration timeline. Focus unfolds only the selected group; other groups retain their cloud positions and dim to 24% tint. Focus damping is 4. A second focus toggle or Escape closes focus. Entering global Layers clears local focus while retaining selection.

Default Layers assigns a unique vertical slot to every sorted top-level group, with 2.6 graph units between slots. Optional explicit group or glob path rules map to four configured layer indices (0–3); the first matching rule wins, and unmatched files stay visible in an Unassigned lane. Layer assignments describe configured paths, not inferred architecture.

### Semantic graph detail and legends

Camera distance reveals packages above 40 graph units, files between 17 and 40, and eligible functions below 17. Functions appear in Functions view, the focused group, or the selected file. Package-level relationships aggregate by group; detail edges are filtered by context and capped with visible omitted-edge copy. Node area can use LOC or bytes; color modes show their own meaning in a legend.

Selection and focused relationships can carry moving signal particles. Reduced Motion switches layouts and camera targets directly and removes decorative signal motion and commit animation; CSS transitions and animations collapse to 0.001ms. Animation pause freezes the decorative clock. Neither option changes the repository snapshot. Files, search, and Inspector provide access without relying solely on 3D pointing.

### History and CI

The persistent history selects static commit snapshots, preserves available identities, and briefly distinguishes added, removed, and changed files. Playback waits for loaded data. CI uses labeled job status and relationships with details in the Inspector. Missing runs and unsupported information remain visibly unavailable; no success is invented.

## Do's and Don'ts

### Do:

- **Do** preserve the approved Morph identity and a single continuous graph.
- **Do** retain selection and context when changing spatial order.
- **Do** pair semantic colors with labels or symbols and keep legends tied to the active mode.
- **Do** keep demo, missing data, partial coverage, and errors explicit.
- **Do** preserve keyboard access, Reduced Motion, low-power rendering, and the Files/Inspector fallback.

### Don't:

- **Don't** add ambient camera rotation or apply graph bloom to text.
- **Don't** invent architectural layer classifications or hide unmatched files.
- **Don't** substitute demo data for failed real analysis without an explicit user action.
- **Don't** treat atmospheric specks as repository entities or display them as data counts.
