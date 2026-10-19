---
name: excalidraw
description: Create or edit minimal monochrome teaching diagrams by authoring scene JSON directly and exporting editable .excalidraw.png images for Markdown previews. Use when a requested explanation benefits from a diagram or existing diagrams need changes.
---

# Excalidraw Diagrams

Activate for diagram work, not for every note. Identify the single relationship, mechanism, or flow the diagram should explain. Use the surrounding Chinese explanation to determine scope; avoid adding a picture that only repeats the prose.

## Visual language

Use a white canvas, dark gray container backgrounds (`#495057`), white text inside containers (`#ffffff`), and gray text outside containers (`#6b7280`). Use solid fills for entity and decision shapes, dark gray primary arrows, and lighter gray secondary or dashed connectors. Keep label contrast and a clear hierarchy without adding decorative colors. Convey distinctions through labels, placement, and line styles.

Use Excalifont (`fontFamily: 5`) for every text element and the scene's default font. Do not use Helvetica (`fontFamily: 2`) or silently substitute a legacy font. Excalidraw may use a fallback for glyphs unavailable in Excalifont, including Chinese characters; do not promise that every glyph uses the same font face.

Keep few nodes, short labels, consistent typography, generous spacing, and a clear reading direction. Use rectangles for entities, arrows for actual relationships or flow, and diamonds only for decisions. Avoid decorative banners, icons, shadows, and ornamental dividers. Put qualifications in adjacent prose. Use Chinese explanatory labels with English technical identifiers.

Solid arrows show the main flow; dashed arrows may show feedback or optional paths, with an explicit label when ambiguous. Preserve causal and conditional meaning. Keep technical detail only when needed to understand the diagram.

## Authoring and delivery

Author scene JSON directly; do not use Computer Use or a VS Code extension to draw, import, save, or export it. Deliver a genuine `.excalidraw.png`: render the scene programmatically, preferably with Excalidraw's export utilities, and embed the scene JSON using Excalidraw's PNG metadata format. A renamed JSON file or a raster-only PNG is not a valid deliverable. Inspect a nearby editable scene for compatible element structure and bindings. If the user explicitly requests JSON only, deliver `.excalidraw` instead.

Before overwriting an existing diagram, keep a backup under `assets/backup/YYYY-MM-DD/` unless an equivalent exists. Keep the maintained scene embedded in the final PNG rather than retaining duplicate JSON/SVG exports unless requested. Link the PNG in Markdown with descriptive Chinese alt text and a relative image path. Do not add bidirectional navigation bars.

Validate JSON parsing, unique element IDs, reciprocal text/container and arrow/shape bindings, finite geometry, font settings, and container/background/text colors. Inspect the rendered PNG for wrapping, clipping, arrow directions, crossings, spacing, and readability. Decode the embedded PNG scene to confirm it remains editable and matches the rendered scene. Report actual checks; do not claim an editor-reopen check without performing one. No GUI is required.

A drawing subagent is authorized when useful. Give it the intended concept, this skill, destination, and exclusive file ownership. The main agent reviews the result and integrates links; other repository work is outside the delegation.
