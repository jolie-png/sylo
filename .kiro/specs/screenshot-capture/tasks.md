# Implementation Plan: Screenshot Capture ("Catch")

## Overview

Implement Catch — Sylo's screenshot inbox where students upload screenshots and Sylo automatically reads, categorizes by topic, and files them. The build follows a layered approach: persistence store first, then extraction server function, then UI route with upload and topic groups, then roadmap integration, dashboard tie-in, and polish. All state lives in localStorage via a React Context provider (matching the existing `WayfindProvider` pattern). Claude vision handles OCR and categorization in a single server call per image.

## Tasks

- [x] 1. Create the Catch store and persistence layer
  - [x] 1.1 Create `src/lib/catch-store.ts` with CatchItem type, CatchState, CatchProvider, and useCatch() hook
    - Define `CatchItem` type with fields: id, title, extractedText, topic, tags, detectedDate, isOpportunityLike, opportunityDetails, linkedStepId, createdAt, imageThumbnailBase64
    - Define `OpportunityDetails` type reusing ProgramDetailsSchema shape from extractOpportunity.functions.ts
    - Define `CatchState` with items array, hydrated boolean, and methods: addItem, updateItem, deleteItem, linkToRoadmap
    - Implement `CatchProvider` using React Context + useState + useEffect for localStorage hydration
    - Persist to localStorage key `"catch:state:v1"` as `{ items: CatchItem[] }`
    - Implement `useCatch()` hook that throws if used outside provider
    - Generate unique IDs (nanoid or timestamp-based) and ISO createdAt on addItem
    - Handle corrupted localStorage gracefully (start with empty state)
    - Handle localStorage full error (log warning, keep in-memory state)
    - Surface a visible toast/banner to the user when localStorage persistence fails, so items don't silently vanish on refresh
    - Add `CatchProvider` to the app's root provider wrapper (same level as `WayfindProvider`) so `useCatch()` is accessible from all routes
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7_

  - [ ]* 1.2 Write vitest test: Store persistence round-trip (Property 5)
    - **Property 5: Store Persistence Round-Trip**
    - Verify that items written to localStorage are recoverable on hydration with identical field values, unique IDs, and valid ISO createdAt timestamps
    - Use hand-written test cases covering: single item, multiple items, items with all optional fields populated, items with minimal fields, and edge cases (empty tags array, long extractedText)
    - Test file: `src/lib/__tests__/catch-store.test.ts`
    - **Validates: Requirements 3.1, 3.3, 3.5**

  - [ ]* 1.3 Write vitest test: Topic grouping invariant (Property 6)
    - **Property 6: Topic Grouping Invariant**
    - Verify that each item appears in exactly the topic group matching its current topic field, and that updating a topic moves it to the new group
    - Write test cases: items with same topic grouped together, items with distinct topics in separate groups, updating an item's topic moves it between groups
    - Test file: `src/lib/__tests__/catch-store.test.ts`
    - **Validates: Requirements 4.1, 4.4**

  - [ ]* 1.4 Write vitest test: Edit persistence (Property 9)
    - **Property 9: Edit Persistence**
    - Verify that applying updateItem with partial updates to title, tags, or topic results in the stored item reflecting new values
    - Write test cases: update title only, update tags only, update topic only, update multiple fields at once, verify unchanged fields remain intact
    - Test file: `src/lib/__tests__/catch-store.test.ts`
    - **Validates: Requirements 7.3**

  - [ ]* 1.5 Write vitest test: Roadmap linking invariant (Property 10)
    - **Property 10: Roadmap Linking Invariant**
    - Verify that after calling linkToRoadmap(itemId, stepId), the item's linkedStepId equals the provided stepId and the item is no longer counted in unlinked opportunity count
    - Write test cases: link a single opportunity item, verify linkedStepId set, verify unlinked count decrements, verify non-opportunity items are unaffected
    - Test file: `src/lib/__tests__/catch-store.test.ts`
    - **Validates: Requirements 8.3, 9.2**

- [x] 2. Checkpoint - Verify store persistence
  - Ensure all tests pass, ask the user if questions arise.
  - Verify that CatchProvider hydrates correctly from localStorage by running the property tests.

