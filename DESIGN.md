---
name: repo-view
description: A luminous spatial instrument for exploring repository structure and change.
colors:
  background: "#060b14"
  panel: "#0a111b"
  separator: "#203247"
  text: "#d7e2f0"
  muted: "#9aadc2"
  action: "#68caff"
  selection: "#77e4c6"
  finding: "#edc27f"
  error: "#ffb0b7"
  field: "#0c1826"
  field-border: "#34506a"
  field-text: "#e1ecf6"
  button: "#16405b"
  button-border: "#3e789e"
  button-hover: "#205575"
  button-text: "#e0f3ff"
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
    fontSize: "20px"
    fontWeight: 550
    lineHeight: 1.35
    letterSpacing: "-0.03em"
  title:
    fontFamily: '"Inter Variable", sans-serif'
    fontSize: "18px"
    fontWeight: 500
    letterSpacing: "-0.035em"
  label:
    fontFamily: '"Inter Variable", sans-serif'
    fontSize: "12px"
  code:
    fontFamily: '"JetBrains Mono", monospace'
    fontSize: "11px"
rounded:
  compact: "4px"
  control: "6px"
  floating: "8px"
spacing:
  compact: "4px"
  control-gap: "8px"
  panel: "20px"
  workspace: "22px"
components:
  button-primary:
    backgroundColor: "{colors.button}"
    textColor: "{colors.button-text}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.button-hover}"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.field-text}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  icon-button:
    rounded: "{rounded.control}"
    width: "36px"
    height: "36px"
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

The background, panel, separator, text, and muted tokens define the instrument frame. Fields and primary buttons use the darker blue surface variants recorded above. The graph workspace adds a radial gradient (`ellipse at 48% 48%, #0a244066 0%, #060d18 68%`).

**The Evidence Rule.** Demo, missing, limited, loading, and error states remain explicit. A visual transition must never imply that repository data changed.

## Typography

Self-hosted Inter Variable supplies interface text. Self-hosted JetBrains Mono supplies code, paths, keyboard hints, and measurements. The default interface size is compact; workspace titles and Inspector headings carry hierarchy rather than large decorative display type.

The frontmatter records the base hierarchy. Navigation and primary buttons use the label size. File paths and technical metadata use the code role, with smaller local variants for dense timeline and legend labels. Paragraphs use a line height of 1.65. Panel labels use 10px, weight 550, and `0.05em` tracking. Analysis workspace headings use 23px and weight 550; function and pipeline details use the same technical hierarchy as Inspector content.

## Layout

A full-height flex instrument frame keeps the graph central. Files, Inspector, History, and CI have explicit visibility controls in a 49px layout bar. The base desktop geometry is a 58px header, 54px repository toolbar, 240px Files panel, 300px Inspector, 134px history panel, 66px CI strip, and 27px status bar. Files starts open at desktop widths of at least 1200px; Inspector starts closed, History open, and CI closed. Closing a panel returns its space to the workspace. The shell fits the viewport without a minimum-height floor.

At 1199px and below, Files and Inspector become mutually exclusive drawers: 310px and 330px wide, capped at 90vw and 92vw. The header is 57px and icon controls become 42px. At 760px and below, the header becomes 92px with a separate navigation row and the repository toolbar becomes 90px with a full-width search row. At 1360px and below, secondary brand and spatial-status copy recede. Analysis workspaces respond to their own container: pipelines stack below 1000px and function list/details stack below 650px.

Coarse pointers raise the control token to 44px, enlarge tree rows, labels, and panel toggles, and expose a history range slider in place of tiny commit hit targets. History expands to 160px (155px on narrow screens); compact-height windows at 650px and below reduce it to 112px and hide the status bar. Mobile graph tools remain explicit and reachable.

Fullscreen hides the header, repository toolbar, status bar, and initially all optional panels, leaving the graph and layout controls. It requests native fullscreen when available and retains the expanded layout otherwise. Exiting restores the previous panel visibility. The F shortcut and Escape provide entry and exit.

Spacing remains precise, with larger labels and touch targets supporting a simpler workbench. Dependency, function, and pipeline analysis use closeable task workspaces rather than crowding the cloud with additional layers of controls.

## Elevation & Depth

Panel depth comes primarily from dark tonal layering and fine borders. Floating controls, search results, settings, and mobile panels use soft black shadows. Search results use `0 12px 36px #0008`; settings use `0 14px 38px #0008`; cluster labels use `0 7px 18px #0004`. The Morph control relies on its border and active inset stroke rather than a floating shadow. Small graph indicators may glow, but text remains crisp.

