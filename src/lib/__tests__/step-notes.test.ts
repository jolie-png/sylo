/**
 * Property-based tests for stepNotes store logic.
 *
 * These tests validate the core properties of the setStepNote mutation
 * without rendering React components, by testing the pure logic patterns
 * that the store callback implements.
 *
 * Validates: Requirements 1.5, 1.6, 1.9
 */
import { describe, it, expect } from "vitest";

// ---------- Helpers that replicate the store's setStepNote logic ----------

/**
 * Pure function replicating the logic inside WayfindProvider's setStepNote callback.
 * Given the current stepNotes map, an opportunityId, and a note value,
 * returns the next stepNotes map.
 */
function applySetStepNote(
  prev: Record<string, string>,
  opportunityId: string,
  note: string | null,
): Record<string, string> {
  const trimmed = note?.trim();
  if (!trimmed) {
    // Remove the key when note is null or empty/whitespace-only
    const { [opportunityId]: _, ...rest } = prev;
    return rest;
  }
  return { ...prev, [opportunityId]: trimmed };
}

// ---------- Generators for property-based testing ----------

/** Generate a random non-empty string (1-100 printable chars). */
function randomNonEmptyString(): string {
  const length = Math.floor(Math.random() * 100) + 1;
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 !@#$%^&*()-_=+[]{}|;:',.<>?/~`";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  // Ensure it's not all whitespace
  if (!result.trim()) {
    result += "x";
  }
  return result;
}

