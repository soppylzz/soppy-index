---
name: excalidraw
description: Create or edit minimal monochrome Excalidraw teaching diagrams as editable .excalidraw.png files through the VS Code Excalidraw extension. Use when a requested explanation benefits from a diagram or existing diagrams need changes.
---

# Excalidraw Diagrams

Activate for diagram work, not for every note. Identify the single relationship, mechanism, or flow the diagram should explain. Use the surrounding Chinese explanation to determine scope; avoid adding a picture that only repeats the prose.

## Visual language

Use a white background, black primary lines/text, and gray secondary lines/text. Prefer unfilled shapes; use a light gray fill only for necessary grouping. Convey distinctions through labels, placement, and line styles rather than color.

Keep few nodes, short labels, consistent typography, generous spacing, and a clear reading direction. Use rectangles for entities, arrows for actual relationships or flow, and diamonds only for decisions. Avoid decorative banners, icons, shadows, and ornamental dividers. Put qualifications in adjacent prose. Use Chinese explanatory labels with English technical identifiers.

Solid arrows show the main flow; dashed arrows may show feedback or optional paths, with an explicit label when ambiguous. Preserve causal and conditional meaning. Keep technical detail only when needed to understand the diagram.

## Authoring and delivery

Author Excalidraw scene JSON through the repository's VS Code Excalidraw extension workflow for `.excalidraw.png`. The extension converts and saves the editable PNG; do not implement a separate JSON-to-PNG converter or write a raster-only replacement. Inspect a nearby editable scene for compatible element structure and bindings.

Before overwriting an existing diagram, keep a backup under `assets/backup/YYYY-MM-DD/` unless an equivalent exists. Save the final editable `.excalidraw.png` beside the topic's assets and link it with relative Markdown and descriptive Chinese alt text. Do not keep duplicate scene/export formats unless requested.

Open the result in the extension and inspect text wrapping, clipping, arrow direction/bindings, crossings, spacing, and readability. Confirm the saved PNG can be reopened for editing. If the extension is unavailable, report that final PNG saving and editability are unverified; do not claim completion from JSON alone.

A drawing subagent is authorized when useful. Give it the intended concept, this skill, destination, and exclusive file ownership. The main agent reviews the result and integrates links; other repository work is outside the delegation.
