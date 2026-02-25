# Causal Reasoning Reference

This reference provides detailed guidance on evaluating and constructing
causal connections in Theory of Change logic models.

## Types of Causal Relationship

Understanding the distinction is critical to honest modeling:

**Correlation**: X and Y tend to occur together. No directionality implied.
Example: "Countries with more schools have higher GDP." (Many confounders.)

**Contribution**: X is one of several factors that plausibly leads to Y.
The mechanism can be articulated and the actor identified.
Example: "Teacher training (X) contributes to improved test scores (Y)
because trained teachers use evidence-based pedagogy, which increases
student engagement during instruction."

**Attribution**: X alone caused Y. Almost never defensible in social programs.
Example: "Our program single-handedly eliminated poverty in the region."

**Theory of Change uses Contribution Logic.** Every connection in a logic model
is a contribution claim: "X contributes to Y through mechanism M, acting on
actor A." This is honest and defensible. Never claim attribution.

## The Mechanism Test

For every connection, apply this template:

> "[Source] contributes to [Target] because [mechanism].
> This works through [actor]'s behavior change, and can be
> observed via [metric]."

### Good Examples

"Workshop completion (Output) contributes to teachers adopting new
assessment methods (Short-term Outcome) because the workshop provides
hands-on practice with rubric design. This works through teachers'
shift from lecture-based to formative assessment, and can be observed
via classroom observation scores."

"Evidence library usage (Short-term Outcome) contributes to
evidence-informed program design (Intermediate Outcome) because
repeated access to structured evidence builds evaluative thinking.
This works through program designers' shift from intuition-based
to evidence-referenced decision-making, and can be observed via
the proportion of new programs citing evidence in their design documents."

### Bad Examples

"Platform launched contributes to digital inclusion because technology
improves lives." (No mechanism. No actor. No observable indicator.)

"Training conducted contributes to industry transformation because
skilled workers drive growth." (Scale leap. Missing adoption step.
Who specifically changes behavior?)

## Five Causal Reasoning Failure Patterns

### 1. Availability Fallacy

**Pattern**: "We built it, therefore people use it."
**Why it fails**: Delivery does not equal adoption. Between an output
existing and people changing their behavior, there are real barriers:
awareness, access, motivation, capability, habit change.
**Fix**: Always insert at least one card between Outputs and Short-term
Outcomes that describes the target population's adoption behavior.

### 2. Scale Leap

**Pattern**: A small-scale activity claims large-scale impact.
**Example**: "Train 50 teachers" --> "National education transformation"
**Why it fails**: The causal chain cannot amplify reach without an
explicit scaling mechanism (policy adoption, cascade training, etc.).
**Fix**: Either add cards explaining the scaling mechanism, or reduce
Impact claims to match the Activities' actual reach.

### 3. Missing Actor

**Pattern**: "The system improves" without specifying who acts differently.
**Example**: "Platform is deployed" --> "Healthcare outcomes improve"
**Why it fails**: Systems don't change themselves. Specific people
(doctors, patients, administrators) must change their behavior.
**Fix**: Name the actor. "Doctors adopt evidence-based protocols
through the platform" is defensible. "Healthcare improves" is not.

### 4. Temporal Compression

**Pattern**: Placing a multi-year outcome in the 0-6 month window.
**Example**: Putting "Institutional culture change" as a Short-term Outcome.
**Why it fails**: Culture change requires sustained practice over years.
Placing it at 0-6 months makes the timeline dishonest.
**Fix**: Use the stage timing guide from `stage-definitions.md`.
Ask: "Could this realistically happen within this timeframe?"

### 5. Convergence Problem

**Pattern**: Multiple independent pathways converge on a single Impact
without explaining how they combine.
**Example**: Three separate training programs all arrow into
"Improved community wellbeing" with no intermediate aggregation.
**Why it fails**: The mechanisms by which separate pathways combine
are often the most important (and most speculative) part of a ToC.
**Fix**: Add an Intermediate Outcome that explains the convergence
mechanism. "Multiple trained cohorts create a critical mass of
practitioners, enabling peer learning networks" is defensible.

## Deriving Connection Density from Causal Structure

Do not aim for a specific number of connections. Instead, let the
causal structure determine the density:

1. **Count distinct causal pathways**: How many independent chains
   run from Activity to Impact? (Typically 2-4 for most interventions.)

2. **Estimate connections per pathway**: A clean causal chain has
   roughly 4 connections (Activity→Output→Short-term→Intermediate→Impact).
   Some pathways may merge or branch.

3. **Add convergence and divergence points**: Where pathways share
   an Intermediate Outcome or where one Output feeds multiple
   Short-term Outcomes, add those connections.

4. **Expected range**: pathway_count × 4 + branch/merge points.
   This naturally produces the right density for the intervention's
   complexity.

**Warning signs**:

- Full mesh (every card connected to every card in the next stage):
  Indicates the model lacks specificity about causal mechanisms.
- Isolated nodes (cards with no incoming or outgoing connections):
  Indicates a card that doesn't participate in any causal pathway.
  Either connect it or remove it.
- Single chain only (no branching or merging): May be too simplistic
  for multi-component interventions.

## Connection Self-Assessment Rubric

Rate each connection before including it in the model:

### Strong

- Mechanism is specific and testable
- Actor is named and their behavior change is observable
- Evidence exists (or could plausibly be collected) supporting this link
- The connection operates within a realistic timeframe for its stage

### Plausible

- Mechanism can be articulated but relies on assumptions
- Actor can be identified but behavior change is indirect
- The connection is supported by analogous evidence from similar programs
- Timeframe is reasonable but depends on contextual factors

### Speculative

- Mechanism is vague or relies on multiple unstated assumptions
- Actor is abstract ("the community", "the system") rather than specific
- No evidence or analogies support this link
- Timeframe is optimistic or unclear

**Guideline**: A defensible logic model should have mostly Strong and
Plausible connections. If more than one-third of connections are
Speculative, the model needs revision. Speculative connections should
be acknowledged in the reasoning field and may indicate where
additional evidence or intermediate cards are needed.
