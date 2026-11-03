---
version: 1
slug: "apps-web-src-app-tsx"
primary_target: "apps/web/src/App.tsx"
related_targets: []
---

# Explorer surface brief

Scope: the single-page explorer in apps/web (graph workspace, lenses, history, analysis workspaces). Mode: Operate.
Audience: developers and tech leads reading an unfamiliar public repository; also presenting it on a projector or in docs.
Job: locate structure, risk and change quickly; follow relationships; compare commits; share an exact view.
Constraints: PRODUCT.md evidence rules (demo labelled, missing data explicit), GitHub quota, Files/Inspector fallback without WebGL, reduced motion, low power.
Chosen structure: Lenses (A) combined with the time spine (C), user decision 2026-11-03. Features chosen: Hotspots lens, Authors colour mode, PNG export, light theme, commit compare A→B, start screen, ⌘K palette, shareable URL state, hover preview, contextual hints, removal of duplicated controls.

Build path: code-led (Operate surface), so there is no comp round. On 2026-11-03 the user chose from HTML decision sketches: the structure "A + C kombiniert" (lenses plus time spine), the features "Hotspots, Autoren als Farbmodus, PNG-Export & helles Theme" plus "Commit-Vergleich: Ja, mit rein", and the world "Blaupause".

## Direction contract

THESIS: A repository is a set of plans and every commit is a revision. The surface refuses the category default of a near-black instrument panel with neon glow and many stacked toolbars; it is one drawing with a title block.

OWN-WORLD: Cyanotype: Prussian-blue ground with a faint drafting grid only behind the graph, white linework, nodes drawn as stroked circles with a dot, hairline 1px rules instead of shadows, 3px corners. Whiteprint (diazo) is the light theme: cool paper, navy ink. Chrome yellow appears only on actionable elements (active lens, primary buttons, selection handle). Correction red marks change and risk; mint marks additions. Barlow UI, Barlow Condensed tracked uppercase labels as in title blocks, JetBrains Mono paths and hashes.

STORY: The visitor pastes a repository or opens an example, picks a question (lens), reads a one-sentence legend, clicks a ranked item or a node, and scrubs or drags the time spine to see what changed between two revisions, then shares the link or exports the drawing.

FIRST VIEWPORT: 58px top bar (logo, repository/branch pill, demo tag, centered ⌘K field, Export, Share, theme, settings). 56px lens bar (Architecture, Hotspots, Dependencies, Evolution, Pipelines, Authors as label+question tabs; Cloud/Layers segmented at right). Graph fills the rest above a time spine (LOC line over real-time commit spacing, revision triangles, drag-to-compare band) with a title block at right (sheet message, revision, drawn by, date, sheet n/N). Lens card floats top-left on the graph; Inspector floats right on selection.

FORM: Blueprint, position 4 of 7 on the ordered list (1 transit diagram, 2 geological strata, 3 topographic survey, 4 cyanotype blueprint, 5 Swiss poster, 6 star atlas, 7 natural history plate). seed:bcc46a30e30e8839 (surface round seed:087d3ecd76925020). Signature move: revision clouds and Δ tags around changed nodes; commit shown in a drawing title block. Motion grammar: the same cloud re-inks between lenses (colour/size morph), rows rerank in place and stay marked until seen, time-spine spacing equals real time. Raises: action colour only on actionable things (warm consumer app); in-place rerank with held highlight (gate board); real-time spacing (Labanotation); header names the span in view (lexicon).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
