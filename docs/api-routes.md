# API Routes

Reference map for `app/api/**` HTTP endpoints. For internals of the
underlying Mastra workflow (SSE event schema, agent orchestration, evidence
matching), see [mastra-agents.md](./mastra-agents.md).

## Routes

| Method | Path                             | Purpose                                                                                                                                                                                                                         | Entry file                                   |
| ------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| POST   | `/api/workflow/stream`           | Streams logic-model generation events over SSE. Accepts JSON `{goal}` **or** multipart/form-data with an uploaded PDF/image (≤4 MB) forwarded to Gemini 2.5 Pro as multimodal input (see [File upload path](#file-upload-path)) | `app/api/workflow/stream/route.ts`           |
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
  `EvidenceSearchRequestSchema`, `CompactResponse`, `EvidenceSearchResponse`
- `types/workflow-events.ts` — `WorkflowSSEEvent` union for streaming events

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
