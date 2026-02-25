# Common Evidence Matching Mistakes

Avoid these frequent evaluation errors. Each costs credibility and reduces
the usefulness of evidence matching results.

## 1. High Scores Without Causal Links

**Mistake**: Assigning 80+ because keywords overlap, without verifying a causal mechanism.

**Why it fails**: Keyword similarity ≠ causal support. "Education" in both Source and evidence
does not mean the evidence supports the specific educational intervention.

**Fix**: Always complete Step C (Causal Link Assessment) before scoring.

## 2. Inconsistent Scoring Across Edges

**Mistake**: Using stricter criteria for some edges and lenient criteria for others
within the same batch.

**Why it fails**: Downstream consumers compare scores across edges. Inconsistency
makes cross-edge comparison meaningless.

**Fix**: Before returning results, scan all scores and verify the same standards applied.

## 3. Missing Required Fields

**Mistake**: Omitting `interventionText`, `outcomeText`, or `reasoning` from match objects.

**Why it fails**: These fields are required for audit trails and human review. Incomplete
records cannot be verified.

**Fix**: Check every match object has all 6 required fields: `evidenceId`, `score`,
`confidence`, `reasoning`, `interventionText`, `outcomeText`.

## 4. Including Sub-Threshold Scores

**Mistake**: Including matches with scores below 70 in the results.

**Why it fails**: The threshold exists for quality control. Sub-70 matches are noise
that pollutes the signal.

**Fix**: Filter strictly. If score < 70, do not include the match regardless of
how "close" it feels.

## 5. Forgetting Empty Arrays

**Mistake**: Omitting arrow IDs from results when no evidence matches.

**Why it fails**: Consumers iterate over all arrow IDs expecting entries. Missing
keys cause runtime errors or silent data loss.

**Fix**: Every arrow ID from the input must appear in the results, even if its
value is an empty array `[]`.
