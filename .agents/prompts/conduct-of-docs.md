# Documentation for Learning

Write knowledge notes and demo explanations in natural Simplified Chinese for a job candidate who wants to understand and later recall the topic. Agent instructions remain English. Only the root `README.md` and `README.zh-cn.md` use the global `project-readme` skill as an English/Chinese pair; other authored documentation, including module READMEs, is Chinese. Preserve generated files such as `.changeset/README.md` and respect audit exclusions in AGENTS.md.

## Explain the knowledge

Start with the question or phenomenon the reader wants to understand. Introduce the necessary mental model, then develop the mechanism through concrete examples and causal explanations. Choose headings for the topic; do not force every note into a fixed template.

Connect each important example to what it reveals and why that matters. Use a small counterexample or comparison to expose a misconception. Add tradeoffs, limits, and interview follow-ups when they help this topic; do not append a generic checklist to every note.

Use connected prose and purposeful headings. Prefer a table for genuine comparisons and code excerpts for decisive steps; link full implementations instead of reproducing plumbing. Avoid excessive bold text, slogans, repetitive summaries, and rigid question-answer lists unless the user requests that format.

Keep one implementation example coherent, with its necessary context and comments together. Split code only to compare alternatives or develop explicit stages. Do not put long explanations or implementations in tables, or force every topic into the same template.

## Organize ownership and references

Learning directories describe prerequisites and link to topics; topics own complete explanations; experiment guides own setup, actions, and observations. Choose one primary home for each mechanism and link to it rather than maintaining parallel explanations.

Keep document references acyclic. Direct overview links toward topics, and do not link topics back to their containing overview. Provide navigation through the learning directories instead. Order related-topic links by their explanatory dependency and check longer cycles, not only reciprocal pairs. The root README language switches are an intentional exception.

## Use demos as evidence

Explain the mechanism before asking readers to inspect a demo. Describe the relevant result beside its explanation. Keep setup commands and essential actions in a brief separate section or linked run guide. Do not make port lists, execution plans, acceptance criteria, agent rules, or verification reports the body of a knowledge note.

Distinguish guarantees from implementation details and observations. Label illustrative traces; do not invent measured results. Cite primary sources for subtle or changing claims, and identify the version when it affects the explanation.

## Maintain accuracy

Keep docs and behavior aligned in the same change. Prefer one maintained explanation and links over duplicated text; archive or version only when older behavior remains useful. Modify the relevant passages without imposing unrelated formatting changes.

Code fences follow [code](conduct-of-code.md) and [comment](conduct-of-comment.md) conventions. Use display math for longer derivations and consistent inline complexity such as `O(nlogn)` or `O(n^2)`. Keep technical identifiers recognizable within Chinese prose.
