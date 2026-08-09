---
name: idi-knowledge-activation
description: Activate all four regions of the user's knowledge (known / fuzzy / not-recalled / unknown) through an in-depth interview (IDI) at the earliest stage of project ideation, producing a knowledge activation map plus planning handoff artifacts (redefined problem statement, assumption list). Use when a project idea is vague, before invoking planner or /plan, or when the user asks for an idea interview, an IDI, or knowledge activation. Do not trigger when requirements are already sharp and testable, or during implementation or debugging.
metadata:
  origin: custom
---

# IDI Knowledge Activation

Run a structured in-depth interview that surfaces what the user knows, half-knows,
cannot recall, and does not know — before any planning starts. The interview log itself
is process evidence (problem-definition axis); the output feeds directly into planning.

> Pure markdown by design. In non-Claude environments (web IDE, GPT-family), paste this
> file body as-is and follow it manually.
> The document is English; conduct the interview itself in the user's language.

## Why Four Regions

Knowledge exists in four states, and each state requires a different retrieval method.
A single "tell me what you know" only reaches region ①.

| Region | State | Retrieval method | Failing approach |
| --- | --- | --- | --- |
| ① Known | Active | Free recall | — |
| ② Known but not recalled | Dormant memory | **Cued recall** | "Anything else?" — nothing surfaces without cues |
| ③ Known but fuzzy | Tacit knowledge, half-formed intuition | **Episodic probing** | Generic questions — only vague generalities surface |
| ④ Unknown | Absent | **Hypothesis presentation → recognition** | Direct questions — you cannot ask about what you don't know |

## When to Activate

- Project idea exists but is vague or unformed
- Before invoking the planner agent or /plan on a new idea
- User explicitly asks for an idea interview or knowledge activation
- A domain expert user likely holds tacit knowledge the AI cannot infer

Do not activate when requirements are already sharp and verifiable, during active
implementation or debugging, or for purely factual questions.

## When NOT to Use

| Instead of this skill | Use |
| --- | --- |
| Turning clarified intent into acceptance criteria | `intent-driven-development` |
| Validating whether the idea is worth building | `product-lens` |
| Deciding between competing directions | `council` |
| Decomposing a settled idea into an implementation plan | `planner` / `plan-orchestrate` |

## Interview Rules (all phases)

- **One question at a time.** No question batches. Hear the answer, then choose the next question.
- **Never answer for the user.** If an answer is empty, record it as empty — do not fill it with plausible content.
- **Log every question and answer.** The log is the evidence artifact for process evaluation.
- **Time-box: 15–20 minutes total.** If a phase overruns, move on with the map as-is (one-line reason in the log).
- Reuse the user's own words from answers as cues for the next question (preserve their language).

## Workflow — broad → cued → deep → outward

### 0. Seed declaration (1 min)

Ask: "State the idea or problem on your mind in one or two sentences — unformed is fine."
Record the seed verbatim (it becomes the *before* of the redefinition).

### 1. Free recall — ① Known (3 min)

- "Dump everything you know about this topic, in any order. Don't organize it."
- After the dump, always ask once: **"Is there anything you didn't mention because it felt too obvious? Something that would surprise a person seeing this work for the first time."** (Experts omit the core as "obvious.")
- Record: itemized list. Nouns from this phase are cue candidates for phase 2.

### 2. Cued recall — ② Known but not recalled (4 min)

Start where free recall ran dry. Walk one cue axis at a time, asking
"Anything you experienced related to this time / place / person / tool?"

- **Time axis**: the day's flow start-to-end (e.g., store open → peak → close)
- **Space axis**: one location or zone at a time (e.g., shelf → stockroom → register)
- **Role axis**: one person type at a time (e.g., customer → new hire → HQ)
- **Tool axis**: one screen, document, or device at a time
- **Code axis** (only when a repo exists): walk one concrete file, module, or schema at a
  time — open it and ask "anything this does that you'd handle differently, or that
  surprised you?" Cite code references (`path:line`), never paraphrased descriptions;
  a real artifact on screen surfaces dormant knowledge that a summary of it cannot.

