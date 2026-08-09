# Implementation Plan: Roadmap Editing

## Overview

This plan implements three capabilities for the Sylo dashboard: inline note editing on AI-generated steps, a unified notes system with compact popover display, and academic term-based scheduling for custom steps. All changes flow through the existing `WayfindProvider` context and persist to localStorage. No new routes or external dependencies are introduced.

## Tasks

- [x] 1. Extend store layer with stepNotes support
  - [x] 1.1 Add `stepNotes` state and `setStepNote` mutation to `WayfindProvider`
    - Add `stepNotes: Record<string, string>` state initialized to `{}`
    - Add `setStepNote(opportunityId: string, note: string | null) => void` callback that sets or removes notes (null/empty removes the key)
    - Expose `stepNotes` and `setStepNote` in the context value and `State` type
    - _Requirements: 1.5, 1.6, 1.9, 2.7_

  - [x] 1.2 Add `stepNotes` to localStorage persistence and hydration
    - Include `stepNotes` in the JSON blob written to localStorage
    - On hydration, read `stepNotes` from parsed object, defaulting to `{}` if absent
    - Ensure localStorage write failure keeps notes in memory for the session
    - _Requirements: 2.7, 2.8_

- [x] 1.3 Write property tests for stepNotes store logic
    - **Property 1: Note persistence round-trip for Sylo Steps**
    - **Property 2: Original reasoning immutability**
    - **Property 3: Note removal on empty submission**
    - **Validates: Requirements 1.5, 1.6, 1.9**

- [x] 2. Implement academic term utilities
  - [x] 2.1 Add `AcademicTerm` type, `SEASONS` constant, and `academicTermOptions` function to `src/lib/terms.ts`
    - Export `AcademicTerm` type with `value` and `label` fields
    - Export `SEASONS = ["Fall", "Spring", "Summer"] as const`
    - Implement `academicTermOptions(currentYear, years)` returning `3 × years.length` options ordered chronologically starting from the student's current year
    - _Requirements: 3.3, 3.4_

  - [x] 2.2 Add `isIsoDate` and `formatTargetDate` utility functions to `src/lib/terms.ts`
    - `isIsoDate(value: string): boolean` — returns true for `YYYY-MM-DD` pattern
    - `formatTargetDate(value: string): string` — returns locale date for ISO dates, term label with "Year" appended for academic terms, raw string as fallback
    - _Requirements: 3.6, 3.8_

  - [x] 2.3 Write property tests for academic term utilities
    - **Property 7: Academic term options completeness**
    - **Property 9: Backward-compatible date display**
    - **Validates: Requirements 3.3, 3.4, 3.6, 3.8**

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Create UI components
  - [x] 4.1 Create `InlineNoteEditor` component at `src/components/inline-note-editor.tsx`
    - Accept props: `opportunityId`, `existingNote`, `reasoning`, `onClose`
    - Render a `<textarea>` pre-populated with `existingNote` (or empty)
    - Display `reasoning` below in dimmed `text-muted-foreground` style
    - On blur or Enter (without Shift), call `setStepNote` from the store — empty/whitespace-only triggers removal (pass `null`)
    - Call `onClose()` after save
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.8, 1.9_

  - [x] 4.2 Create `NoteIndicator` component at `src/components/note-indicator.tsx`
    - Accept prop: `note: string`
    - Render a `StickyNote` icon from lucide-react
    - Wrap in existing `Popover`/`PopoverContent` from `@/components/ui/popover`
    - Clicking opens the popover displaying the full note text
    - Keeps card compact — no inline text by default
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 4.3 Create `AcademicTermSelector` component at `src/components/academic-term-selector.tsx`
    - Accept props: `value`, `currentYear`, `onChange`
    - Use existing Radix `Select` component from `@/components/ui/select`
    - Call `academicTermOptions(currentYear, YEARS)` to build options
    - Display options as `"{Season} {Year} Year"` (e.g., "Fall Junior Year")
    - Store selected value as `"{Season} {Year}"` (e.g., "Fall Junior")
    - Include a "No term" / clear option
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Integrate into dashboard — Sylo_Step cards
  - [x] 5.1 Add inline note editing to Sylo_Step cards in `src/routes/dashboard.tsx`
    - Add `editingStepId` state to track which Sylo_Step is in Inline_Edit_Mode
    - Add a `Pencil` icon button to each Sylo_Step `<li>`
    - When `editingStepId === step.id`, render `<InlineNoteEditor>` instead of static reasoning text
    - When a step has a note in `stepNotes[step.opportunityId]`, display the User_Note in normal weight and Original_Reasoning in `text-muted-foreground/60` below
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7_

  - [x] 5.2 Add `NoteIndicator` to Sylo_Step cards when a note exists
    - Render `<NoteIndicator note={...} />` on Sylo_Step cards where `stepNotes[step.opportunityId]` is non-empty
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 6. Integrate into dashboard — Custom_Step cards
  - [x] 6.1 Replace date picker with `AcademicTermSelector` in Custom_Step creation form
    - Replace `<input type="date">` in the "Add your own step" form with `<AcademicTermSelector>`
    - Pass `profile.year` as `currentYear`
    - Store selected term as `targetDate` value
    - _Requirements: 3.1, 3.5_

  - [x] 6.2 Replace date picker with `AcademicTermSelector` in Custom_Step editing form
    - Replace `<input type="date">` in the editing inline form with `<AcademicTermSelector>`
    - Pre-select existing `targetDate` value if it's a term string
    - _Requirements: 3.2, 3.5_

  - [x] 6.3 Update Custom_Step card display to use `formatTargetDate`
    - Replace raw `s.targetDate` rendering with `formatTargetDate(s.targetDate)` — handles both ISO dates and academic term strings
    - _Requirements: 3.6, 3.8_

  - [x] 6.4 Add `NoteIndicator` to Custom_Step cards when a note exists
    - Render `<NoteIndicator note={s.note} />` on Custom_Step cards where `s.note` is non-empty
    - Keep full note text hidden by default (popover only), replacing inline display
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

- [x] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Write integration tests for the full feature
  - [x] 8.1 Write property tests for note display behavior
    - **Property 4: Note pre-population in edit mode**
    - **Property 5: Note display for both step types**
    - **Property 6: Sylo_Step card displays note alongside reasoning**
    - **Validates: Requirements 1.7, 1.8, 2.2, 2.3, 2.5**

  - [x] 8.2 Write property tests for academic term persistence
    - **Property 8: Academic term persistence round-trip**
    - **Property 10: Custom_Step note field mapping**
    - **Validates: Requirements 3.5, 2.6**

- [x] 9. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `stepNotes` map is separate from `roadmap.steps` to preserve AI-generated reasoning immutability
- Backward compatibility is maintained: existing ISO date `targetDate` values still render correctly

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2"] },
    { "id": 2, "tasks": ["1.3", "2.3", "4.1", "4.2", "4.3"] },
    { "id": 3, "tasks": ["5.1", "5.2", "6.1", "6.2", "6.3", "6.4"] },
    { "id": 4, "tasks": ["8.1", "8.2"] }
  ]
}
```
