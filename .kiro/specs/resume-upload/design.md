# Technical Design: Resume Upload

## Architecture Overview

The resume upload feature follows a client-server architecture where the client handles file selection and validation, sends the file as base64 to a TanStack Start server function, which extracts text, sends it to Claude for structured parsing, and returns profile fields to the client store.

```
┌─────────────────────────────────────────────────────────┐
│  Client (Browser)                                       │
│                                                         │
│  ┌─────────────────┐    ┌──────────────────────────┐   │
│  │ ResumeUpload    │───▶│ validateResumeFile()     │   │
│  │ Component       │    │ (type + size checks)     │   │
│  └────────┬────────┘    └──────────────────────────┘   │
│           │ base64 payload                              │
│           ▼                                             │
│  ┌─────────────────┐                                   │
│  │ parseResume()   │  ← createServerFn (RPC call)      │
│  │ server function │                                   │
│  └────────┬────────┘                                   │
│           │ parsed Profile_Fields                       │
│           ▼                                             │
│  ┌─────────────────┐                                   │
│  │ Profile_Store   │  ← mergeResumeData() helper       │
│  │ (wayfind-store) │                                   │
│  └─────────────────┘                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Server (Node.js — TanStack Start handler)              │
│                                                         │
│  parseResume handler:                                   │
│    1. Zod-validate input (base64 + filename)            │
│    2. Decode base64 → Buffer                            │
│    3. Route by extension:                               │
│       .pdf  → pdf-parse                                 │
│       .docx → mammoth                                   │
│       .txt  → Buffer.toString("utf-8")                  │
│    4. Send extracted text → Claude (claude-haiku-4-5)   │
│    5. Zod-validate Claude response                      │
│    6. Return ProfileFields JSON                         │
│    7. Discard buffer (GC handles it)                    │
└─────────────────────────────────────────────────────────┘
```

## Components

### 1. ResumeUpload Component (`src/components/resume-upload.tsx`)

A reusable React component rendered inside the "Tell Sylo more about you" section on both the roadmap-builder and profile pages.

**Responsibilities:**
- Renders a file input (hidden) and a styled drop zone / button
- Validates selected file (type + size) client-side
- Reads file as base64 via FileReader API
- Calls the `parseResume` server function
- Manages upload state (idle, uploading, processing, success, error)
- On success, calls a callback to merge parsed data into Profile_Store

**Props:**
```typescript
interface ResumeUploadProps {
  onParsed: (data: ParsedResumeData) => void;
  disabled?: boolean;
}
```

**State machine:**
```
idle → validating → uploading → processing → success
                 ↘ error ←─────────────────────────↗
```

### 2. parseResume Server Function (`src/lib/parseResume.functions.ts`)

A `createServerFn` following the same pattern as `generateLiveRoadmap.functions.ts`.

**Responsibilities:**
- Validates input with Zod (base64 string + filename)
- Decodes base64 to Buffer, checks size server-side
- Routes to appropriate text extractor based on file extension
- Sends extracted text to Claude with a structured prompt
- Validates Claude's response with Zod
- Returns only the structured profile fields
- Never persists the file — buffer is local to the handler scope

### 3. Text Extractors (inline in parseResume.functions.ts)

Three extraction strategies, selected by file extension:

| Extension | Library    | Approach                          |
|-----------|-----------|-----------------------------------|
| `.pdf`    | pdf-parse | `pdf(buffer)` → `data.text`       |
| `.docx`   | mammoth   | `mammoth.extractRawText({buffer})` |
| `.txt`    | native    | `buffer.toString("utf-8")`        |

### 4. Profile Merge Logic (in wayfind-store or a utility)

A pure function `mergeResumeData(existing: Profile, parsed: ParsedResumeData): Profile` that:
- Only overwrites fields where the parsed value is non-empty (non-blank string)
- Preserves existing values for fields where parsed data is empty/undefined

## Interfaces and Data Models

### ParsedResumeData

The structured output from the server function:

```typescript
/** Fields extracted from a resume by Claude. All optional — empty means Claude couldn't find it. */
export type ParsedResumeData = {
  experience?: string;
  skills?: string;
  priorWork?: string;
  clubs?: string;
  alreadyDone?: string;
};
```

### Server Function Input Schema (Zod)

```typescript
import { z } from "zod";

const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".docx"] as const;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ParseResumeInput = z.object({
  /** Base64-encoded file content */
  fileBase64: z.string().min(1),
  /** Original filename including extension */
  filename: z.string().min(1),
});

export type ParseResumeInput = z.infer<typeof ParseResumeInput>;
```

### Server Function Output Schema (Zod)

```typescript
export const ParseResumeOutput = z.object({
  experience: z.string().optional().default(""),
  skills: z.string().optional().default(""),
  priorWork: z.string().optional().default(""),
  clubs: z.string().optional().default(""),
  alreadyDone: z.string().optional().default(""),
});

export type ParseResumeOutput = z.infer<typeof ParseResumeOutput>;
```

