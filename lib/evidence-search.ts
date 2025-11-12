import Anthropic from "@anthropic-ai/sdk";
import { embedQuery } from "./embed-evidence";
import { parseEvidenceFiles } from "./evidence-parser";
import { searchSimilarEvidence, getCollectionStats } from "./vector-store-mastra";
import type { Evidence, EvidenceMatch } from "@/types";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.MODEL || "claude-sonnet-4-5-20250929";

// Enable/disable RAG (set to false to use original exhaustive search)
const USE_RAG = true;
const RAG_TOP_K = 15; // Number of candidates to retrieve from vector search
const RAG_THRESHOLD = 0.5; // Minimum similarity score (0-1) - lowered from 0.7 to find more candidates

/**
 * Search for evidence that supports a causal relationship between two cards
 * Uses hybrid RAG approach: vector search → LLM validation
 * @param fromContent Content of the source card (e.g., Activity)
 * @param toContent Content of the target card (e.g., Output)
 * @returns Array of matching evidence with scores and reasoning
 */
export async function searchEvidenceForEdge(
  fromContent: string,
  toContent: string,
): Promise<EvidenceMatch[]> {
  try {
    if (USE_RAG) {
      return await searchWithRAG(fromContent, toContent);
    } else {
      return await searchExhaustive(fromContent, toContent);
    }
  } catch (error) {
    console.error("Error searching evidence for edge:", error);
    return [];
  }
}

/**
 * Hybrid RAG search: Vector search → LLM validation
 * Much faster and cheaper for large evidence sets
 */
async function searchWithRAG(fromContent: string, toContent: string): Promise<EvidenceMatch[]> {
  try {
    // Check if vector store has data
    const stats = await getCollectionStats();
    if (stats.vectorCount === 0) {
      console.warn(
        "Vector store is empty. Run sync:embeddings first. Falling back to exhaustive search.",
      );
      return await searchExhaustive(fromContent, toContent);
    }

    console.log(`[RAG] Vector store has ${stats.vectorCount} evidence vectors`);

    // Step 1: Create search query
    const query = `${fromContent} causes ${toContent}`;

    // Step 2: Vector search for top-k candidates
    const vectorSearchStart = Date.now();
    const queryVector = await embedQuery(query);
    const candidates = await searchSimilarEvidence(queryVector, RAG_TOP_K, RAG_THRESHOLD);
    const vectorSearchTime = Date.now() - vectorSearchStart;

    console.log(
      `[RAG] Vector search found ${candidates.length} candidates in ${vectorSearchTime}ms ` +
        `(query: "${query.slice(0, 50)}...")`,
    );

    if (candidates.length === 0) {
      console.log("[RAG] No similar evidence found above threshold");
      return [];
    }

    // Step 3: Load full evidence data for candidates
    const allEvidence = await parseEvidenceFiles();
    const evidenceMap = new Map(allEvidence.map((e) => [e.evidence_id, e]));

    const candidateEvidence = candidates
      .map((c) => evidenceMap.get(c.payload.evidenceId))
      .filter(
        (e): e is Evidence => e !== undefined && e.results !== undefined && e.results.length > 0,
      );

    console.log(`[RAG] Evaluating ${candidateEvidence.length} candidates with LLM`);

    // Step 4: LLM evaluation of candidates (same as exhaustive, but fewer items)
    const MAX_CONCURRENT = 3;
    const evaluations: (EvidenceMatch | null)[] = [];

    for (let i = 0; i < candidateEvidence.length; i += MAX_CONCURRENT) {
      const batch = candidateEvidence.slice(i, i + MAX_CONCURRENT);
      const batchResults = await Promise.all(
        batch.map((evidence) => evaluateEvidenceMatch(evidence, fromContent, toContent)),
      );
      evaluations.push(...batchResults);
    }

    // Filter matches (score > 60) and sort by score descending - lowered from 70 to find more matches
    const matches = evaluations
      .filter((e) => e !== null && e.score > 60)
      .sort((a, b) => b!.score - a!.score) as EvidenceMatch[];

    console.log(`[RAG] Found ${matches.length} matches after LLM validation`);

    return matches;
  } catch (error) {
    console.error("Error in RAG search:", error);
    // Fallback to exhaustive search on error
    console.warn("Falling back to exhaustive search");
    return await searchExhaustive(fromContent, toContent);
  }
}

/**
 * Original exhaustive search (evaluates ALL evidence)
 * Fallback when RAG is disabled or fails
 */
