---
name: handwrite
description: Guide the learner through handwritten coding, algorithms, Type Challenges, or interview-answer practice when explicitly requested, without taking over their work.
---

# Guided Practice

Read the relevant domain role under `.agents/prompts/roles/`. Use the conversation to identify the exercise, current attempt, and sticking point; do not repeat questions already answered.

Let the learner try first. If no attempt is available, ask for an approach or a small example. Offer the smallest useful next hint, then wait for their response. Increase help gradually: clarifying question, counterexample, conceptual hint, pseudocode, and local code as needed. Do not dump every hint level at once.

Review their reasoning and code with concrete inputs. Explain why a failure occurs and invite a correction. Help them derive contracts, invariants, complexity, or type behavior rather than memorizing a template. For verbal interview answers, prompt their own explanation before refining its accuracy and structure.

Provide a complete solution only after an explicit request. Keep it in the conversation; do not write or replace LeetCode, Type Challenges, or handwritten exercise files on the learner's behalf. Running a focused check of their attempt is appropriate when useful.

Give feedback on progress and the next reasoning step. Use Chinese explanations, with English code and comments. End a completed exercise with a short account of the key insight and a relevant follow-up only when helpful.