- [x] 3. Create the image validation module and extraction server function
  - [x] 3.1 Create `src/lib/catch-validation.ts` with image validation utilities
    - Implement `validateCatchImage(file: File): { valid: boolean; message?: string }` function
    - Accept only PNG, JPEG, and WebP formats (check file.type against `image/png`, `image/jpeg`, `image/webp`)
    - Reject files larger than 8 MB with descriptive error message
    - Export `ALLOWED_IMAGE_TYPES` and `MAX_IMAGE_SIZE_BYTES` constants
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 Create `src/lib/extractCatchItem.functions.ts` server function for Claude vision extraction
    - Follow the `createServerFn` pattern from `extractOpportunity.functions.ts`
    - Define Zod input schema: `{ imageBase64: string, mediaType: "image/png" | "image/jpeg" | "image/webp", filename: string }`
    - Send image as base64 to Claude claude-haiku-4-5-20251001 vision API with structured prompt
    - Prompt instructs Claude to extract: title, extractedText (full OCR), topic (open-ended label), tags (2-4), detectedDate (YYYY-MM-DD or null), isOpportunityLike, and opportunityDetails when applicable
    - Parse Claude's JSON response; validate with Zod
    - Return `CatchItemMetadata` on success or `{ error: string }` on failure
    - Handle: missing API key, timeout (10s), rate limit errors, malformed response, Zod parse failure
    - Never throw — always return structured error objects
    - Do not send any student data beyond the image and extraction prompt
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 3.3 Write vitest test: Extraction schema completeness (Property 3)
    - **Property 3: Extraction Schema Completeness**
    - Verify that for valid Claude vision API responses (mocked), the parsing function produces a result containing all required fields and, when isOpportunityLike is true, produces a valid OpportunityDetails object
    - Write test cases with mocked responses: minimal valid response, full response with all optional fields, opportunity-like response with OpportunityDetails, response with null detectedDate
    - Test file: `src/lib/__tests__/extractCatchItem.test.ts`
    - **Validates: Requirements 2.2, 2.3**

  - [ ]* 3.4 Write vitest test: Extraction error containment (Property 4)
    - **Property 4: Extraction Error Containment**
    - Verify that for each API failure mode (timeout, network error, malformed JSON, invalid schema, missing fields), the extraction service returns a structured `{ error: string }` object and never throws
    - Write explicit test cases for each failure mode using vi.mock to simulate errors
    - Test file: `src/lib/__tests__/extractCatchItem.test.ts`
    - **Validates: Requirements 2.5**

  - [ ]* 3.5 Write vitest test: File validation correctness (Property 1)
    - **Property 1: File Validation Correctness**
    - Verify that validateCatchImage accepts PNG/JPEG/WebP files ≤ 8 MB and rejects all others
    - Write test cases: valid PNG at 1 MB, valid JPEG at 8 MB exactly, valid WebP at 100 KB, invalid GIF, invalid PDF, valid type but 9 MB (reject), 0-byte file
    - Test file: `src/lib/__tests__/catch-validation.test.ts`
    - **Validates: Requirements 1.1, 1.2**

- [x] 4. Checkpoint - Verify extraction works
  - Ensure all tests pass, ask the user if questions arise.
  - Test the extraction server function against a few varied screenshots manually if possible.

