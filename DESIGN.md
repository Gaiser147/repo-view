---
name: repo-view
description: Blueprints of public repositories; one drawing, every commit a revision.
colors:
  ground: "#0f3157"
  ground-deep: "#0b2747"
  sheet: "#0d2c4f"
  sheet-raise: "#13406e"
  field: "#0b2747"
  rule: "rgba(238, 245, 255, 0.17)"
  rule-strong: "rgba(238, 245, 255, 0.34)"
  grid: "rgba(238, 245, 255, 0.05)"
  grid-major: "rgba(238, 245, 255, 0.085)"
  scrim: "rgba(7, 26, 48, 0.72)"
  ink: "#eef5ff"
  ink-2: "#c2d6ec"
  ink-3: "#93b3d6"
  graph-line: "#a9c3df"
  graph-muted: "#6f93bb"
  chrome-yellow: "#ffd45c"
  chrome-yellow-hover: "#ffe08a"
  chrome-yellow-soft: "rgba(255, 212, 92, 0.14)"
  act-ink: "#10263f"
  correction-red: "#ff8a75"
  addition-mint: "#8ff0c8"
  group-sky: "#9fe3ff"
  group-lilac: "#c9b6ff"
  group-sand: "#e9d8a6"
  group-salmon: "#ffb59e"
  group-periwinkle: "#9db4ff"
  wp-ground: "#edf1f5"
  wp-ground-deep: "#e1e8ef"
  wp-sheet: "#f8fafc"
  wp-sheet-raise: "#ffffff"
  wp-rule: "rgba(18, 48, 90, 0.16)"
  wp-rule-strong: "rgba(18, 48, 90, 0.34)"
  wp-grid: "rgba(18, 48, 90, 0.055)"
  wp-grid-major: "rgba(18, 48, 90, 0.095)"
  wp-scrim: "rgba(237, 241, 245, 0.8)"
  wp-ink: "#12305a"
  wp-ink-2: "#304f78"
  wp-ink-3: "#52708f"
  wp-graph-line: "#4f6a8a"
  wp-graph-muted: "#93a8c0"
  wp-chrome-yellow-hover: "#ffca2e"
  wp-chrome-yellow-soft: "rgba(255, 196, 30, 0.22)"
  wp-select-ink: "#b87a00"
  wp-correction-red: "#c8402a"
  wp-addition-green: "#0d7a58"
  wp-group-blue: "#1d6fb8"
  wp-group-violet: "#6b4fb0"
  wp-group-ochre: "#8a6a1f"
  wp-group-rust: "#a4452f"
  wp-group-slate: "#3f5f8f"
typography:
  display:
    fontFamily: "Barlow, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(28px, 4vw, 40px)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Barlow, Helvetica Neue, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  title-lg:
    fontFamily: "Barlow, Helvetica Neue, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 600
  title:
    fontFamily: "Barlow, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  lead:
    fontFamily: "Barlow, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Barlow, Helvetica Neue, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.4
  body-sm:
    fontFamily: "Barlow, Helvetica Neue, Arial, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, Barlow, sans-serif"
    fontSize: "11.5px"
    fontWeight: 600
    letterSpacing: "0.09em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 400
  figure:
    fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace"
    fontSize: "19px"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  sheet: "3px"
  mark: "2px"
  dot: "50%"
spacing:
  hair: "2px"
  gap: "8px"
  inset: "14px"
  panel: "16px"
  grid-minor: "24px"
  grid-major: "120px"
