# repo-view

Developer tool for understanding repository structure, dependencies, functions, CI and evolution through spatial exploration. English interface. Public GitHub repositories in v1; detailed static JS/TS analysis, other languages in the structural view.

The distinctive mechanism is one persistent graph that morphs between an organic cloud and layers. Lenses (architecture, hotspots, dependencies, evolution, pipelines, authors) re-ink that same graph to answer one question at a time; the time spine opens or compares revisions. Local focus unfolds one group without losing context. A fixed commit history ties structure to change. Health must show evidence and missing data. Demo data is always labeled.

Success: a user can locate a file, follow its relationships, change spatial order without losing selection, compare two commits without mistaking a visual transition for a code change, and share the exact view. A first-time visitor understands what to do from the start screen and three tips. Derived history signals (hotspots, authors) state how much history they are based on and never download extra data on their own.

Primary distribution: GitHub Pages, with browser-worker analysis and direct public GitHub access. Visitors require no self-hosted service. The existing Node analysis service is an optional local mode. Public API quotas and incomplete coverage must stay explicit.
