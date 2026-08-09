# Implementation Plan: Resume Upload

## Overview

Implement a resume upload feature that allows students to upload PDF, TXT, or DOCX files to auto-fill their profile fields. The flow: client validates and encodes the file → TanStack Start server function extracts text → Claude parses into structured fields → profile store is updated. No file is persisted.

## Tasks

- [x] 1. Install dependencies and create shared validation module
  - [x] 1.1 Install npm packages `pdf-parse` and `mammoth`, plus `@types/pdf-parse` if available
    - Run `npm install pdf-parse mammoth` and `npm install -D @types/pdf-parse` (mammoth ships its own types)
    - _Requirements: 4.2, 4.4_

  - [x] 1.2 Create `src/lib/resume-validation.ts` with shared constants and validation function
    - Define `ALLOWED_EXTENSIONS` array (`.pdf`, `.txt`, `.docx`)
    - Define `MAX_FILE_SIZE_BYTES` constant (5 MB)
    - Implement `validateResumeFile(file: File): ValidationResult` that checks extension and size
    - Export `ParsedResumeData` type with optional fields: experience, skills, priorWork, clubs, alreadyDone
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Implement the server function for resume parsing
  - [x] 2.1 Create `src/lib/parseResume.functions.ts` with the `parseResume` server function
    - Follow the `createServerFn` pattern from `generateLiveRoadmap.functions.ts`
    - Define Zod input schema (fileBase64 string, filename string)
    - Define Zod output schema matching `ParsedResumeData`
    - Decode base64 to Buffer, validate size server-side
    - Route to text extractor by file extension (.pdf → pdf-parse, .docx → mammoth, .txt → Buffer.toString)
    - Send extracted text to Claude (claude-haiku-4-5) with structured system prompt
    - Validate Claude response with Zod, return structured `ParsedResumeData` or error
    - Use `createAnthropicClient` from `anthropic.server.ts`
    - Return `{ error: true, message }` for all failure cases (bad type, too large, extraction failure, Claude failure)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 9.2, 9.3_

  - [x] 2.2 Write property test: Invalid file extensions are rejected (Property 1)
    - **Property 1: Invalid file extensions are rejected**
    - For any file with an extension not in [.pdf, .txt, .docx], validateResumeFile returns a failure
    - **Validates: Requirements 2.1, 2.4**

  - [x] 2.3 Write property test: Oversized files are rejected at both layers (Property 2)
    - **Property 2: Oversized files are rejected at both layers**
    - For any file > 5 MB, both client validation and server handler reject it
    - **Validates: Requirements 2.2, 4.5**

  - [x] 2.4 Write property test: TXT extraction round-trip (Property 3)
    - **Property 3: TXT extraction round-trip**
    - For any valid UTF-8 string, encoding to .txt buffer and extracting returns the same string
    - **Validates: Requirements 4.3**

  - [x] 2.5 Write property test: Response contains only Profile_Fields (Property 4)
    - **Property 4: Response contains only Profile_Fields**
    - For any successful parse result, the response contains only the 5 expected keys
    - **Validates: Requirements 5.3, 9.3**

- [x] 3. Checkpoint - Ensure server function builds correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement the ResumeUpload component
  - [x] 4.1 Create `src/components/resume-upload.tsx` with file upload UI and state machine
    - Render a styled drop zone / button using Tailwind CSS and lucide-react icons (Upload icon)
    - Use a hidden `<input type="file" accept=".pdf,.txt,.docx">` triggered by the button
    - Implement state machine: idle → validating → uploading → processing → success, with error branching
    - Call `validateResumeFile` on file selection; show inline error if invalid (Req 2.1, 2.2)
    - Read file as base64 via FileReader API
    - Call `parseResume` server function with `{ fileBase64, filename }`
    - Display loading indicators: "Uploading resume..." and "Analyzing your resume..." (Req 3.1, 3.2)
    - On success, display success message and call `onParsed` callback (Req 3.3)
    - On error, display error message and return to idle for retry (Req 8.1, 8.2, 8.3)
    - Accept props: `onParsed: (data: ParsedResumeData) => void` and optional `disabled`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 8.1, 8.2, 8.3_

- [x] 5. Implement profile merge logic and integrate into pages
  - [x] 5.1 Add `mergeResumeData` utility function to `src/lib/wayfind-store.tsx`
    - Implement `mergeResumeData(existing: Profile, parsed: ParsedResumeData): Profile`
    - Only overwrite fields where the parsed value is non-empty (non-blank string)
    - Preserve existing values for fields where parsed data is empty/undefined
    - _Requirements: 6.1, 6.2, 7.1, 7.2, 7.3_

  - [x] 5.2 Integrate ResumeUpload component into `src/routes/roadmap-builder.tsx`
    - Import `ResumeUpload` and `mergeResumeData`
    - Place the component in the "Tell Sylo more about you" section
    - Wire `onParsed` to merge data into profile via `setProfile`
    - _Requirements: 1.1, 6.1, 6.3_

  - [x] 5.3 Integrate ResumeUpload component into `src/routes/profile.tsx`
    - Import `ResumeUpload` and `mergeResumeData`
    - Place the component in the "Tell Sylo more about you" section
    - Wire `onParsed` to merge data into profile via `setProfile`
    - _Requirements: 1.2, 6.1, 6.3_

  - [x] 5.4 Write property test: Profile merge preserves existing data for empty fields (Property 5)
    - **Property 5: Profile merge preserves existing data for empty parsed fields**
    - For any existing Profile and any parsed result, fields are only overwritten when parsed value is non-blank
    - **Validates: Requirements 6.1, 6.2**

  - [x] 5.5 Write property test: Errors preserve existing profile state (Property 7)
    - **Property 7: Errors preserve existing profile state**
    - If parseResume returns an error, the Profile_Store remains unchanged
    - **Validates: Requirements 8.4**

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `createServerFn` pattern in `generateLiveRoadmap.functions.ts` is the reference for task 2.1
- The existing `createAnthropicClient` in `anthropic.server.ts` is reused — no new AI client setup needed
- Property 6 (manual edits persist after auto-fill) is inherently satisfied by React's controlled component pattern and the store design — no separate test needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "5.4", "5.5"] }
  ]
}
```
