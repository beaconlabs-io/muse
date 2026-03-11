# Scoring Calibration Examples

Use these worked examples to calibrate your scoring. Apply the same standards
consistently across all edges in a batch.

## Example 1: Score 95 (STRONG MATCH)

**Edge**: "Deploy coding bootcamp" → "100 developers certified"
**Evidence**: intervention="Coding bootcamp program" outcome="Developer certifications awarded"

**Reasoning**:

- Intervention Match: **STRONG** - Same concept (coding bootcamp)
- Outcome Match: **STRONG** - Direct measure (certifications)
- Causal Link: **Direct** - bootcamp causes certifications
- Confidence: 95

**Final Score: 95** ✓ Include

## Example 2: Score 75 (MODERATE MATCH)

**Edge**: "Community workshops" → "Increased participation"
**Evidence**: intervention="Educational events" outcome="Attendance numbers"

**Reasoning**:

- Intervention Match: **MODERATE** - Related but broader concept
- Outcome Match: **MODERATE** - Attendance is proxy for participation
- Causal Link: **Plausible** - events can increase engagement
- Confidence: 70

**Final Score: 75** ✓ Include (borderline -- apply extra scrutiny)

## Example 3: Score 60 (WEAK -- EXCLUDE)

**Edge**: "Deploy app" → "User satisfaction"
**Evidence**: intervention="Software release" outcome="Download count"

**Reasoning**:

- Intervention Match: **MODERATE** - Related concepts
- Outcome Match: **WEAK** - Downloads ≠ satisfaction
- Causal Link: **Weak** - downloads don't prove satisfaction
- Confidence: 50

**Final Score: 60** ✗ Exclude (below 70 threshold)

## Borderline Handling (65-75 Range)

When a score lands between 65 and 75:

1. **Re-evaluate conservatively**: Would a skeptical program evaluator agree?
2. **Check confidence**: If confidence < 60, the score should drop below 70
3. **Look for the causal mechanism**: Can you state "X causes Y because..." in one sentence?
4. **Default to exclusion**: An honest gap is better than a forced connection
5. **Document uncertainty**: State explicitly what makes this match borderline

## Consistency Rules

- Apply the **same scoring standard** across all edges in a batch
- Do not inflate scores for edges with few matches to "give them something"
- Do not deflate scores for well-matched edges if many alternatives exist
- A score of 70 means the same quality regardless of which edge it belongs to
