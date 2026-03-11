# Verification Checklist

Run through this checklist **before returning results**. Each item catches
a different category of error.

## Checklist

- [ ] **All arrow IDs present**: Every arrowId from the input appears in results,
      even if its match array is empty `[]`

- [ ] **Score threshold enforced**: Only matches with score ≥ 70 are included.
      No exceptions, no "borderline includes" at 68 or 69.

- [ ] **All required fields populated**: Every match object has exactly 6 fields:
      `evidenceId`, `score`, `confidence`, `reasoning`, `interventionText`, `outcomeText`

- [ ] **Structured reasoning format**: Every `reasoning` field follows the format:
      "Intervention Match: [level] - [explain]. Outcome Match: [level] - [explain].
      Causal Link: [type] - [explain]."

- [ ] **Confidence values populated**: Every match has a `confidence` value between
      0 and 100. This is separate from `score` -- confidence measures certainty about
      the score itself.

- [ ] **JSON format correct**: Output matches the expected schema exactly.
      No extra fields, no missing nesting, no markdown wrapping.