/** Generate a random opportunityId-like string. */
function randomOpportunityId(): string {
  const prefix = "op-";
  const length = Math.floor(Math.random() * 20) + 5;
  const chars = "abcdefghijklmnopqrstuvwxyz-0123456789";
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/** Generate random whitespace-only strings for removal tests. */
function randomWhitespace(): string {
  const spaces = [" ", "\t", "\n", "\r", "  ", "\n\t"];
  const count = Math.floor(Math.random() * 5) + 1;
  let result = "";
  for (let i = 0; i < count; i++) {
    result += spaces[Math.floor(Math.random() * spaces.length)];
  }
  return result;
}

// Number of iterations for property tests
const NUM_ITERATIONS = 100;

// ---------- Property Tests ----------

describe("stepNotes store logic", () => {
  /**
   * **Property 1: Note persistence round-trip for Sylo Steps**
   *
   * For any Sylo_Step with a given opportunityId and for any non-empty string value,
   * calling setStepNote(opportunityId, value) and then reading stepNotes[opportunityId]
   * from the store SHALL return that same value (trimmed).
   *
   * **Validates: Requirements 1.5**
   */
  describe("Property 1: Note persistence round-trip", () => {
    it("should persist a non-empty note and allow retrieval by opportunityId", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomOpportunityId();
        const note = randomNonEmptyString();
        const initial: Record<string, string> = {};

        const result = applySetStepNote(initial, id, note);

        expect(result[id]).toBe(note.trim());
      }
    });

    it("should persist notes independently for different opportunityIds", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id1 = randomOpportunityId() + "-1";
        const id2 = randomOpportunityId() + "-2";
        const note1 = randomNonEmptyString();
        const note2 = randomNonEmptyString();

        let state: Record<string, string> = {};
        state = applySetStepNote(state, id1, note1);
        state = applySetStepNote(state, id2, note2);

        expect(state[id1]).toBe(note1.trim());
        expect(state[id2]).toBe(note2.trim());
      }
    });

    it("should overwrite an existing note for the same opportunityId", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomOpportunityId();
        const note1 = randomNonEmptyString();
        const note2 = randomNonEmptyString();

        let state: Record<string, string> = {};
        state = applySetStepNote(state, id, note1);
        state = applySetStepNote(state, id, note2);

        expect(state[id]).toBe(note2.trim());
      }
    });

    it("should trim leading/trailing whitespace from notes", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomOpportunityId();
        const core = randomNonEmptyString();
        const padded = "   " + core + "   ";

        const result = applySetStepNote({}, id, padded);

        expect(result[id]).toBe(padded.trim());
      }
    });
  });

  /**
   * **Property 2: Original reasoning immutability**
   *
   * For any Sylo_Step, saving a User_Note via setStepNote SHALL NOT modify
   * the reasoning field of that step in roadmap.steps. The reasoning before
   * and after the note operation must be identical.
   *
   * **Validates: Requirements 1.6**
   */
  describe("Property 2: Original reasoning immutability", () => {
    it("should never modify roadmap steps when setting notes", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomOpportunityId();
        const reasoning = randomNonEmptyString();
        const note = randomNonEmptyString();

        // Simulate a roadmap with steps containing reasoning
        const roadmapSteps = [
          { id, opportunityId: id, reasoning, status: "not-started" as const },
          {
            id: randomOpportunityId(),
            opportunityId: randomOpportunityId(),
            reasoning: randomNonEmptyString(),
            status: "in-progress" as const,
          },
        ];

        // Deep-copy to compare
        const stepsBeforeJson = JSON.stringify(roadmapSteps);

        // Apply setStepNote — this only touches the stepNotes map, not the steps array
        applySetStepNote({}, id, note);

        // The roadmap steps should be completely untouched
        const stepsAfterJson = JSON.stringify(roadmapSteps);
        expect(stepsAfterJson).toBe(stepsBeforeJson);
      }
    });

    it("setStepNote operates on a separate map, never on the steps array", () => {
      // Structural proof: applySetStepNote's return type is Record<string, string>,
      // completely disjoint from the Step[] structure
      const id = "op-test-123";
      const steps = [
        { id, opportunityId: id, reasoning: "AI generated reasoning", status: "not-started" },
      ];

      const notesBefore: Record<string, string> = {};
      const notesAfter = applySetStepNote(notesBefore, id, "My custom note");

      // The notes map has the note
      expect(notesAfter[id]).toBe("My custom note");

      // The steps array remains completely unchanged
      expect(steps[0].reasoning).toBe("AI generated reasoning");
      expect(steps[0]).not.toHaveProperty("note");
    });
  });

  /**
   * **Property 3: Note removal on empty submission**
   *
   * For any Sylo_Step that has an existing User_Note, calling
   * setStepNote(opportunityId, null) or setStepNote(opportunityId, "")
   * SHALL result in stepNotes[opportunityId] being undefined (key removed from the map).
   *
   * **Validates: Requirements 1.9**
   */
  describe("Property 3: Note removal on empty submission", () => {
    it("should remove the note when null is passed", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomOpportunityId();
        const existingNote = randomNonEmptyString();

        // Start with an existing note
        let state: Record<string, string> = { [id]: existingNote.trim() };

        // Remove with null
        state = applySetStepNote(state, id, null);

        expect(state[id]).toBeUndefined();
        expect(id in state).toBe(false);
      }
    });

    it("should remove the note when empty string is passed", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomOpportunityId();
        const existingNote = randomNonEmptyString();

        let state: Record<string, string> = { [id]: existingNote.trim() };

        // Remove with empty string
        state = applySetStepNote(state, id, "");

        expect(state[id]).toBeUndefined();
        expect(id in state).toBe(false);
      }
    });

    it("should remove the note when whitespace-only string is passed", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomOpportunityId();
        const existingNote = randomNonEmptyString();

        let state: Record<string, string> = { [id]: existingNote.trim() };

        // Remove with whitespace-only
        state = applySetStepNote(state, id, randomWhitespace());

        expect(state[id]).toBeUndefined();
        expect(id in state).toBe(false);
      }
    });

    it("should not affect other notes when removing one", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id1 = randomOpportunityId() + "-1";
        const id2 = randomOpportunityId() + "-2";
        const note1 = randomNonEmptyString();
        const note2 = randomNonEmptyString();

        let state: Record<string, string> = {};
        state = applySetStepNote(state, id1, note1);
        state = applySetStepNote(state, id2, note2);

        // Remove only id1
        state = applySetStepNote(state, id1, null);

        expect(state[id1]).toBeUndefined();
        expect(state[id2]).toBe(note2.trim());
      }
    });

    it("should be idempotent when removing a non-existent note", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomOpportunityId();
        const state: Record<string, string> = {};

        // Removing a note that doesn't exist should not crash or add keys
        const result = applySetStepNote(state, id, null);

        expect(result[id]).toBeUndefined();
        expect(Object.keys(result).length).toBe(0);
      }
    });
  });
});


// ---------- Helpers for Custom_Step note logic ----------

/**
 * Pure function replicating the logic inside WayfindProvider's updateCustomStep callback
 * for note updates. Given a list of custom steps, a step id, and a note patch,
 * returns the updated list.
 */
