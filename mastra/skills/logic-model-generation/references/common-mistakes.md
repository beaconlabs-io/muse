# Common Mistakes Reference

The five most frequent errors when calling logicModelTool, ordered by
frequency. Each mistake causes a tool validation failure.

## Mistake #1: targetContext as Object (50% of errors)

The most common error. targetContext must be a plain string.

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

## Mistake #2: Metrics as Strings (30% of errors)

Each metric must be an object with name, measurementMethod, and frequency.

Wrong:

```json
"metrics": ["Participant count", "Satisfaction score"]
```

Also wrong:

```json
"metrics": [{ "name": "Participant count" }]
```

Fix:

```json
"metrics": [{
  "name": "Participant count",
  "measurementMethod": "Registration database query",
  "frequency": "monthly"
}]
```

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

## Mistake #4: Invalid Frequency Values

The frequency field only accepts exact enum values.

Wrong:

```json
"frequency": "Monthly"     // wrong case
"frequency": "biweekly"    // not in enum
"frequency": "every month" // not in enum
"frequency": "yearly"      // use "annually"
```

Fix -- use exactly one of:

```
"daily" | "weekly" | "monthly" | "quarterly" | "annually" | "other"
```

## Mistake #5: Exceeding Character Limits

The tool enforces strict character limits on card text.

| Field       | Limit              |
| ----------- | ------------------ |
| title       | 100 characters max |
| description | 200 characters max |

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