async function searchExhaustive(fromContent: string, toContent: string): Promise<EvidenceMatch[]> {
  console.log("[Exhaustive] Evaluating ALL evidence with LLM");

  // Load all evidence
  const allEvidence = await parseEvidenceFiles();

  // Filter evidence that has results (intervention → outcome pairs)
  const evidenceWithResults = allEvidence.filter((e) => e.results && e.results.length > 0);

  if (evidenceWithResults.length === 0) {
    return [];
  }

  // Process evidence with limited concurrency to avoid rate limits
  const MAX_CONCURRENT = 3;
  const evaluations: (EvidenceMatch | null)[] = [];

  for (let i = 0; i < evidenceWithResults.length; i += MAX_CONCURRENT) {
    const batch = evidenceWithResults.slice(i, i + MAX_CONCURRENT);
    const batchResults = await Promise.all(
      batch.map((evidence) => evaluateEvidenceMatch(evidence, fromContent, toContent)),
    );
    evaluations.push(...batchResults);
  }

  // Filter matches (score > 60) and sort by score descending - lowered from 70 to find more matches
  const matches = evaluations
    .filter((e) => e !== null && e.score > 60)
    .sort((a, b) => b!.score - a!.score) as EvidenceMatch[];

  console.log(`[Exhaustive] Found ${matches.length} matches`);

  return matches;
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error
      const isRateLimitError = error?.status === 429;
      const retryAfter = error?.headers?.["retry-after"];

      if (attempt < maxRetries) {
        // Calculate delay: use retry-after header if available, otherwise exponential backoff
        let delayMs: number;
        if (isRateLimitError && retryAfter) {
          delayMs = parseInt(retryAfter) * 1000; // Convert seconds to ms
        } else {
          delayMs = initialDelayMs * Math.pow(2, attempt);
        }

        console.log(
          `Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms` +
            (isRateLimitError ? " (rate limit)" : ""),
        );

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

async function evaluateEvidenceMatch(
  evidence: Evidence,
  fromContent: string,
  toContent: string,
): Promise<EvidenceMatch | null> {
  try {
    // Extract all intervention → outcome pairs from evidence
    const relationships = evidence.results
      ?.map((r) => ({
        intervention: r.intervention,
        outcome: r.outcome_variable,
        effect: r.outcome || "unclear",
      }))
      .filter((r) => r.intervention && r.outcome);

    if (!relationships || relationships.length === 0) {
      return null;
    }

    // Create prompt for LLM evaluation
    const prompt = `You are an expert policy analyst evaluating research evidence.

**Task**: Determine if the provided research evidence supports the causal relationship in a logic model.

**Logic Model Edge**:
- Source (Intervention/Activity): "${fromContent}"
- Target (Output/Outcome): "${toContent}"

**Research Evidence**:
- Evidence ID: ${evidence.evidence_id}
- Title: ${evidence.title}
- Strength: ${evidence.strength || "not reported"} (Maryland Scientific Method Scale: 0-5)
- Methodologies: ${Array.isArray(evidence.methodologies) ? evidence.methodologies.join(", ") : evidence.methodologies || "not specified"}

**Evidence Results** (Intervention → Outcome relationships):
${relationships
  .map(
    (r, i) => `${i + 1}. Intervention: "${r.intervention}"
   Outcome: "${r.outcome}"
   Effect: ${r.effect}`,
  )
  .join("\n\n")}

**Your Task**:
1. Evaluate if ANY of the evidence results support the logic model edge relationship
2. Consider:
   - Does the intervention align with the source card content?
   - Does the outcome align with the target card content?
   - Is there a plausible causal link?
3. Return a JSON object with:
   - match: true if evidence supports the relationship, false otherwise
   - score: 0-100 (0=no match, 100=perfect match)
   - reasoning: Brief explanation (2-3 sentences) of why the evidence does/doesn't support the relationship

**Important**: Be strict but fair. Only match if there's a clear connection. Don't match based on vague similarities.

Return ONLY valid JSON in this exact format:
{
  "match": true/false,
  "score": number,
  "reasoning": "string"
}`;

    // Use retry logic for API call
    const message = await retryWithBackoff(
      () =>
        anthropic.messages.create({
          model: MODEL,
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      3, // max retries
      2000, // initial delay 2s
    );

    // Parse LLM response
    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = responseText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/, "").replace(/\n?```$/, "");
    }

    const evaluation = JSON.parse(jsonText) as {
      match: boolean;
      score: number;
      reasoning: string;
    };

    // Lowered threshold from 70 to 60 to find more matches
    if (!evaluation.match || evaluation.score <= 60) {
      return null;
    }

    // Parse strength as number
    const strengthNum = evidence.strength ? parseInt(evidence.strength) : 0;

    // Create evidence match object
    const evidenceMatch: EvidenceMatch = {
      evidenceId: evidence.evidence_id,
      score: evaluation.score,
      reasoning: evaluation.reasoning,
      strength: evidence.strength,
      hasWarning: strengthNum < 3,
      title: evidence.title,
      interventionText: relationships[0]?.intervention,
      outcomeText: relationships[0]?.outcome,
    };

    return evidenceMatch;
  } catch (error) {
    console.error(`Error evaluating evidence ${evidence.evidence_id}:`, error);
    return null;
  }
}
