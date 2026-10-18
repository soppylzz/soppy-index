---
name: learn
description: Create new Chinese knowledge notes and supporting teaching demos for interview preparation when explicitly requested. Ordinary edits to existing material do not use this skill.
---

# Create Learning Material

Use this workflow only for the current creation task. Read `AGENTS.md`, applicable shared prompts, and the relevant role under `.agents/prompts/roles/`. Resolve links from this canonical skill directory, including through client symlinks.

Identify the concept, reader's starting point, and intended depth from the conversation. Ask only about missing information that changes the material. Inspect nearby notes and implementations to choose a location and avoid duplicating an existing explanation.

Build the note around the reader's conceptual question. Develop a useful model, explain the mechanism, and connect a concrete example to the conclusion. Follow [documentation conventions](../../prompts/conduct-of-docs.md); keep operational details secondary.

Add a demo when executable behavior materially clarifies the concept or the user requests one. Choose a few cases with clear comparisons. Keep the mechanism visible, reuse relevant infrastructure, and follow [code conventions](../../prompts/conduct-of-code.md). Teaching packages need meaningful tests. Do not generate solutions to learner-owned exercises.

Pair a demo with a Chinese explanation, usually `index.ts` / `index.md`, or matching descriptive names. Include only essential run instructions; connect the result to the knowledge rather than writing an execution diary. Use the Excalidraw skill if a diagram will clarify a relationship or flow.

Validate according to the implementation and report actual checks separately from the knowledge text. If the user later asks to revise existing material, use shared conventions directly rather than reapplying this creation workflow.