Throw only 1–2 cues per axis; dig into whichever axis gets a response.
"Oh right, there was that too" means this phase is working.
Record: newly retrieved items tagged with their source axis, e.g. `[cue:time]`.

### 3. Episodic probing — ③ Known but fuzzy (5 min)

Pick 2–3 items from phases 1–2 where the user hedged ("usually", "roughly", "sort of")
or sounded unsure.

- Ban generalities; drop to a specific episode: **"Pick the most recent day this happened. What did you actually do that day?"**
- Probe with follow-ups: "Then what? Why that way? What would have happened otherwise?" (max 3)
- When a judgment criterion emerges, make it explicit: "If you wrote what you just said as a rule, what would the rule say?"
- Record: episode summary + extracted tacit rule. Items that stay fuzzy get an `[unresolved]` tag — keep them, don't delete.

### 4. Hypothesis presentation — ④ Unknown (5 min)

Reverse direction. This is the only phase where the AI talks more than the user.

- **Known unknowns**: first ask the user what they *know they don't know*; record as a question list.
- **Unknown unknowns**: present 3–5 hypotheses, analogous cases, or counterexamples from domain knowledge.
  - Format: "In this domain, X is usually a problem / similar service Y solved it with Z — does that apply here?"
  - The user responds with exactly one of three: **applies** (promote to ①) / **doesn't apply** (record as a counterexample — that is also knowledge) / **never heard of it** (record in ④).
- Each item accumulated in ④ gets a disposition: **deep research** (with an explicit time box), **declared assumption** (adopted without verification, logged), or **scoped out**.
- Dispositions route to harness skills — do not resolve them inside the interview:
  - **deep research** → `deep-research` (multi-source, fact-checked) or `research-ops` /
    `exa-search` for lighter sweeps; the time box from the map is the research budget.
  - Codebase-shaped unknowns ("how does our existing X actually work?") → `search-first`
    or the `code-explorer` agent, not web research.

### 5. Output — knowledge activation map

```markdown
## Knowledge Activation Map — <topic> (<date>)

### Seed (verbatim)
<phase 0, as spoken>

### ① Known
- ...

### ② Retrieved by cue
- ... [cue:time]

### ③ Tacit rules from episodes
- ... (episode: ...)
- ... [unresolved]

### ④ Unknown
- ... → deep research (box: 10 min) / declared assumption: "..." / scoped out

### Planning handoff (input for planner / /plan)
- Redefined problem statement, 3 lines (seed before → after)
- Assumption list (all declared assumptions from ④ + all [unresolved] from ③)
- Knowledge documents to inject: ...
```

Mark the 1–3 most specific items from ② and ③ that others wouldn't know with a ★ at
the top of the map — they are the project's differentiation candidates.

## Downstream Integration — closing the loop

The map is an input, not an endpoint. Unknowns get expensive to fix later; wire them
forward so they resurface at the moment they can still be caught cheaply.

**→ Plan (immediately after the interview)**
- Single-session feature: hand the map to the `planner` agent or `/plan`.
- Multi-session build: hand it to `blueprint` (step briefs) or `plan-orchestrate`;
  each ④-item's disposition becomes a plan step or an explicit non-goal.
- Idea still needs validation before planning: route through `product-lens` first;
  competing directions → `council`.
- Any **declared assumption** that shapes architecture also gets an ADR via
  `architecture-decision-records` — the map entry is the ADR's context section.

**→ During implementation**
- Carry the assumption list into implementation notes: when reality contradicts a
  declared assumption or resolves an `[unresolved]` item, update the map entry
  (assumption → confirmed / broken) instead of silently deviating from the plan.

**→ After implementation**
- The assumption list + `[unresolved]` items are the verification checklist: run
  `verification-loop` against them — every broken assumption is a place the build
  most likely diverged from intent.
- Close with a self-quiz: have the AI ask the user 3 questions from the map's ④
  region; wrong or hesitant answers mean the unknown was papered over, not resolved.

## Escape Clause

Skip any region the user has already made explicit — but leave a one-line reason in the log.