components:
  button-primary:
    backgroundColor: "{colors.chrome-yellow}"
    textColor: "{colors.act-ink}"
    rounded: "{rounded.sheet}"
    padding: "0 16px"
    height: "38px"
  button-primary-hover:
    backgroundColor: "{colors.chrome-yellow-hover}"
  button-secondary:
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "0 11px"
    height: "34px"
  icon-button:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sheet}"
    width: "34px"
    height: "34px"
  icon-button-active:
    backgroundColor: "{colors.chrome-yellow}"
    textColor: "{colors.act-ink}"
  segmented-choice-active:
    backgroundColor: "{colors.chrome-yellow}"
    textColor: "{colors.act-ink}"
    rounded: "{rounded.mark}"
    padding: "0 11px"
    height: "28px"
  lens-tab:
    textColor: "{colors.ink-3}"
    typography: "{typography.title}"
    padding: "0 18px"
    height: "56px"
  lens-tab-active:
    backgroundColor: "{colors.chrome-yellow}"
    textColor: "{colors.act-ink}"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "8px 10px"
  demo-tag:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.mark}"
    padding: "2px 6px"
  lens-card:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.sheet}"
    padding: "12px 14px 14px"
    width: "330px"
  inspector:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.sheet}"
    padding: "14px 16px 18px"
    width: "340px"
  hover-card:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "8px 11px"
  node-label:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.mark}"
    padding: "3px 7px"
  title-block-cell:
    textColor: "{colors.ink}"
    padding: "6px 14px"
---

# Design System: repo-view

## Overview

**Creative North Star: "The Cyanotype Plan Sheet"**

A repository is a set of plans and every commit is a revision. The explorer is one drawing with a title block, not an instrument panel: white linework on Prussian blue (Cyanotype, the default dark print) or navy ink on cool paper (Whiteprint, the light diazo print). Files are drafting marks, a stroked circle with a centre dot on a paper-filled disc. Change is drawn the way a drafter calls out a revision: a scalloped revision cloud, a Δ tag, a revision triangle on the time spine, and a title block naming the revision on the sheet.

The sheet is dense and quiet. Hairline 1px rules divide it; nothing floats on shadow. Colour is ink, not light: there is no glow, bloom or halo. Two hues carry meaning beyond ink. Chrome yellow marks only what can be pressed or what is currently chosen. Correction red marks change and risk; mint marks additions. Everything else is the print's own ink at three strengths.

The product's Evidence Rule binds the drawing: demo data is labelled wherever it appears, missing or partial history is stated in words, and a visual transition never implies that repository data changed. One persistent graph morphs between Cloud and Layers with stable node identity, and lenses re-ink that same graph rather than replacing it.

**Key Characteristics:**

- Prussian-blue or cool-paper ground; one drafting grid, behind the graph only.
- Hairline rules and 3px corners; zero shadows.
- Chrome yellow reserved for actionable and chosen elements.
- Correction red for change and risk; mint for additions.
- Barlow for the UI, Barlow Condensed tracked uppercase for title-block labels, JetBrains Mono for paths, hashes and figures.
- Revision clouds, dashed removed files, Δ rev tags and a title block as the signature.

## Colors

Two print processes share one role map: Cyanotype tokens carry bare names, Whiteprint tokens carry the `wp-` prefix and swap in through `:root[data-theme="whiteprint"]`. Chrome yellow (`chrome-yellow`) and its dark text (`act-ink`) are identical in both prints.

### Primary

- **Chrome Yellow** (`chrome-yellow`): primary buttons, the active lens tab, the active Cloud/Layers choice, active icon buttons, the playing play button, the current commit tick, the compare band on the time spine, the selected node-label underline, the focused cluster label, the active Inspector tab underline, and the dark-print focus ring. Its hover is `chrome-yellow-hover` (Whiteprint: `wp-chrome-yellow-hover`); its tint `chrome-yellow-soft` fills selected rows and the compare band.
- **Select Ink, Whiteprint** (`wp-select-ink`): the selection mark inside the WebGL drawing on paper, where flat chrome yellow strokes would vanish.

### Secondary

- **Correction Red** (`correction-red`, Whiteprint `wp-correction-red`): changed files in Evolution, hotspot and complexity peaks, revision clouds, Δ tags, revision triangles on large commits, failing pipeline jobs (dashed), invalid fields, the error banner border, low API allowance, coverage notes.
- **Addition Mint** (`addition-mint`, Whiteprint `wp-addition-green`): added files, "new" rows, successful pipeline status.

