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

| Field       | Type                    | Constraint                   |
| ----------- | ----------------------- | ---------------------------- |
| title       | string                  | Required, 1-100 characters   |
| description | string                  | Optional, max 200 characters |
| metrics     | array of metric objects | Required, minimum 1 per card |

## Metric Objects

Every metric must be an object with these fields:

| Field             | Type        | Required |
| ----------------- | ----------- | -------- |
| name              | string      | Yes      |
| description       | string      | No       |
| measurementMethod | string      | Yes      |
| frequency         | enum string | Yes      |

Valid frequency values (exact strings):

- `"daily"`
- `"weekly"`
- `"monthly"`
- `"quarterly"`
- `"annually"`
- `"other"`

Correct metric:

```json
{
  "name": "Number of participants",
  "measurementMethod": "Registration count from platform database",
  "frequency": "monthly"
}
```

Wrong (string instead of object):

```json
"Number of participants"
```

Wrong (missing required fields):

```json
{ "name": "Number of participants" }
```

## Connections

Each connection requires:

| Field         | Type             | Required                      |
| ------------- | ---------------- | ----------------------------- |
| fromCardIndex | number (0-based) | Yes                           |
| fromCardType  | enum             | Yes                           |
| toCardIndex   | number (0-based) | Yes                           |
| toCardType    | enum             | Yes                           |
| reasoning     | string           | No (but strongly recommended) |

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