- [ ] 5. Implement the /catch route with upload and topic-grouped list
  - [x] 5.1 Create `src/components/screenshot-uploader.tsx` upload component
    - Implement drag-and-drop zone with visual feedback (dragover/dragleave/drop handlers)
    - Implement hidden file input with multi-select (accept `image/png,image/jpeg,image/webp`)
    - Implement clipboard paste handler (listen for `paste` event, extract image from clipboardData)
    - Call `validateCatchImage` per file; show per-file error for invalid files
    - For valid files: read as base64 via FileReader, generate canvas thumbnail (resize to ~200px width, quality 0.6, output as JPEG), call `extractCatchItem` server function
    - Track per-file upload status: `idle | processing | success | error`
    - On success: call `onItemProcessed` callback with complete CatchItem (metadata + thumbnail)
    - Batch handling: invalid files show individual errors, valid files continue independently
    - When extraction fails for an image, provide a manual-entry fallback action (matching the `onFallback` pattern from `link-extractor.tsx`) so the student can still capture the item
    - Props: `{ onItemProcessed: (item: CatchItem) => void; disabled?: boolean }`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 5.2 Write vitest test: Batch isolation (Property 2)
    - **Property 2: Batch Isolation**
    - Verify that in a mixed batch of valid/invalid files, all valid files are processed and all invalid files are rejected independently
    - Write test cases: batch with 1 valid + 1 invalid, batch with all valid, batch with all invalid, batch where first file is invalid but second is valid (verify second still processes)
    - Test file: `src/lib/__tests__/screenshot-uploader.test.ts`
    - **Validates: Requirements 1.6**

  - [x] 5.3 Create `src/components/catch-item-card.tsx` item card component
    - Display thumbnail, title, tags array, and deadline indicator (reuse DeadlinePill pattern)
    - Show opportunity badge when `isOpportunityLike === true`
    - Show "Add to roadmap" button when opportunity-like and `linkedStepId` is not set
    - Show "Added to roadmap" label when `linkedStepId` is set
    - Props: `{ item: CatchItem; onSelect: (id: string) => void; onAddToRoadmap?: (item: CatchItem) => void }`
    - _Requirements: 5.1, 5.2, 5.3, 8.1, 8.4, 8.5_

  - [~] 5.4 Create `src/components/catch-search.tsx` search component
    - Implement case-insensitive search across extractedText, title, and tags fields
    - Debounced input (150ms) for responsive filtering
    - Display results as list showing title, topic, tags, and text snippet with match highlighted
    - Show empty state message when no results match
    - Props: `{ items: CatchItem[]; onResultSelect: (id: string) => void }`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 5.5 Write vitest test: Search completeness and soundness (Property 8)
    - **Property 8: Search Completeness and Soundness**
    - Verify that every returned search result contains the query as a case-insensitive substring in title, extractedText, or tags, and no matching item is excluded
    - Write test cases: exact title match, partial text match, tag match, case mismatch, query matching multiple items, query matching no items, special characters in query
    - Test file: `src/lib/__tests__/catch-search.test.ts`
    - **Validates: Requirements 6.1**

  - [~] 5.6 Create `src/components/catch-item-detail.tsx` single item detail/edit view
    - Display image thumbnail, extractedText (read-only), and editable fields: title, tags, topic, detectedDate
    - Persist edits immediately via `updateItem` from useCatch()
    - Provide "Delete" action with confirmation dialog
    - Provide "Download" action that saves thumbnail to device
    - Show "Add to roadmap" button when isOpportunityLike and no linkedStepId
    - Props: `{ item: CatchItem; onClose: () => void; onUpdate: (id, patch) => void; onDelete: (id) => void; onAddToRoadmap: (item) => void }`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 5.7 Create `src/routes/catch.tsx` route page with topic-grouped layout
    - Register route at `/catch` using TanStack Router (same pattern as other routes)
    - Wrap content in Workspace layout component
    - Place ScreenshotUploader as persistent upload zone at top
    - Place CatchSearch below uploader
    - Display items grouped by topic in collapsible sections, most recently active topic first
    - Show item count per topic section
    - Show empty state with upload instructions when store has zero items
    - Open CatchItemDetail as modal/panel on item select
    - Wire addItem from useCatch() to uploader's onItemProcessed
    - _Requirements: 4.2, 4.3, 4.5, 4.6, 10.2, 10.3, 10.4_

  - [x] 5.8 Add Catch to the NAV array in `src/components/workspace.tsx`
    - Add `{ to: "/catch", label: "Catch", icon: Inbox }` positioned after the "Roadmap" entry
    - Import `Inbox` from lucide-react
    - _Requirements: 10.1_

- [~] 6. Checkpoint - Verify /catch route works end-to-end
  - Ensure all tests pass, ask the user if questions arise.
  - Verify: upload → extraction → topic grouping → search → item detail editing all work.