### Tertiary

- **Group Inks** (`group-sky`, `group-lilac`, `group-sand`, `group-salmon`, `group-periwinkle` and their `wp-group-*` counterparts): categorical inks for groups, languages and the top six authors, in rank order. They name identity, never quality. Authors beyond six fall back to `graph-muted`.

### Neutral

- **Prussian Ground** (`ground`): the sheet behind the graph and analysis workspaces. `ground-deep` carries the top bar, lens bar and time spine; `sheet` carries floating cards, popovers and the Files drawer; `sheet-raise` carries tips; `field` carries inputs and the ⌘K field.
- **Linework Ink** (`ink`, `ink-2`, `ink-3`): primary text, secondary text and icons, labels and metadata. Inside WebGL, `graph-line` draws edges and `graph-muted` draws unmarked nodes.
- **Rules** (`rule`, `rule-strong`): `rule` separates inside a sheet and is the hover wash; `rule-strong` frames sheets, controls and the shell bars.
- **Drafting Grid** (`grid`, `grid-major`): the 24px minor and 120px major grid behind the graph.
- **Scrim** (`scrim`): behind the start screen and small on-graph readouts.

### Named Rules

**The Chrome Yellow Rule.** Chrome yellow appears only on something that can be pressed or something that is currently chosen. Status is never yellow: the demo tag is drawn in ink with a dashed border.

**The Correction Rule.** Red means change or risk and nothing else. It always travels with a word, a Δ, a count or a shape (cloud, triangle, dashed outline), never as colour alone.

**The Evidence Rule.** Demo, missing, partial, loading and error states are stated in words on the sheet. A lens that derives from history says how many commit pairs it is based on and downloads nothing on its own.

## Typography

**Display Font:** Barlow (with Helvetica Neue, Arial)
**Body Font:** Barlow 400/500/600 (with Helvetica Neue, Arial)
**Label/Mono Font:** Barlow Condensed 500/600 (with Arial Narrow) for title-block labels; JetBrains Mono 400/500 (with ui-monospace, Menlo) for paths, hashes, keys and figures. All self-hosted through @fontsource.

**Character:** An engineering sheet's lettering: plain grotesque for reading, condensed tracked capitals for the cells of a title block, and a monospace for anything copied from the repository.

### Hierarchy

- **Display** (600, clamp(28px, 4vw, 40px), 1.1, -0.02em): the start-screen headline only.
- **Headline** (600, 22px, -0.01em): analysis workspace titles (Dependencies, Functions, Pipelines).
- **Title Large** (600, 19px): the Inspector's file or entity name; function and job titles at 20px.
- **Title** (600, 15px): the lens card heading and the lens tab name; title-block values at 16px.
- **Lead** (400, 15px, 1.45): the one-sentence answer at the top of the lens card; the start-screen lead at 16px, max 62ch.
- **Body** (400, 14px, 1.4): default UI text. Secondary notes and legends at 12.5px in `ink-3`.
- **Label** (Barlow Condensed 600, 11.5px, 0.09em, uppercase): panel headings, section headings, lens sub-headings, field labels, title-block labels (10.5px), count and property terms, command-palette groups, the tip step count, the detail-level readout.
- **Mono** (JetBrains Mono 400, 12px; 11px in dense rows): paths, SHAs, branch names, node labels, kbd hints, the spine scale.
- **Figure** (JetBrains Mono, 19px, tabular): count cells; the health total at 40px/500; property values at 14px.

### Named Rules

**The Title Block Rule.** Tracked condensed capitals name a cell, a panel or a group, and sit with the data they label. They are never a decorative line above a headline.

**The Copied Text Rule.** Anything that could be pasted back into a terminal (path, hash, branch, function name) is set in JetBrains Mono. Paths truncate from the left so the filename stays visible.

## Layout

