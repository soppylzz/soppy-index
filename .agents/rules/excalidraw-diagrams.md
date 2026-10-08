# Excalidraw Diagram Style

Applies whenever an agent or skill creates, edits, exports, or reviews an Excalidraw diagram in this repository.

Use the diagrams in `docs/browser/core/assets/` as the visual reference set.

## File format

- Keep only the editable `.excalidraw.png` file. Do not add a standalone `.excalidraw` or `.svg` copy.
- The PNG must contain an embedded Excalidraw scene under the `application/vnd.excalidraw+json` metadata key. A raster-only PNG is not acceptable.
- Let the VS Code Excalidraw plugin handle scene loading and saving details.
- Before overwriting an existing diagram, copy its current `.excalidraw.png` into `assets/backup/YYYY-MM-DD/` unless an equivalent backup already exists.
- Markdown must reference the `.excalidraw.png` with a relative path and a descriptive Chinese alt text.

## Typography

- Use Excalifont for every text element (`fontFamily: 5`).
- Use `20px` for the top rule and `18px` by default for primary node labels; reduce long node labels to `16px`. Use `14–16px` for secondary labels, branches, and lane names.
- Keep API names, implementation identifiers, and established technical terms in English. Explanatory summaries may use Simplified Chinese.
- Keep labels short. Move qualifications, implementation differences, and edge cases into the adjacent Markdown prose.

## Diagram structure

- Put one conclusion in each diagram. Display it in a full-width orange banner at the top using `RULE · <conclusion>`.
- Use a white canvas (`#ffffff`) and generous whitespace.
- Lay out the primary sequence from left to right.
- Route feedback loops outside the primary row and avoid crossing nodes or unrelated connectors.
- Use swimlanes only when execution ownership, thread/process boundaries, or concurrent work materially matters. Lane dividers use thin light gray lines (`#ced4da`).
- Prefer rounded rectangles. Use a diamond only for a real branch whose label is short enough to remain readable.
- A diagram is a conceptual model, not a substitute for a specification algorithm or a complete Chromium thread topology. State important simplifications in nearby prose.

## Semantic color system

Use color by meaning, not decoration. Keep the same meaning consistent across diagrams.

| Meaning                                             | Stroke    | Fill      |
| --------------------------------------------------- | --------- | --------- |
| Rule banner                                         | `#e8590c` | `#fff4e6` |
| Primary flow or work                                | `#1971c2` | `#e7f5ff` |
| Checkpoint or scheduling stage                      | `#6741d9` | `#f3f0ff` |
| Decision or conditional stage                       | `#f08c00` | `#fff9db` |
| External resource, loading, or cross-thread wake-up | `#c2255c` | `#fff0f6` |
| Ready result, submission, or display output         | `#2b8a3e` | `#ebfbee` |
| Neutral or waiting state                            | `#495057` | `#f8f9fa` |

- Use solid fills, `2px` outlines, and Excalidraw roughness `1` for nodes.
- Use the node's semantic stroke color for its label.

## Connectors

- Every arrow has `startArrowhead: null` and `endArrowhead: "triangle"`.
- Use a solid arrow for the primary execution or data flow.
- Use a dashed arrow for a conditional path, wake-up, feedback loop, or deferred continuation.
- Match an arrow's color to the semantic meaning of the transition; use `#343a40` for a neutral primary transition.
- Place short branch labels beside the relevant connector rather than inside a crowded node.

## Editing checklist

1. Read the surrounding document and identify the single rule the diagram must teach.
2. Inspect the existing reference diagrams before introducing a new visual pattern.
3. Back up an existing target before replacing it.
4. Keep the scene editable inside the PNG and remove any temporary standalone scene or export files.
5. Confirm all text uses `fontFamily: 5` and every arrow ends in `triangle`.
6. Open the final image and check wrapping, clipping, arrow direction, crossings, spacing, and visual hierarchy.
7. Confirm every Markdown image reference resolves to an existing file.

## Avoid

- Do not use color merely to make adjacent nodes different.
- Do not reproduce every implementation detail or source-code class in a teaching diagram.
- Do not present optional rendering or scheduling work as an unconditional pipeline.
- Do not use generic sans-serif fonts, classic arrowheads, raster-only exports, or duplicate `.excalidraw` source files.
- Do not add a new image when prose, a short list, or an existing diagram already explains the relationship clearly.
