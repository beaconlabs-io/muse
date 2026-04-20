# API Routes

Reference map for `app/api/**` HTTP endpoints. For internals of the
underlying Mastra workflow (SSE event schema, agent orchestration, evidence
matching), see [mastra-agents.md](./mastra-agents.md).

## Routes

| Method | Path                             | Purpose                                                                                               | Entry file                                   |
| ------ | -------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| POST   | `/api/workflow/stream`           | Streams logic-model generation events over SSE (structure → evidence match → external papers → merge) | `app/api/workflow/stream/route.ts`           |
| POST   | `/api/compact`                   | Turns a chat history into a logic model, uploads canvas JSON to IPFS, returns canvas URL              | `app/api/compact/route.ts`                   |
| POST   | `/api/evidence/search`           | Natural-language evidence search backed by the Conversation Bot Agent; optional external paper lookup | `app/api/evidence/search/route.ts`           |
| GET    | `/api/hypercerts/[hypercert-id]` | Proxies a hypercert image with 30-minute edge cache                                                   | `app/api/hypercerts/[hypercert-id]/route.ts` |
| POST   | `/api/upload-to-ipfs`            | Uploads canvas JSON (Zod-validated) to Pinata IPFS                                                    | `app/api/upload-to-ipfs/route.ts`            |
| POST   | `/api/upload-image-to-ipfs`      | Uploads a ≤2 MB image (multipart) to Pinata IPFS                                                      | `app/api/upload-image-to-ipfs/route.ts`      |

## Auth

- `/api/compact` and `/api/evidence/search` are gated by `BOT_API_KEY` when
  it is set in the environment. Authenticated callers must send an
  `x-api-key` header (timing-safe compared). The shared helpers live in
  `lib/api-auth.ts` (`validateApiKey`, `isAuthEnabled`, `unauthorizedResponse`).
- When `BOT_API_KEY` is unset, these routes accept unauthenticated requests
  (useful for local development).
- IPFS and hypercert routes are unauthenticated but require server-side
  secrets (`PINATA_JWT`).

## Request / response schemas

Request bodies are validated with Zod; the canonical schemas live next to
the shared types:

- `types/` — `CanvasDataSchema`, `CompactRequestSchema`,
  `EvidenceSearchRequestSchema`, `CompactResponse`, `EvidenceSearchResponse`
- `types/workflow-events.ts` — `WorkflowSSEEvent` union for streaming events

## Timeouts

- `/api/workflow/stream` and `/api/compact` both declare `maxDuration = 300`
  seconds on Vercel and honour `WORKFLOW_TIMEOUT_MS` from `lib/constants.ts`
  for the underlying workflow.

## Related implementation

- Streaming workflow internals → `mastra/workflows/logic-model-with-evidence.ts`
- Evidence search internals → `lib/evidence-search-batch.ts` + Conversation Bot Agent
- External papers → `lib/external-paper-search.ts` + `lib/academic-apis/`
- IPFS client → `lib/ipfs.ts`
- Error categorization → `lib/workflow-errors.ts`
