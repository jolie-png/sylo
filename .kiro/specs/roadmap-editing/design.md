# Design Document: Roadmap Editing

## Architecture Overview

The roadmap-editing feature adds three capabilities to the existing Sylo dashboard: inline note editing on AI-generated steps, a unified notes system with compact popover display, and academic term-based scheduling for custom steps. All state flows through the existing `WayfindProvider` context and persists to localStorage under the `wayfind:state:v1` key.

No new routes, providers, or external dependencies are introduced. The feature extends the existing store shape and dashboard component with minimal surface area.

---

## Components

### 1. Store Layer (`src/lib/wayfind-store.tsx`)

#### New State: `stepNotes`

A new field is added to the persisted state to hold User_Notes for Sylo_Steps. Custom_Steps already have a `note` field, so they need no structural change.

```typescript
// New map persisted alongside existing state fields
type StepNotes = Record<string, string>; // keyed by opportunityId

// Added to the State type
stepNotes: StepNotes;
setStepNote: (opportunityId: string, note: string | null) => void;
```

**Rationale:** Keeping notes in a separate map (rather than adding a field to each `Step` object) avoids mutating the AI-generated roadmap structure and makes it trivial to preserve `reasoning` unchanged.

#### Modified: `CustomStep.targetDate` field

The `targetDate` field type remains `string | undefined` but now accepts either:
- An ISO date string (e.g., `"2025-09-15"`) for backward compatibility
- An academic term string (e.g., `"Fall Junior"`) for new term-based selections

A utility function distinguishes the two at render time.

#### Store Mutations

| Mutation | Signature | Behavior |
|----------|-----------|----------|
| `setStepNote` | `(opportunityId: string, note: string \| null) => void` | Sets or removes a User_Note for a Sylo_Step. `null` or empty string removes the entry. |
| `updateCustomStep` | *(existing)* | Already supports `{ note: string }` patches for Custom_Steps. No change needed. |
| `addCustomStep` | *(modified)* | The `targetDate` parameter now accepts an academic term string. |

#### Persistence

The `stepNotes` map is added to the JSON blob written to localStorage:

```typescript
localStorage.setItem(KEY, JSON.stringify({
  profile, roadmap, liveOpportunities, customSteps, pinnedIds,
  stepNotes, // new
}));
```

Hydration reads `stepNotes` from the parsed object, defaulting to `{}` if absent (handles existing users with no notes saved).

---

### 2. Academic Term Utilities (`src/lib/terms.ts`)

New exports added alongside the existing `termFor` / `termsFromDeadlines` functions:

```typescript
export type AcademicTerm = {
  /** e.g. "Fall Junior" — used as the stored value */
  value: string;
  /** e.g. "Fall Junior Year" — used for display */
  label: string;
};

export const SEASONS = ["Fall", "Spring", "Summer"] as const;
export type Season = (typeof SEASONS)[number];

/**
 * Generate all academic term options ordered chronologically
 * starting from the student's current year.
 */
export function academicTermOptions(
  currentYear: string,
  years: string[]
): AcademicTerm[] { /* ... */ }

/**
 * Detect whether a targetDate string is an ISO date or an academic term.
 */
export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Format a targetDate for display: returns the ISO date formatted or
 * the academic term label with "Year" appended.
 */
export function formatTargetDate(value: string): string { /* ... */ }
```

**Term ordering logic:** The canonical season order within a single academic year is `Fall → Spring → Summer` (Fall starts the year). Given `currentYear = "Sophomore"`, the list begins at `"Fall Sophomore"` and proceeds through all remaining terms chronologically.

---

### 3. UI Components

#### `InlineNoteEditor` (new, in `src/components/inline-note-editor.tsx`)

A small inline editing component rendered inside the Sylo_Step card when the user clicks the pencil icon.

```typescript
type InlineNoteEditorProps = {
  opportunityId: string;
  existingNote: string | undefined;
  reasoning: string;
  onClose: () => void;
};
```

**Behavior:**
- Renders a `<textarea>` pre-populated with `existingNote` (or empty)
- Displays the `reasoning` below in a dimmed `text-muted-foreground` style
- On blur or Enter (without Shift), calls `setStepNote(opportunityId, trimmedValue)` — if empty, passes `null` to remove
- Calls `onClose()` after save

#### `NoteIndicator` (new, in `src/components/note-indicator.tsx`)

A small badge/icon rendered on any Step_Card that has a User_Note.

```typescript
type NoteIndicatorProps = {
  note: string;
};
```

**Behavior:**
- Renders a `StickyNote` icon from lucide-react
- Wrapped in a `Popover` (from existing `@/components/ui/popover`)
- Clicking opens a `PopoverContent` displaying the full note text
- Keeps card compact — no inline text by default

#### `AcademicTermSelector` (new, in `src/components/academic-term-selector.tsx`)

A dropdown selector replacing the date `<input>` in the Custom_Step creation and editing forms.

```typescript
type AcademicTermSelectorProps = {
  value: string;
  currentYear: string;
  onChange: (term: string) => void;
};
```

**Behavior:**
- Uses the existing Radix `Select` component from `@/components/ui/select`
- Calls `academicTermOptions(currentYear, YEARS)` to build options
- Options display as `"{Season} {Year} Year"` (e.g., "Fall Junior Year")
- Selected value stored as `"{Season} {Year}"` (e.g., "Fall Junior")
- Includes a "No term" / clear option

---

### 4. Dashboard Modifications (`src/routes/dashboard.tsx`)

#### Sylo_Step cards