The shell is a four-row grid: a 56px top bar, a 56px lens bar, the graph workspace, and the time spine. The graph fills its row edge to edge; the lens card (330px) floats at the top-left and the Inspector (340px) floats at the right, both inset 14px from the drawing's edges. Graph tools stack at the bottom-right and the detail-level readout at the bottom-left, both inset 14px. Camera framing fits the drawing into the area the lens card and Inspector leave free, so nodes never sit under a panel.

The time spine splits into the spine (LOC line, real-time commit ticks, 84px track) and a title block 380px wide at the right (330px at 1360px, 280px at 1100px, where it keeps only sheet, revision and date). Commit positions follow real elapsed time; a quiet month looks quiet.

The drafting grid (24px minor, 120px major) is drawn only behind the graph. Bars, panels and analysis workspaces sit on flat ground.

Rhythm runs on 2px, 8px, 14px and 16px: 2px internal padding in segmented controls, 8px gaps between controls, 14px floating insets and card padding, 16px panel padding. Controls are 34px high (44px on coarse pointers, with 40px tree rows and a history range slider in place of tick targets).

Responsive steps: at 1360px lens tabs drop their question line; at 1100px tool buttons go icon-only; at 760px the top bar wraps with ⌘K on its own row, the lens strip scrolls with a fading edge, the lens card spans the width at the top (max 55%), the Inspector docks to the bottom (max 62%), and the title block is replaced by a one-line revision caption. Expanded mode hides the top bar and time spine.

## Elevation & Depth

The system is flat. `--shadow` is `none` everywhere, and every floating sheet (lens card, Inspector, popovers, palette results, hover card, tips, toasts) is separated by a 1px `rule-strong` border and its own sheet fill. State uses insets drawn as rules, not depth: a 2px bottom inset in chrome yellow for chosen tabs and selected node labels, a 1px inset ring for the active palette row. The only depth is the graph's own 3D space, which is drawn in flat ink with no bloom or glow.

### Named Rules

**The Hairline Rule.** Rules, not shadows, separate the sheet. If a surface needs separating, give it a 1px rule; never a shadow, glow or blur halo.

**The One Grid Rule.** The drafting grid exists only behind the graph and in the exported sheet. No other surface carries a grid or texture.

## Shapes

Sheets and controls have the slightly eased corner of a cut sheet (3px). Marks inside a sheet (tags, node labels, list rows, segmented choices, kbd) use 2px. Circles are reserved for nodes, legend dots and cluster dots. The drawing's own geometry is drafting geometry: stroked circles with centre dots, an eight-scallop revision cloud around a changed file, a dashed ring for a removed file, an upward triangle above a large commit tick, dashed borders for status (demo tag, failing job, moved row).

## Components

### Buttons

- **Shape:** cut-sheet corners (3px).
- **Primary:** chrome yellow fill with `act-ink` text, 600 weight, 38px high with 16px side padding (32px small in tips, 40px on the start screen). Used for the one forward action in a context: Open, Next tip, focus a group, Exit focus.
- **Hover / Focus:** hover lifts to `chrome-yellow-hover`; every focusable element gets a 2px outline in `focus` (chrome yellow on Cyanotype, navy ink on Whiteprint) offset 2px. Disabled drops to 0.42 opacity.
- **Secondary / Tool:** transparent with a 1px `rule-strong` border, 34px high; hover darkens the border to `ink-2` and adds the `rule` wash. Export, Share, Back to cloud and Load more use this form.
- **Icon button:** 34px square, `ink-2`; hover `rule` wash; active fills chrome yellow.
- **Text link:** ink text with a `rule-strong` underline offset 3px; the underline turns chrome yellow on hover.

### Chips

- **Demo tag:** Barlow Condensed uppercase label in ink inside a 1px dashed `ink-2` border, 2px corners. It appears in the top bar, the history row, the Inspector heading and the start-screen demo row whenever demo data is on screen.
- **Tag:** same lettering in `ink-2` inside a solid `rule-strong` border, for neutral metadata.
- **Δ rev tag:** JetBrains Mono 11px in correction red inside a 1px red border ("Δ rev 16"), on changed rows in the Evolution lens card.