The graph uses point cores, additive halos, non-interactive atmospheric specks, and bloom. Bloom belongs to spatial geometry. There is no ambient camera rotation. Low-power mode removes bloom, reduces atmospheric specks from 2600 to 600, and fixes pixel ratio at 1 instead of the normal 1–1.6 range. Software renderers are detected where renderer information is available; a slow initial frame sample also enables low-power mode. If WebGL cannot start, an explicit fallback directs users to Files and Inspector.

## Shapes

Controls have gently rounded corners: four pixels for technical tags, five for graph labels and Morph choices, six for icon buttons, fields, and primary buttons, and eight for settings and the Morph container. Circles mark point nodes, status dots, and pipeline icons. The frame remains rectangular and divided by fine one-pixel borders.

## Components

### Buttons, fields, and navigation

Primary buttons use the blue surface, border, hover, radius, and padding tokens above. Icon buttons are compact squares with a darker blue active/hover surface. Disabled buttons use opacity 0.4 and a not-allowed cursor. Interactive controls and links receive a two-pixel cyan focus-visible outline with a three-pixel offset. Inputs use the field surface and border, muted placeholders, and cyan caret. Navigation uses a clear cyan active underline. Desktop icon controls are 36px squares; tablet and coarse-pointer sizing follow the Layout rules.

### Camera controls and selection

Zoom in, Zoom out, and Fit cloud are explicit graph controls with +, −, and 0 keyboard shortcuts. Wheel, pinch, orbit, and pan gestures remain available. Fit computes the visible graph bounds against viewport aspect ratio. Camera moves preserve the intended target, settle over 1.1 seconds, and become immediate under Reduced Motion. Selection approaches files and functions closely enough to reveal detail; interaction interrupts camera motion.

Point selection uses projected screen positions with a 16px mouse or 26px touch radius, excluding removed ghosts and invisible points. A drag beyond eight pixels or a multi-touch gesture does not select a node. Nearby named labels provide a second route to file and function selection. Search and analysis rows use the same locate action to return to the cloud and select the referenced entity.

### Analysis workspaces

Dependencies, Functions, and Pipelines open distinct, closeable workspaces. Selecting the active navigation tab again, Back to cloud, the close button, or Escape returns to Explore; the prior panel arrangement is restored. The mounted graph retains its camera and spatial context while hidden.

Dependencies provides filterable file-import relationships and external packages. Functions provides a searchable definition list, selected definition metrics, and resolved callers/callees. Pipelines provides a navigable job dependency map with zoom and fit, status, and selected job steps. Each view exposes relevant empty or unavailable states and a path back to the cloud.

### Morph and local focus

Cloud and Layers are two targets for the same graph, with attached edge endpoints and stable selection. The implemented transition uses reversible exponential damping (5.1, capped frame delta 0.05s, settling threshold 0.0005), settling in approximately 1.5 seconds under normal frame timing. It is not a fixed-duration timeline. Focus unfolds only the selected group; other groups retain their cloud positions and dim to 24% tint. Focus damping is 4. A second focus toggle or Escape closes focus. Entering global Layers clears local focus while retaining selection.

Default Layers assigns a unique vertical slot to every sorted top-level group, with 2.6 graph units between slots. Optional explicit group or glob path rules map to four configured layer indices (0–3); the first matching rule wins, and unmatched files stay visible in an Unassigned lane. Layer assignments describe configured paths, not inferred architecture.

### Semantic graph detail and legends

Camera distance reveals packages above 40 graph units, files between 17 and 40, and eligible functions below 17. Graph function detail follows the focused group or selected file; the Functions workspace provides a separate searchable definition list. Package-level relationships aggregate by group; detail edges are filtered by context and capped with visible omitted-edge copy. Node area can use LOC or bytes; color modes show their own meaning in a legend.

Selection and focused relationships can carry moving signal particles. Reduced Motion switches layouts and camera targets directly and removes decorative signal motion and commit animation; CSS transitions and animations collapse to 0.001ms. Animation pause freezes the decorative clock. Neither option changes the repository snapshot. Files, search, and Inspector provide access without relying solely on 3D pointing.

### History and CI

The hideable history selects static commit snapshots, preserves available identities, and briefly distinguishes added, removed, and changed files. Playback waits for loaded data. CI uses labeled job status and relationships with details in the Inspector. Missing runs and unsupported information remain visibly unavailable; no success is invented. Cached snapshots and idle warming speed repeat commit visits without changing the visual meaning of a commit. Loading retains the current snapshot until its replacement is ready; cache status stays secondary to the selected snapshot.

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
