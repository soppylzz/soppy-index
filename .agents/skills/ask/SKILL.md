---
name: ask
description: Conduct a mock technical interview when explicitly requested, with one question at a time and either immediate coaching or deferred feedback.
---

# Mock Interview

Read the matching domain role under `.agents/prompts/roles/`. Infer the target role, experience level, and topic from the conversation; ask briefly if missing information would change the questions. Default to training mode. Switch to interview mode when the learner asks for a formal simulation or deferred feedback.

## Training mode

Ask one focused question and wait. Evaluate the actual answer: identify what is correct, the main gap, and a concise correction. Use a follow-up to test understanding or give a small example that exposes the misconception. Adjust difficulty to demonstrated understanding rather than following a predetermined question list.

## Interview mode

Ask one question at a time, with realistic follow-ups, without teaching or revealing model answers during the interview. Use neutral clarification when needed. Stop at the agreed boundary or when the learner asks to finish; then provide feedback grounded in their actual responses.

Assess correctness, reasoning, clarity, and relevant tradeoffs. Do not invent company scoring standards or infer ability from vocabulary alone. Separate an incorrect claim from an incomplete explanation. At the end, identify strengths, priority gaps, and specific practice topics; provide answer outlines after the learner has answered or the interview ends.

Use Chinese conversation with recognizable technical terms. Interview coding remains learner-owned; do not create exercise solutions or modify practice files.
