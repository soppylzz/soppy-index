# Excalidraw Diagrams

Applies to creation, editing, export, and review. Use `docs/browser/core/assets/` as the visual reference.

## Files

Keep only editable `.excalidraw.png`, containing an embedded scene under `application/vnd.excalidraw+json`; no raster-only PNG or duplicate `.excalidraw`/SVG. Use the VS Code Excalidraw plugin for scene loading/saving. Before overwrite, back up to `assets/backup/YYYY-MM-DD/` unless an equivalent backup exists. Markdown uses relative image links and descriptive Chinese alt text.

## Layout and text

- One teaching conclusion per diagram, in a full-width orange top banner: `RULE · <conclusion>`.
- White canvas, generous whitespace, primary flow left to right. Feedback loops stay outside the primary row; avoid crossings. Swimlanes are for meaningful ownership/thread boundaries, with thin `#ced4da` dividers.
- Rounded rectangles by default; diamonds only for real branches with short labels.
- Excalifont (`fontFamily: 5`) for all text: banner 20px, primary labels 18px (16px for long labels), secondary/branch/lane labels 14–16px.
- Keep APIs/identifiers/technical terms English; explanations may be Chinese. Move qualifications and implementation detail into adjacent prose. Diagrams are conceptual models, not complete browser topology or specification algorithms.

## Semantic styles

Use solid fills, 2px outlines, roughness 1; labels match node strokes. Colors express meaning, not adjacency.

| Meaning                                | Stroke    | Fill      |
| -------------------------------------- | --------- | --------- |
| Rule                                   | `#e8590c` | `#fff4e6` |
| Primary flow/work                      | `#1971c2` | `#e7f5ff` |
| Checkpoint/scheduling                  | `#6741d9` | `#f3f0ff` |
| Decision/condition                     | `#f08c00` | `#fff9db` |
| External resource/loading/cross-thread | `#c2255c` | `#fff0f6` |
| Ready result/submission/display        | `#2b8a3e` | `#ebfbee` |
| Neutral/waiting                        | `#495057` | `#f8f9fa` |

Arrows use `startArrowhead: null`, `endArrowhead: "triangle"`. Primary flow is solid; conditional/wake-up/feedback/deferred transitions are dashed. Match transition semantics; neutral primary connectors use `#343a40`. Place short branch labels beside connectors.

Before delivery, inspect the final image for wrapping, clipping, direction, crossings, spacing, and hierarchy; verify fonts, arrowheads, embedded editability, backups, and links. Do not depict optional work as unconditional or add a diagram when existing prose/visuals suffice.