### Server Function Error Response

```typescript
export type ParseResumeError = {
  error: true;
  message: string;
};

export type ParseResumeResult = ParseResumeOutput | ParseResumeError;
```

### Client-Side Validation Function

```typescript
export type ValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validateResumeFile(file: File): ValidationResult {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
    return { valid: false, message: "Please upload a PDF, TXT, or DOCX file." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, message: "File must be under 5 MB." };
  }
  return { valid: true };
}
```

## Server Function Implementation

### parseResume Server Function

```typescript
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createAnthropicClient } from "./anthropic.server";

const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".docx"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const Input = z.object({
  fileBase64: z.string().min(1),
  filename: z.string().min(1),
});

const ProfileFieldsSchema = z.object({
  experience: z.string().optional().default(""),
  skills: z.string().optional().default(""),
  priorWork: z.string().optional().default(""),
  clubs: z.string().optional().default(""),
  alreadyDone: z.string().optional().default(""),
});

export const parseResume = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<ParseResumeResult> => {
    // 1. Decode and validate size
    const buffer = Buffer.from(data.fileBase64, "base64");
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return { error: true, message: "File exceeds 5 MB limit." };
    }

    // 2. Extract text based on extension
    const ext = data.filename.slice(data.filename.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return { error: true, message: "Unsupported file type." };
    }

    let extractedText: string;
    try {
      extractedText = await extractText(buffer, ext);
    } catch (err) {
      return { error: true, message: "Could not read the file. Please try a different format." };
    }

    if (!extractedText.trim()) {
      return { error: true, message: "No text content found in the file." };
    }

    // 3. Send to Claude for structured parsing
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return { error: true, message: "Resume parsing is temporarily unavailable." };
    }

    try {
      const client = createAnthropicClient(anthropicKey);
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: RESUME_SYSTEM_PROMPT,
        messages: [{ role: "user", content: extractedText.slice(0, 15000) }],
      });

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");

      const json = JSON.parse(text);
      const parsed = ProfileFieldsSchema.safeParse(json);

      if (!parsed.success) {
        return { error: true, message: "Could not structure the resume data. Please try again." };
      }

      return parsed.data;
    } catch {
      return { error: true, message: "Resume analysis failed. Please try again." };
    }
  });
```

### Text Extraction Routing

```typescript
async function extractText(buffer: Buffer, ext: string): Promise<string> {
  switch (ext) {
    case ".txt":
      return buffer.toString("utf-8");
    case ".pdf": {
      const pdf = await import("pdf-parse");
      const data = await pdf.default(buffer);
      return data.text;
    }
    case ".docx": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    default:
      throw new Error(`Unsupported extension: ${ext}`);
  }
}
```

### Claude System Prompt

```typescript
const RESUME_SYSTEM_PROMPT = `You are a resume parser. Given the text content of a student's resume, extract and return a JSON object with these fields:

- experience: A brief summary of their background, projects, and relevant experience (1-3 sentences)
- skills: Comma-separated list of technical skills, tools, and languages they know
- priorWork: Prior internships, jobs, or research positions (brief, comma-separated or short descriptions)
- clubs: Clubs, organizations, or extracurriculars they participate in
- alreadyDone: What they've already accomplished toward career goals (courses, applications, projects)

Rules:
1. Return ONLY a JSON object with these 5 keys. No markdown, no explanation.
2. If a field has no relevant information in the resume, use an empty string "".
3. Keep each field concise — summarize rather than copy verbatim.
4. Use natural, conversational language (this fills a student profile).

Example output:
{"experience":"Built a full-stack React app for a class project, contributed to an open-source CLI tool","skills":"Python, JavaScript, React, SQL, Git, Figma","priorWork":"Software intern at Acme Corp (Summer 2024), campus IT help desk","clubs":"ACM chapter, hackathon team","alreadyDone":"Applied to Google STEP, completed Coursera ML specialization"}`;
```

## Client-Side Integration

### File Reading and Upload Flow

```typescript
async function handleFileSelected(file: File): Promise<void> {
  // 1. Validate
  const validation = validateResumeFile(file);
  if (!validation.valid) {
    setError(validation.message);
    return;
  }

  // 2. Read as base64
  setStatus("uploading");
  const base64 = await readFileAsBase64(file);

  // 3. Call server function
  setStatus("processing");
  const result = await parseResume({ fileBase64: base64, filename: file.name });

  // 4. Handle result
  if ("error" in result) {
    setError(result.message);
    setStatus("error");
    return;
  }

  onParsed(result);
  setStatus("success");
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip the data:...;base64, prefix
      resolve(dataUrl.split(",")[1]);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
```

