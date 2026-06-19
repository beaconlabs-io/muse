# API Routes

Reference map for `app/api/**` HTTP endpoints. For internals of the
underlying Mastra workflow (SSE event schema, agent orchestration, evidence
matching), see [mastra-agents.md](./mastra-agents.md).

## Routes

| Method | Path                             | Purpose                                                                                                                                                                                                                         | Entry file                                   |
| ------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| POST   | `/api/workflow/stream`           | Streams logic-model generation events over SSE. Accepts JSON `{goal}` **or** multipart/form-data with an uploaded PDF/image (≤4 MB) forwarded to Gemini 2.5 Pro as multimodal input (see [File upload path](#file-upload-path)) | `app/api/workflow/stream/route.ts`           |
| POST   | `/api/recipe/stream`             | Streams measurement-recipe generation events over SSE. Input: `{ logicModelTitle, metrics[], locale }`. Wraps `recipeWorkflow` (single-step LLM call) and emits the same step-start / step-finish / _-error / _-complete shape  | `app/api/recipe/stream/route.ts`             |
| POST   | `/api/compact`                   | Turns a chat history into a logic model, uploads canvas JSON to IPFS, returns canvas URL                                                                                                                                        | `app/api/compact/route.ts`                   |
| POST   | `/api/evidence/search`           | Natural-language evidence search backed by the Conversation Bot Agent; optional external paper lookup                                                                                                                           | `app/api/evidence/search/route.ts`           |
| GET    | `/api/hypercerts/[hypercert-id]` | Proxies a hypercert image with 30-minute edge cache                                                                                                                                                                             | `app/api/hypercerts/[hypercert-id]/route.ts` |
| POST   | `/api/upload-to-ipfs`            | Uploads canvas JSON (Zod-validated) to Pinata IPFS                                                                                                                                                                              | `app/api/upload-to-ipfs/route.ts`            |
| POST   | `/api/upload-image-to-ipfs`      | Uploads a ≤2 MB image (multipart) to Pinata IPFS                                                                                                                                                                                | `app/api/upload-image-to-ipfs/route.ts`      |

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
  `EvidenceSearchRequestSchema`, `CompactResponse`, `EvidenceSearchResponse`,
  `RecipeSchema`, `RecipeMetricContextSchema`, `RecipeWorkflowInputSchema`,
  `RecipeLocaleSchema`, `RECIPE_TARGET_CARD_TYPES`
- `types/workflow-events.ts` — `WorkflowSSEEvent` union for streaming events
- `types/recipe-events.ts` — `RecipeSSEEvent` union for `/api/recipe/stream`

## File upload path

`/api/workflow/stream` branches on `Content-Type`:

- `application/json` → parsed with `JsonRequestSchema` (`goal`,
  `enableExternalSearch`, `enableMetrics`). Existing behaviour.
- `multipart/form-data` → file upload path documented here. Used by the
  "From file" tab of the Generate Logic Model dialog to send a grant
  application or program proposal directly to Gemini 2.5 Pro as
  multimodal input.

### Form fields

| Field                  | Required | Notes                                                         |
| ---------------------- | -------- | ------------------------------------------------------------- |
| `file`                 | yes      | `File` blob. MIME + size + magic bytes validated server-side. |
| `enableExternalSearch` | no       | String `"true"` to enable Step 2.5 external paper search.     |
| `enableMetrics`        | no       | String `"true"` to have the agent generate metrics for cards. |

### Accepted MIME types and size ceiling

- Whitelist (`FILE_UPLOAD_ALLOWED_MIME_TYPES` in `lib/constants.ts`):
  `application/pdf`, `image/png`, `image/jpeg`, `image/webp`.
- Per-file max: 4 MB (`FILE_UPLOAD_MAX_BYTES`). Chosen to leave headroom
  under Vercel's 4.5 MB request body limit
  (`VERCEL_REQUEST_BODY_LIMIT_BYTES`) for the multipart boundary and
  non-file fields.

### Server-side validation order

Enforced in `parseRequest` in `app/api/workflow/stream/route.ts`:

1. `request.formData()` must parse — otherwise `400 Invalid multipart payload`.
2. `file` field must be a `File` — otherwise `400 Missing file field`.
3. `file.type` must match `MimeTypeSchema` — otherwise `400 Unsupported file type`
   (response includes `details: "Got <mime>; allowed: ..."`).
4. `file.size` must be ≤ the per-MIME ceiling (currently uniform at 4 MB)
   — otherwise `413 File too large`.
5. Magic-byte check via `verifyMagicBytes` — `%PDF-` for PDF, PNG signature
   `89 50 4E 47`, JPEG `FF D8 FF`, RIFF/WEBP for WebP. Mismatch →
   `400 File content does not match declared type`. This catches spoofed
   extensions even if `file.type` looked valid.

The file contents are then base64-encoded and forwarded to the workflow
as `fileInput: { mediaType, data, fileName }`. **Uploads are transient —
nothing is persisted server-side**; the bytes only exist in memory for
the duration of the Gemini call.

### Error response shape

All errors from this route use JSON of the form
`{ error: string, details?: string }` with `Content-Type: application/json`.
Error codes specific to the multipart path:

| Status | `error`                                     | Cause                                              |
| ------ | ------------------------------------------- | -------------------------------------------------- |
| 400    | `Invalid multipart payload`                 | `request.formData()` threw                         |
| 400    | `Missing file field`                        | `file` form field absent or not a `File`           |
| 400    | `Unsupported file type`                     | MIME outside the whitelist                         |
| 400    | `File content does not match declared type` | Magic-byte check failed (spoofed extension)        |
| 413    | `File too large`                            | Exceeds `FILE_UPLOAD_MAX_BYTES_BY_MIME[mediaType]` |

The JSON path still returns `400 Invalid JSON` / `400 Invalid request`
as before.

## Workflow error handling

Both `/api/workflow/stream` (SSE) and `/api/compact` (REST) funnel Mastra
workflow failures through `lib/workflow-errors.ts` so the UI can render
locale-aware messages instead of a generic "Workflow failed".

### Pipeline

1. **`extractErrorMessage(payload)`** — pulls the deepest `Error.message`
   out of a Mastra step-failure payload. It walks `payload.error.cause`
   recursively, then falls back to `payload.output.error`, then to
   `"Step failed"`. This is needed because Mastra spreads thrown errors
   onto `payload.error` rather than nesting them under `payload.output`.
2. **`categorizeError(rawMessage)`** — keyword-matches the raw message
   and returns one of the seven `ErrorCategory` values below. Categories
   correspond 1:1 to keys in the `workflowErrors` namespace of
   `messages/{en,ja}.json`.

### Error categories

| Category       | Trigger keywords (case-insensitive)             | i18n key                      |
| -------------- | ----------------------------------------------- | ----------------------------- |
| `highDemand`   | `"high demand"`, `"overloaded"`, `"503"`        | `workflowErrors.highDemand`   |
| `rateLimit`    | `"rate limit"`, `"429"`, `"too many requests"`  | `workflowErrors.rateLimit`    |
| `timeout`      | `"timeout"`, `"timed out"`, `"deadline"`        | `workflowErrors.timeout`      |
| `authError`    | `"unauthorized"`, `"forbidden"`, `"api key"`    | `workflowErrors.authError`    |
| `invalidInput` | `"validation"`, `"invalid"`, `"zod"`            | `workflowErrors.invalidInput` |
| `modelError`   | `"model"`, `"provider"`, `"gemini"`, `"openai"` | `workflowErrors.modelError`   |
| `unknown`      | Default fallback when none of the above match.  | `workflowErrors.unknown`      |

### SSE event shape (`/api/workflow/stream`)

Step-level and workflow-level failures emit:

```jsonc
// type: "step-error" — fired when a single step fails
{ "type": "step-error", "stepId": "...", "error": "<raw message>", "errorCategory": "rateLimit" }

// type: "workflow-error" — fired when the workflow as a whole fails
{
  "type": "workflow-error",
  "error": "<raw message>",
  "errorCategory": "highDemand",
  "rawError": "<deepest message from failed step, if any>",
  "failedStepId": "step-id-or-null"
}
```

`errorCategory` is the contract — the client (`GenerateLogicModelDialog`,
`useWorkflowStream`) looks up the matching `tErrors(category)` translation
to render a user-facing message, while `error` / `rawError` are kept for
logs and the "show details" affordance.

### REST shape (`/api/compact`)

Returns `5xx` JSON of the form `{ error, errorCategory }` where
`errorCategory` is the same enum. Callers (e.g. the bot integration) can
choose to translate or surface the raw message.

### UI wiring

- `components/canvas/GenerateLogicModelDialog.tsx` listens for
  `step-error` / `workflow-error` SSE events and maps `errorCategory`
  through `useTranslations("workflowErrors")`.
- The dialog shows the localised category message in the main view and
  reveals the raw `error` / `rawError` only when the user expands the
  details disclosure.

### Adding a new category

1. Add the new value to `ErrorCategory` in `lib/workflow-errors.ts` and
   a matching branch in `categorizeError()`.
2. Add the translation in `messages/en.json` and `messages/ja.json` under
   `workflowErrors`.
3. Cover the new keyword(s) in `lib/workflow-errors.test.ts`.

## Timeouts

- `/api/workflow/stream` and `/api/compact` both declare `maxDuration = 300`
  seconds on Vercel and honour `WORKFLOW_TIMEOUT_MS` from `lib/constants.ts`
  for the underlying workflow.

## Related implementation

- Streaming workflow internals → `mastra/workflows/logic-model-with-evidence.ts`
  (Step 1 accepts optional `fileInput` and builds a multi-part user message
  with `{ type: "file", data, mediaType }` when present)
- File upload constants & MIME whitelist → `lib/constants.ts`
  (`FILE_UPLOAD_ALLOWED_MIME_TYPES`, `FILE_UPLOAD_MAX_BYTES`,
  `VERCEL_REQUEST_BODY_LIMIT_BYTES`)
- Evidence search internals → `lib/evidence-search-batch.ts` + Conversation Bot Agent
- External papers → `lib/external-paper-search.ts` + `lib/academic-apis/`
- IPFS client → `lib/ipfs.ts`
- Error categorization → `lib/workflow-errors.ts`