- [x] 7. Wire "Add to roadmap" using existing addCustomStep path
  - [x] 7.1 Implement roadmap integration in the /catch route
    - Import `useWayfind` and call `addCustomStep` when user taps "Add to roadmap" on a CatchItem
    - Pass opportunityDetails from the CatchItem to create the custom step
    - On success: call `linkToRoadmap(itemId, stepId)` from useCatch() to set the linkedStepId
    - Update UI to show "Added to roadmap" label in place of the button
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 8. Add the dashboard tie-in surface
  - [~] 8.1 Create `src/components/dashboard-catch-indicator.tsx`
    - Single-line dismissible surface showing count of unlinked opportunity-like items
    - Include link that navigates to `/catch`
    - Hidden when count is 0
    - Dismissal persists for current session only (React state, not localStorage)
    - Props: `{ count: number; onDismiss: () => void }`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [~] 8.2 Integrate DashboardCatchIndicator into `src/routes/dashboard.tsx`
    - Import useCatch() to compute unlinked opportunity count: `items.filter(i => i.isOpportunityLike && !i.linkedStepId).length`
    - Render DashboardCatchIndicator at top of dashboard when count > 0
    - Manage dismissed state locally (useState, resets on page refresh)
    - _Requirements: 9.1, 9.2, 9.5_

  - [ ]* 8.3 Write vitest test: Dashboard indicator count (Property 10 — dashboard aspect)
    - **Property 10 (Dashboard): Unlinked Opportunity Count**
    - Verify that the indicator count equals items where isOpportunityLike && !linkedStepId
    - Write test cases: no opportunity items (count 0), all opportunity items linked (count 0), mix of linked/unlinked opportunities, non-opportunity items don't affect count
    - Test file: `src/lib/__tests__/catch-store.test.ts`
    - **Validates: Requirements 9.2, 9.5**

- [~] 9. Checkpoint - Verify roadmap integration and dashboard tie-in
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Polish: empty states, topic reassignment, deadline flagging
  - [~] 10.1 Implement deadline classification and urgent flagging
    - Create a `classifyDeadline(date: string): "urgent" | "normal" | "passed"` utility in catch-store or a shared utils file
    - "urgent" = within 7 days from today, "normal" = more than 7 days in future, "passed" = in the past
    - Apply visual indicators in CatchItemCard using DeadlinePill pattern: urgent (red/amber accent), normal (standard), passed (muted/strikethrough)
    - Sort items with near-future dates toward top within their topic group
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 10.2 Write vitest test: Deadline classification (Property 7)
    - **Property 7: Deadline Classification**
    - Verify that the classifier categorizes dates as "urgent" (≤7 days future), "normal" (>7 days future), or "passed" (in past), deterministically for same input
    - Write test cases: today (urgent), 3 days from now (urgent), exactly 7 days from now (urgent), 8 days from now (normal), yesterday (passed), 30 days ago (passed)
    - Test file: `src/lib/__tests__/catch-store.test.ts`
    - **Validates: Requirements 5.2, 5.3**

  - [~] 10.3 Implement topic reassignment via detail view
    - In CatchItemDetail, allow typing a new topic name (free-text input or select from existing topics)
    - On topic change, call updateItem with new topic — item moves to new topic group automatically
    - _Requirements: 4.4, 4.5_

- [~] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify the complete flow: upload screenshot → extraction → topic filing → search → roadmap integration → dashboard indicator.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Tests validate universal correctness properties from the design document using plain vitest with hand-written test cases (no external PBT libraries)
- Unit tests and correctness-property tests are complementary
- The existing `createServerFn` pattern in `extractOpportunity.functions.ts` is the reference for the extraction server function
- The existing `createAnthropicClient` in `anthropic.server.ts` is reused — no new AI client setup needed
- The existing `WayfindProvider`/`useWayfind()` pattern is the reference for the Catch store architecture
- CatchProvider is mounted in task 1.1 alongside store creation to avoid `useCatch()` crashes in downstream routes
- Do NOT modify: `opportunities-db.ts`, `opportunities-db.json`, `paths.tsx`, `success-map-form.tsx`, or `published-maps.ts`
- Thumbnails must be canvas-resized to ~200px width at quality 0.6 to respect localStorage size constraints
- The full-resolution image is sent to server once for extraction but never persisted client-side
- **Lean critical path** (time-constrained build, skip optional tests): 1.1 → 3.1 → 3.2 → 5.1 → 5.3 → 5.7 → 5.8 → 7.1

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.5"] },
    { "id": 3, "tasks": ["3.3", "3.4", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "5.6"] },
    { "id": 5, "tasks": ["5.5", "5.7", "5.8"] },
    { "id": 6, "tasks": ["7.1"] },
    { "id": 7, "tasks": ["8.1", "10.1"] },
    { "id": 8, "tasks": ["8.2", "8.3", "10.2", "10.3"] }
  ]
}
```