- Add a `Pencil` icon button (already imported) to each Sylo_Step `<li>`
- Track `editingStepId` state (similar to existing `editingId` for Custom_Steps)
- When `editingStepId === step.id`, render `<InlineNoteEditor>` instead of the static reasoning text
- When a step has a note in `stepNotes[step.opportunityId]`, render:
  - The User_Note text in normal weight
  - The Original_Reasoning in `text-muted-foreground/60` below
  - A `<NoteIndicator>` on the card

#### Custom_Step cards

- Replace `<input type="date">` with `<AcademicTermSelector>` in both the creation form and the edit-in-place form
- Render the term label via `formatTargetDate(s.targetDate)` — handles both old ISO dates and new term strings
- Add `<NoteIndicator>` when `s.note` is non-empty (notes already stored in the `note` field)

---

## Data Models

### State Shape (persisted to localStorage)

```typescript
{
  profile: Profile;
  roadmap: Roadmap;             // steps[].reasoning remains immutable
  liveOpportunities: Opportunity[];
  customSteps: CustomStep[];     // .targetDate now accepts term strings
  pinnedIds: string[];
  stepNotes: Record<string, string>;  // NEW: opportunityId → User_Note
}
```

### Academic Term Value Format

| Stored value | Display label |
|---|---|
| `"Fall First year"` | `"Fall First Year"` |
| `"Spring Sophomore"` | `"Spring Sophomore Year"` |
| `"Summer Senior"` | `"Summer Senior Year"` |

### Backward Compatibility

The `formatTargetDate` utility detects the format:
- If `isIsoDate(value)` → format as locale date string
- Otherwise → append "Year" and capitalize appropriately

---

## Interfaces

### Store API additions

```typescript
interface WayfindState {
  // ... existing fields ...
  stepNotes: Record<string, string>;
  setStepNote: (opportunityId: string, note: string | null) => void;
}
```

### Component Props

```typescript
// InlineNoteEditor
{
  opportunityId: string;
  existingNote: string | undefined;
  reasoning: string;
  onClose: () => void;
}

// NoteIndicator
{
  note: string;
}

// AcademicTermSelector
{
  value: string;
  currentYear: string;
  onChange: (term: string) => void;
}
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| localStorage write fails (quota exceeded, private browsing) | Catch in the persistence `useEffect`. State remains in-memory for the session — user notes are not lost until page unload. Mirrors existing store behavior. |
| `stepNotes` key missing on hydration | Default to `{}`. Existing users see no notes — no migration needed. |
| `targetDate` is neither ISO date nor known term string | `formatTargetDate` returns the raw string as-is — graceful fallback, no crash. |
| User submits only whitespace in note editor | Treat as empty → remove the note (same as clearing). |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Note persistence round-trip for Sylo Steps

*For any* Sylo_Step with a given opportunityId and *for any* non-empty string value, calling `setStepNote(opportunityId, value)` and then reading `stepNotes[opportunityId]` from the store SHALL return that same value.

**Validates: Requirements 1.5, 2.7**

### Property 2: Original reasoning immutability

*For any* Sylo_Step, saving a User_Note via `setStepNote` SHALL NOT modify the `reasoning` field of that step in `roadmap.steps`. The reasoning before and after the note operation must be identical.

**Validates: Requirements 1.6**

### Property 3: Note removal on empty submission

*For any* Sylo_Step that has an existing User_Note, calling `setStepNote(opportunityId, null)` or `setStepNote(opportunityId, "")` SHALL result in `stepNotes[opportunityId]` being `undefined` (key removed from the map).

**Validates: Requirements 1.9**

### Property 4: Note pre-population in edit mode

*For any* Sylo_Step that has a saved User_Note with value V, entering Inline_Edit_Mode for that step SHALL display V as the initial content of the text input.

**Validates: Requirements 1.8**

### Property 5: Note display for both step types

*For any* step (Sylo_Step or Custom_Step) that has a non-empty User_Note, the rendered Step_Card SHALL include a Note_Indicator element, and opening that indicator SHALL display the full note text.

**Validates: Requirements 2.2, 2.3, 2.5**

### Property 6: Sylo_Step card displays note alongside reasoning

*For any* Sylo_Step with a saved User_Note, the rendered Step_Card SHALL display both the User_Note text and the Original_Reasoning text simultaneously.

**Validates: Requirements 1.7**

### Property 7: Academic term options completeness

*For any* value of `currentYear` from the YEARS constant, `academicTermOptions(currentYear, YEARS)` SHALL return exactly `3 × YEARS.length` options (one per season-year combination), and all options from `currentYear` onward SHALL appear before options from earlier years (wrapping).

**Validates: Requirements 3.3, 3.4**

### Property 8: Academic term persistence round-trip

*For any* valid `AcademicTerm.value` string, saving it as the `targetDate` of a Custom_Step via `addCustomStep` or `updateCustomStep`, then reading that step's `targetDate`, SHALL return the same term string.

**Validates: Requirements 3.5**

### Property 9: Backward-compatible date display

*For any* Custom_Step whose `targetDate` is a valid ISO date string (matching `YYYY-MM-DD`), `formatTargetDate(targetDate)` SHALL produce a human-readable date string (not an error or the raw academic term format). *For any* Custom_Step whose `targetDate` is a valid academic term string, `formatTargetDate(targetDate)` SHALL produce the corresponding term label with "Year" appended.

**Validates: Requirements 3.6, 3.8**

### Property 10: Custom_Step note field mapping

*For any* Custom_Step and *for any* non-empty string value, calling `updateCustomStep(id, { note: value })` SHALL result in that Custom_Step's `note` field equaling value.

**Validates: Requirements 2.6**