### Profile Store Merge

The merge function is called from the page components when `onParsed` fires:

```typescript
/** Merge parsed resume data into existing profile, preserving non-empty existing values
 *  when the parsed field is empty. */
export function mergeResumeData(
  existing: Profile,
  parsed: ParsedResumeData,
): Profile {
  return {
    ...existing,
    experience: parsed.experience?.trim() || existing.experience,
    skills: parsed.skills?.trim() || existing.skills,
    priorWork: parsed.priorWork?.trim() || existing.priorWork,
    clubs: parsed.clubs?.trim() || existing.clubs,
    alreadyDone: parsed.alreadyDone?.trim() || existing.alreadyDone,
  };
}
```

### Component Usage on Pages

On both `roadmap-builder.tsx` and `profile.tsx`, the `ResumeUpload` component is placed inside the "Tell Sylo more about you" section:

```typescript
<ResumeUpload
  onParsed={(data) => {
    const merged = mergeResumeData(currentProfile, data);
    setProfile(merged);
  }}
/>
```

## Error Handling

| Failure Point | Behavior |
|---|---|
| Invalid file type (client) | Show inline error, do not call server |
| File too large (client) | Show inline error, do not call server |
| File too large (server) | Return `{ error: true, message }` |
| Text extraction fails | Return `{ error: true, message }` suggesting a different format |
| No text content found | Return `{ error: true, message }` |
| ANTHROPIC_API_KEY missing | Return `{ error: true, message }` — temporary unavailability |
| Claude fails or times out | Return `{ error: true, message }` — retry suggestion |
| Claude returns invalid JSON | Return `{ error: true, message }` — retry suggestion |
| Network error (client) | Catch in component, show retry suggestion |

In all error cases, the Profile_Store is never modified — existing data is preserved.

After any error, the component returns to the `idle` state so the user can try again.

## File Disposal Strategy

The uploaded file lives only as a `Buffer` local variable inside the server function handler. Once the handler returns, the buffer is eligible for garbage collection. No explicit cleanup is needed because:
- The buffer is never assigned to module-level state
- No file system writes occur
- The only data that leaves the handler is the structured `ParsedResumeData` object

## Dependencies

New npm packages required:

| Package | Purpose | Size |
|---|---|---|
| `pdf-parse` | Extract text from PDF buffers | ~14 KB (no native deps) |
| `mammoth` | Extract text from DOCX buffers | ~120 KB |

Both are dynamically imported in the handler (tree-shaken from client bundle).

## File Structure

```
src/
├── components/
│   └── resume-upload.tsx          ← ResumeUpload component
├── lib/
│   ├── parseResume.functions.ts   ← Server function + extractors
│   ├── resume-validation.ts       ← Shared validation (type, size constants)
│   └── wayfind-store.tsx          ← Updated with mergeResumeData utility
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Invalid file extensions are rejected

*For any* file whose extension is not one of `.pdf`, `.txt`, or `.docx`, the `validateResumeFile` function SHALL return a validation failure with an error message mentioning accepted file types — and the file SHALL NOT be sent to the server.

**Validates: Requirements 2.1, 2.4**

### Property 2: Oversized files are rejected at both layers

*For any* file whose size exceeds 5 MB, `validateResumeFile` on the client SHALL return a validation failure, and independently, the server handler SHALL return an error response — regardless of file type or content.

**Validates: Requirements 2.2, 4.5**

### Property 3: TXT extraction round-trip

*For any* valid UTF-8 text string, encoding it as a `.txt` file buffer and passing it through the text extraction function SHALL return the exact same string.

**Validates: Requirements 4.3**

### Property 4: Response contains only Profile_Fields

*For any* successful parse result returned by the `parseResume` server function, the response object SHALL contain only the keys `experience`, `skills`, `priorWork`, `clubs`, and `alreadyDone` — no raw file content, no extracted text, no other metadata.

**Validates: Requirements 5.3, 9.3**

### Property 5: Profile merge preserves existing data for empty parsed fields

*For any* existing Profile state and *for any* parsed resume result, the `mergeResumeData` function SHALL overwrite a field only when the parsed value is a non-empty (non-blank) string. Fields where the parsed value is empty or undefined SHALL retain their existing value unchanged.

**Validates: Requirements 6.1, 6.2**

### Property 6: Manual edits persist after auto-fill

*For any* Profile state that was previously auto-filled from a resume, and *for any* subsequent manual edit to a Profile_Field, the store SHALL reflect the manual edit value — the auto-filled value SHALL NOT reassert itself.

**Validates: Requirements 7.3**

### Property 7: Errors preserve existing profile state

*For any* existing Profile state, if the `parseResume` server function returns an error response (or a network error occurs), the Profile_Store SHALL remain completely unchanged from its pre-upload state.

**Validates: Requirements 8.4**