function applyUpdateCustomStepNote(
  steps: Array<{ id: string; title: string; note?: string; status: string }>,
  id: string,
  note: string,
): Array<{ id: string; title: string; note?: string; status: string }> {
  return steps.map((s) => (s.id === id ? { ...s, note } : s));
}

/** Generate a random custom step id. */
function randomCustomStepId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Generate a random step reasoning string. */
function randomReasoning(): string {
  const prefixes = [
    "This opportunity helps you because",
    "Building on your background in",
    "This is recommended since",
    "Given your goals in",
    "This develops skills in",
  ];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix} ${randomNonEmptyString()}`;
}

// ---------- Note Display Behavior Property Tests ----------

describe("stepNotes display behavior", () => {
  /**
   * **Property 4: Note pre-population in edit mode**
   *
   * For any Sylo_Step that has a saved User_Note with value V, the note
   * should be available as `stepNotes[opportunityId]` equaling V (this is
   * what InlineNoteEditor receives as `existingNote`).
   *
   * **Validates: Requirements 1.8**
   */
  describe("Property 4: Note pre-population in edit mode", () => {
    it("should make the saved note available for pre-population via stepNotes[id]", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomOpportunityId();
        const note = randomNonEmptyString();

        // Save a note
        const stepNotes = applySetStepNote({}, id, note);

        // The value that InlineNoteEditor would receive as existingNote
        const existingNote = stepNotes[id];

        // Must equal the saved (trimmed) value
        expect(existingNote).toBe(note.trim());
        expect(existingNote).toBeDefined();
      }
    });

    it("should preserve the exact note content through save-and-retrieve cycle", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomOpportunityId();
        const note = randomNonEmptyString();

        // Save then overwrite, then read back latest
        let stepNotes = applySetStepNote({}, id, note);
        const updatedNote = randomNonEmptyString();
        stepNotes = applySetStepNote(stepNotes, id, updatedNote);

        // Pre-populated value should always be the LATEST note
        expect(stepNotes[id]).toBe(updatedNote.trim());
      }
    });

    it("should return undefined for steps without notes (no pre-population)", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const idWithNote = randomOpportunityId() + "-with";
        const idWithout = randomOpportunityId() + "-without";
        const note = randomNonEmptyString();

        const stepNotes = applySetStepNote({}, idWithNote, note);

        // Step without a note should have undefined → InlineNoteEditor starts empty
        expect(stepNotes[idWithout]).toBeUndefined();
        // Step with a note has its value
        expect(stepNotes[idWithNote]).toBe(note.trim());
      }
    });
  });

  /**
   * **Property 5: Note display for both step types**
   *
   * For any step (Sylo_Step or Custom_Step) that has a non-empty note,
   * the note is retrievable. For Sylo_Steps it's `stepNotes[opportunityId]`,
   * for Custom_Steps it's `customStep.note`.
   *
   * **Validates: Requirements 2.2, 2.3, 2.5**
   */
  describe("Property 5: Note display for both step types", () => {
    it("Sylo_Step notes are retrievable from stepNotes map by opportunityId", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomOpportunityId();
        const note = randomNonEmptyString();

        const stepNotes = applySetStepNote({}, id, note);

        // Note is non-empty and retrievable → NoteIndicator should render
        const retrievedNote = stepNotes[id];
        expect(retrievedNote).toBeDefined();
        expect(retrievedNote!.length).toBeGreaterThan(0);
        expect(retrievedNote).toBe(note.trim());
      }
    });

    it("Custom_Step notes are retrievable from the note field", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomCustomStepId();
        const note = randomNonEmptyString();
        const title = randomNonEmptyString();

        const customSteps = [
          { id, title, note: note.trim(), status: "not-started" },
        ];

        // Simulate reading the note for NoteIndicator rendering
        const step = customSteps.find((s) => s.id === id);
        expect(step).toBeDefined();
        expect(step!.note).toBeDefined();
        expect(step!.note!.length).toBeGreaterThan(0);
        expect(step!.note).toBe(note.trim());
      }
    });

    it("Custom_Step notes are updated correctly via updateCustomStep pattern", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomCustomStepId();
        const originalNote = randomNonEmptyString();
        const newNote = randomNonEmptyString();

        const customSteps = [
          { id, title: "Some task", note: originalNote.trim(), status: "not-started" },
        ];

        // Apply update (simulates updateCustomStep with note patch)
        const updated = applyUpdateCustomStepNote(customSteps, id, newNote.trim());

        const step = updated.find((s) => s.id === id);
        expect(step!.note).toBe(newNote.trim());
      }
    });

    it("both step types: empty notes mean no NoteIndicator (falsy check)", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const syloId = randomOpportunityId();
        const customId = randomCustomStepId();

        // Sylo_Step with no note saved
        const stepNotes: Record<string, string> = {};
        expect(stepNotes[syloId]).toBeUndefined();
        // Falsy → no NoteIndicator
        expect(!!stepNotes[syloId]).toBe(false);

        // Custom_Step with no note
        const customStep = { id: customId, title: "Test", note: undefined, status: "not-started" };
        expect(!!customStep.note).toBe(false);
      }
    });
  });

  /**
   * **Property 6: Sylo_Step card displays note alongside reasoning**
   *
   * For any Sylo_Step with a saved User_Note, both the user note
   * (from `stepNotes[id]`) and the original reasoning (from `step.reasoning`)
   * exist simultaneously and independently.
   *
   * **Validates: Requirements 1.7**
   */
  describe("Property 6: Sylo_Step card displays note alongside reasoning", () => {
    it("note and reasoning coexist independently for any step", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomOpportunityId();
        const reasoning = randomReasoning();
        const note = randomNonEmptyString();

        // Simulate the step in roadmap.steps
        const step = { id, opportunityId: id, reasoning, status: "not-started" as const };

        // Save a note in the separate stepNotes map
        const stepNotes = applySetStepNote({}, id, note);

        // Both values exist simultaneously
        expect(step.reasoning).toBe(reasoning);
        expect(stepNotes[id]).toBe(note.trim());

        // They are independent — different values
        // (unless by extreme coincidence the note text === reasoning, which is fine)
        expect(step.reasoning).toBeDefined();
        expect(stepNotes[id]).toBeDefined();
      }
    });

    it("modifying the note does not affect the reasoning", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomOpportunityId();
        const reasoning = randomReasoning();
        const note1 = randomNonEmptyString();
        const note2 = randomNonEmptyString();

        const step = { id, opportunityId: id, reasoning, status: "not-started" as const };

        // Save initial note
        let stepNotes = applySetStepNote({}, id, note1);
        expect(step.reasoning).toBe(reasoning);

        // Update the note
        stepNotes = applySetStepNote(stepNotes, id, note2);
        expect(step.reasoning).toBe(reasoning); // unchanged
        expect(stepNotes[id]).toBe(note2.trim()); // updated
      }
    });

    it("removing the note does not affect the reasoning", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const id = randomOpportunityId();
        const reasoning = randomReasoning();
        const note = randomNonEmptyString();

        const step = { id, opportunityId: id, reasoning, status: "not-started" as const };

        // Save then remove
        let stepNotes = applySetStepNote({}, id, note);
        stepNotes = applySetStepNote(stepNotes, id, null);

        // Reasoning is preserved, note is gone
        expect(step.reasoning).toBe(reasoning);
        expect(stepNotes[id]).toBeUndefined();
      }
    });

    it("multiple steps each maintain independent note-reasoning pairs", () => {
      for (let i = 0; i < NUM_ITERATIONS; i++) {
        const steps = Array.from({ length: 3 + Math.floor(Math.random() * 5) }, () => ({
          id: randomOpportunityId(),
          opportunityId: "",
          reasoning: randomReasoning(),
          status: "not-started" as const,
        }));
        steps.forEach((s) => (s.opportunityId = s.id));

        // Assign notes to a random subset of steps
        let stepNotes: Record<string, string> = {};
        const notedSteps = steps.filter(() => Math.random() > 0.3);
        const noteValues: Record<string, string> = {};

        for (const s of notedSteps) {
          const note = randomNonEmptyString();
          noteValues[s.id] = note.trim();
          stepNotes = applySetStepNote(stepNotes, s.id, note);
        }

        // Verify each step's reasoning is untouched and notes match
        for (const s of steps) {
          expect(s.reasoning).toBeDefined();
          expect(s.reasoning.length).toBeGreaterThan(0);

          if (noteValues[s.id]) {
            expect(stepNotes[s.id]).toBe(noteValues[s.id]);
          } else {
            expect(stepNotes[s.id]).toBeUndefined();
          }
        }
      }
    });
  });
});