### Cards / Containers

- **Corner Style:** 3px.
- **Background:** `sheet`; tips use `sheet-raise`.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px `rule-strong`; internal dividers in `rule`.
- **Internal Padding:** 12px 14px for the lens card body, 14px 16px for the Inspector.

### Inputs / Fields

- **Style:** `field` fill, 1px `rule-strong` border, 3px corners, 8px 10px padding; placeholders in `ink-3`; caret chrome yellow on Cyanotype, ink on Whiteprint.
- **Focus:** the global 2px focus outline; the ⌘K field darkens its border to `ink-2` on focus-within.
- **Error:** border turns correction red and a red problem line spans the row below.

### Navigation

- **Lens bar:** a Files toggle, then seven lens tabs (Architecture, Hotspots, Dependencies, Impact, Evolution, Pipelines, Authors), each a name in Title over its question in 12.5px `ink-3`, divided by `rule` hairlines. The active lens fills chrome yellow; keys 1–7 switch lenses. Cloud / Layers / Plan sits at the right as a segmented control.
- **Breadcrumbs:** Back and Forward (30px icon buttons on `sheet`, also `[` and `]`) followed by the mono path of the selection (repository › group › folders › file › ƒ function) on a hairline sheet, top of the drawing beside the lens card. Group and file crumbs are buttons; folders are plain text. On phones the bar moves above the detail indicator and drops folder crumbs.
- **Top bar:** brand mark, repository and branch pills, demo tag, the centred ⌘K field, health, Export, Share, theme and settings.

### Lens card

The question of the active lens as its heading, a scope line in condensed capitals (lens / repository / focus / `rev` or `A → B` in mono), a one-sentence lead, a legend sentence, then ranked rows or counts. Ranked rows rerank in place; the selected row takes a chrome-yellow border on `chrome-yellow-soft`, a moved row a dashed red border. Count cells sit in a ruled three-column grid (added, changed, removed) with figures in mono. History-derived lenses end with a coverage note ("from n of N commit pairs"). Collapsible; collapsed it frees its width for camera framing.

### Time spine and title block

