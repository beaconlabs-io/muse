# Common Mistakes Reference

The most frequent errors when calling logicModelTool, ordered by
frequency. Each mistake causes a tool validation failure (or silently
strips fields).

## Mistake #1: targetContext as Object

targetContext must be a plain string.

Wrong:

```json
"targetContext": {
  "targetPopulation": "Teachers in rural schools",
  "goals": "Improve assessment practices"
}
```

Fix:

```json
"targetContext": "Teachers in rural schools, aiming to improve formative assessment practices"
```

## Mistake #2: Metrics as Strings or Missing Description

**Note:** When metrics generation is disabled, an empty array `[]` is valid for the metrics field. The following applies only when metrics are being generated.

Each metric must be an object with a concise `name` and a one-sentence
`description`. The description is later used as a hint by the recipe
agent, so a name-only metric loses signal.

Wrong:

```json
"metrics": ["Participant count", "Satisfaction score"]
```

Discouraged (name only, no description):

```json
"metrics": [{ "name": "Participant count" }]
```

Fix:

```json
"metrics": [{
  "name": "Participant count",
  "description": "Unique people who completed registration this period — captures reach for the activity."
}]
```

Do **not** add `measurementMethod`, `frequency`, or `targetValue` —
those fields are no longer part of the schema; they are elaborated later
by the recipe agent.

## Mistake #3: Invalid Connection Density

Creating too many connections (full mesh) or too few (disconnected model).

Signs of too many:

- Every card connects to every card in the next stage
- Connections exceed 15 for a simple intervention
- Some connections lack a clear mechanism

Signs of too few:

- Cards with no outgoing connections (dead ends)
- Stages completely disconnected from each other
- Fewer than one connection per card on average

Fix: Let the causal structure determine density. Each card should have
1-2 outgoing connections to the next stage. Only create connections where
you can articulate the mechanism. See `causal-reasoning.md` for guidance.

## Mistake #4: Exceeding Character Limits

The tool enforces strict character limits on card text.

| Field       | Limit              |
| ----------- | ------------------ |
| title       | 100 characters max |
| description | 300 characters max |

Fix: Keep titles short and specific. Use description for detail.
If a title exceeds 100 characters, it is too verbose -- extract the
detail into the description field.

Wrong title (too long):

```
"Develop and implement a comprehensive teacher training program focused on formative assessment methods for rural elementary schools"
```

Fix:

```json
{
  "title": "Teacher Training: Formative Assessment Methods",
  "description": "12-week program for rural elementary school teachers covering rubric design, peer assessment, and feedback techniques"
}
```
