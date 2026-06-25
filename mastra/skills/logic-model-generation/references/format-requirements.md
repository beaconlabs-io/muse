# Format Requirements Reference

Exact format rules for the logicModelTool input. The tool validates all
inputs with Zod schemas -- violations cause tool call failures.

## targetContext

**Type**: String (not an object)

Correct:

```
"Targeting Ethereum developers to increase ecosystem participation"
```

Wrong:

```
{ "targetPopulation": "Ethereum developers", "goals": "increase participation" }
```

## Card Fields

Each card (in activities, outputs, outcomesShort, outcomesIntermediate, impact) requires:

| Field       | Type                    | Constraint                                                         |
| ----------- | ----------------------- | ------------------------------------------------------------------ |
| title       | string                  | Required, 1-100 characters                                         |
| description | string                  | Optional, max 300 characters                                       |
| metrics     | array of metric objects | Optional (empty array allowed when metrics generation is disabled) |

## Metric Objects

Every metric must be an object with these fields:

| Field       | Type   | Required                      |
| ----------- | ------ | ----------------------------- |
| name        | string | Yes                           |
| description | string | No (but strongly recommended) |

Logic-model metrics are intentionally lightweight: only `name` (3-8
words) and a one-sentence `description` explaining what the metric
captures and why it matters for the parent card. Measurement method,
frequency, target value, and cautions are NOT produced at this stage —
they are elaborated later by the recipe agent.

The `description` is later used as a hint by the recipe agent when
generating concrete measurement steps. Skip it only when you genuinely
cannot infer a meaningful intent from the card context.

Correct metric:

```json
{
  "name": "Number of participants",
  "description": "Unique people who completed registration this period — captures reach for the activity."
}
```

Wrong (string instead of object):

```json
"Number of participants"
```

Wrong (extra fields that are no longer part of the schema):

```json
{
  "name": "Number of participants",
  "measurementMethod": "Registration query",
  "frequency": "monthly"
}
```

## Connections

Each connection requires:

| Field         | Type             | Required |
| ------------- | ---------------- | -------- |
| fromCardIndex | number (0-based) | Yes      |
| fromCardType  | enum             | Yes      |
| toCardIndex   | number (0-based) | Yes      |
| toCardType    | enum             | Yes      |

Valid card type values for fromCardType and toCardType:

- `"activities"`
- `"outputs"`
- `"outcomesShort"`
- `"outcomesIntermediate"`
- `"impact"`

Limits enforced by the tool:

- Maximum 25 total connections
- Maximum 3 outgoing connections per card
- Connections exceeding these limits are silently dropped

## Stage Arrays

Each stage array requires at least 1 card:

- `activities`: min 1
- `outputs`: min 1
- `outcomesShort`: min 1
- `outcomesIntermediate`: min 1
- `impact`: min 1