The spine draws the LOC line in ink over commit ticks spaced by real time. Large commits (top 15% by changed files) carry a red revision triangle; the current commit is a 4px chrome-yellow bar (Whiteprint uses the selection gold #b87a00), the compare base a 4px ink bar. Dragging across ticks draws a chrome-yellow compare band and compares on release; the tooltip reads "Release to compare with …". The title block at the right is a ruled grid of cells (Sheet message, Revision `A → B`, Drawn by, Date, No. n / N · branch), each a condensed label over a value.

### Floor plan (graph)

The third layout target. Groups, folders and files become nested rooms of a squarified treemap sized by lines of code, drawn flat in the XY plane as hairline frames (groups in ink, folders in `line`, files fainter) that fade in with the plan. Files sit at the centre of their room, functions on a small grid inside it, group labels at their room's top-left corner, and the largest first-level folders carry condensed-capital labels. Edges recede to a fifth of their weight unless selected or reached. The camera frames the plan straight on. Same nodes, same identities: the plan is a morph target, never a separate view.

### Impact lens (graph)

What depends on the selection, hop by hop, over resolved imports and calls only; a dependent function lifts its file to the same hop, and containment is never climbed. The selection and its contents take the selection ink, hop 1 correction red, hop 2 ink, hop 3+ `line`; unreached marks fade toward the ground and lose their paper fill. Reached edges draw in correction red at 70%. The lens card shows a depth slider (1–6 hops), per-hop bars, the direct dependents, and a lower-bound note naming unresolved imports and whether the walk stopped at its depth. Without a selection it offers the most-imported files.

### Revision marks (graph)

In Evolution, changed files tint correction red and take a revision cloud; additions tint mint and fade in; removed files stay as dashed outlines with no paper fill. When more than 40% of files changed, clouds go only to the most-revised fifth so the mark still picks something out. The three most-revised changed files carry a Δ tag with "rev n" on their node label; the full changed list carries Δ rev tags in the lens card. The list filters by All / Changed / Added / Renamed / Removed (chrome-yellow active chip with counts), shows twelve rows and grows by forty, and each row flies to its file; removed rows are plain text with a dashed mark. "Dim unchanged files" fades every unchanged mark and edge so only the difference stays drawn. Node labels are mono on `sheet` with a `rule-strong` hairline; cluster labels are condensed capitals with a stroked group dot and a file count.

### Hover card

A non-interactive sheet (max 300px) with a 1px `ink-2` border: name, mono path, state in red (changed) or mint (added), and a condensed hint line.

### ⌘K palette

A results sheet under the field, grouped by condensed capital headings (lenses, actions, files, commits). The active row takes `chrome-yellow-soft` with a 1px chrome-yellow inset ring; secondary lines are mono in `ink-3`.

### Start screen and tips

The start screen is an 820px sheet over the scrim: display headline, lead, a repository field and branch field with a primary Open button, then ruled columns of example and recent repositories in mono (the demo row bordered and tagged). Three tips follow on first visit ("Start with a question", "Turn and zoom the plan", "Move through revisions"), each a `sheet-raise` card with Skip tips, a condensed step count (1 / 3) and a primary Next tip.

### Sharing and export

View state (repository, revision, lens, layout, selection, compare base, focus) is written to the URL so a shared link reopens the same view. PNG export renders a sheet: the uncovered part of the graph on ground, the 24px grid, visible labels redrawn as boxed callouts (Δ callouts in red), a ruled frame with zone references, and a title-block strip with repository, lens, legend and revision.

### Fallback, motion and power

Without WebGL the drawing is replaced by a plain statement and an Open files action; Files and the Inspector reach every entity. The Cloud/Layers morph uses exponential damping (rate 5.1), group focus damping 4, camera easing 1 − e^(−8dt); no fixed timelines and no ambient rotation. Reduced motion (OS preference or setting) jumps layouts and camera directly, removes the change pulse and flow particles, and collapses CSS motion to 0.001ms. Low power fixes pixel ratio at 1 (normally 1 to 1.6) and is switched on automatically for software renderers or a slow first-frame sample. Layers places groups by sorted order or by user-written path rules; unmatched files stay visible in Unassigned, and no layer is ever inferred.

## Do's and Don'ts

### Do:

- **Do** keep chrome yellow to pressable or chosen elements: primary buttons, the active lens, active segmented choices, the current commit, the compare band, selection.
- **Do** use correction red only for change and risk, always paired with a word, Δ, count, triangle, cloud or dashed outline.
- **Do** separate every surface with 1px rules (`rule` inside, `rule-strong` around) and 3px corners.
- **Do** label demo data with the dashed ink demo tag wherever it is on screen, and state history coverage in words.
- **Do** set paths, hashes, branches and figures in JetBrains Mono, and labels in Barlow Condensed tracked capitals beside the data they name.
- **Do** keep one persistent graph across Cloud, Layers and every lens, with selection and identity preserved.
- **Do** space commits on the time spine by real elapsed time.
- **Do** keep reduced motion, low power and the Files/Inspector fallback working for every new graph feature.

### Don't:

- **Don't** add box shadows, glows, bloom or halos; `--shadow` stays `none`.
- **Don't** draw the drafting grid anywhere but behind the graph and in the exported sheet.
- **Don't** use chrome yellow for status, tags, decoration or non-interactive containers.
- **Don't** put a revision cloud on every changed file in a wide comparison; clouds go to the most-revised fifth.
- **Don't** invent architectural layers or hide files that match no layer rule.
- **Don't** let a visual transition suggest that repository data changed, or substitute demo data for failed real analysis.
- **Don't** set tracked condensed capitals as a decorative line above a heading.
