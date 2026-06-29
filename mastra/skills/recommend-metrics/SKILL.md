---
name: recommend-metrics
description: Make a measurement recipe (steps, data-collection method, frequency, target, cautions) that an M&E beginner can actually execute. Use when generating recipe items for a metric, prioritizing simple first-step procedures, lightweight data collection, plain language, and a realistic first measurement cycle over methodological rigor.
---

# Recommend Metrics

## Overview

Use this skill when turning a metric into a measurement recipe for a program operator who is new to monitoring & evaluation (M&E). The goal is a recipe that the user can actually run this month with basic tools (a spreadsheet, an attendance log, a short survey), not an ideal evaluation design.

Treat the metric as a learning tool: measure enough to see whether the program is being delivered, whether people are reached, and whether early signs of intended change appear. Keep the steps plain, the data collection lightweight, and the first version small. When details are missing, make practical assumptions and label them inside the recipe so the user can adjust them later.

## Accessibility Workflow

For each metric you receive, design the recipe so that every field below stays beginner-runnable.

1. **measurementSteps** — Write 3-6 ordered, imperative steps a beginner can follow without prior M&E experience.
   - Start from existing records, a simple count, a one-question check, a 3-5 question mini-survey, a short checklist, or a follow-up message before reaching for anything more complex.
   - Each step names what to record, who is included, and when it happens. Avoid vague verbs like "evaluate" or "analyze" without a concrete artifact.
   - If a step uses a statistical concept (baseline, denominator, segment), add one short clause that explains it in plain language.

2. **dataCollectionMethod** — Describe the lightest method that produces usable data. Refer to generic categories ("a spreadsheet tracker", "a one-question end-of-session survey", "an attendance log", "a follow-up message") rather than specific products or brands.

3. **frequency** — Recommend a cadence the team can actually sustain. Prefer "Per session", "Per cohort", "Monthly", or "Quarterly". Avoid asking for weekly multi-question surveys unless the parent card's nature genuinely demands them. The metric input does not carry a frequency — pick the one that fits the metric and parent card.

4. **targetValue** — Baseline data is not provided at the input layer. Default to "Collect one cycle as a baseline, then set a target" rather than inventing a number. Use the metric description (when present) as a hint for what would constitute a sensible target. Keep targets gentle and revisable.

5. **cautions** — Surface 1-3 practical caveats the beginner is most likely to hit: response bias from a tiny sample, self-selection of who answers, missing follow-up data, exclusion of harder-to-reach groups, or the temptation to overclaim causality from monitoring data. Keep each caveat to one or two sentences in everyday language.

For concrete starter patterns you can adapt for measurementSteps and dataCollectionMethod, consult `references/metric-design-rubric.md`.

## Compatibility Rules

Stay aligned with the recipe-agent's existing CRITICAL RULES so that beginner accessibility does not override them.

- **Concrete and beginner-runnable together.** Do not retreat to vague instructions in the name of simplicity. "Send a 3-question online form within 48 hours of the session and require a participant ID" is still beginner-friendly and is preferred over "Survey participants".
- **Use the metric description as a hint.** When the metric carries a `metricDescription`, treat it as the user's intent for what the metric should capture — ground measurement steps in that intent rather than generic patterns. When no description is present, infer intent from the parent card.
- **Stay grounded in the parent card.** The recipe must measure the Output or Outcome the metric belongs to. Do not generalize to other parts of the logic model.
- **No brand names.** Always use generic categories (a spreadsheet, a CRM, a survey form, a project-management tool) instead of specific products.
- **Preserve language.** Write the entire recipe in the language the user worked in (English or Japanese). Never translate or mix.

## Quality Checks

Before finalizing the recipe, verify that:

- A program operator with no prior M&E experience could carry out `measurementSteps` using only basic tools.
- `dataCollectionMethod` matches the method implied by the steps (no contradictions).
- `frequency` is something the team could realistically sustain through one full cycle.
- `targetValue` does not invent a number when the user has no baseline data.
- `cautions` warn against the most likely beginner mistakes without overwhelming the user.
- No required step demands a control group, validated scale, complex sampling, or specialist analysis unless the user explicitly asked for them.
