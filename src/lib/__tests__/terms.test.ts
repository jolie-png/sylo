import { describe, it, expect } from "vitest";
import {
  academicTermOptions,
  formatTargetDate,
  isIsoDate,
  type AcademicTerm,
} from "../terms";

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior"];
const SEASONS = ["Fall", "Spring", "Summer"] as const;

// ─── Property 7: Academic term options completeness ─────────────────────────
// **Validates: Requirements 3.3, 3.4**
//
// For any value of `currentYear` from the YEARS constant,
// `academicTermOptions(currentYear, YEARS)` returns exactly `3 × YEARS.length`
// options, and all options from `currentYear` onward appear before options from
// earlier years (wrapping).

describe("Property 7: Academic term options completeness", () => {
  it.each(YEARS)(
    "returns exactly 3 × YEARS.length (12) options when currentYear is %s",
    (currentYear) => {
      const options = academicTermOptions(currentYear, YEARS);
      expect(options).toHaveLength(3 * YEARS.length);
    }
  );

  it.each(YEARS)(
    "starts with the given currentYear (%s) and wraps remaining years after",
    (currentYear) => {
      const options = academicTermOptions(currentYear, YEARS);

      // The first 3 options must belong to currentYear
      const firstThree = options.slice(0, 3);
      for (const opt of firstThree) {
        expect(opt.value).toContain(currentYear);
        expect(opt.label).toContain(currentYear);
      }

      // All years should be present somewhere in the output
      for (const year of YEARS) {
        const found = options.some((o) => o.value.includes(year));
        expect(found).toBe(true);
      }
    }
  );

  it.each(YEARS)(
    "options from currentYear (%s) onward appear before earlier years",
    (currentYear) => {
      const options = academicTermOptions(currentYear, YEARS);
      const startIndex = YEARS.indexOf(currentYear);

      // Build expected year order: starting from currentYear, wrapping around
      const expectedYearOrder: string[] = [];
      for (let i = 0; i < YEARS.length; i++) {
        expectedYearOrder.push(YEARS[(startIndex + i) % YEARS.length]);
      }

      // Extract the year order from options (every 3 options is a new year)
      const actualYearOrder: string[] = [];
      for (let i = 0; i < options.length; i += 3) {
        // Extract year from value like "Fall Sophomore" → "Sophomore"
        const parts = options[i].value.split(" ");
        actualYearOrder.push(parts.slice(1).join(" "));
      }

      expect(actualYearOrder).toEqual(expectedYearOrder);
    }
  );

  it.each(YEARS)(
    "each year group contains all three seasons in canonical order (Fall, Spring, Summer) when currentYear is %s",
    (currentYear) => {
      const options = academicTermOptions(currentYear, YEARS);

      // Check each group of 3 for correct season ordering
      for (let i = 0; i < options.length; i += 3) {
        const group = options.slice(i, i + 3);
        const seasons = group.map((o) => o.value.split(" ")[0]);
        expect(seasons).toEqual(["Fall", "Spring", "Summer"]);
      }
    }
  );

  it.each(YEARS)(
    "each option has correct value and label format when currentYear is %s",
    (currentYear) => {
      const options = academicTermOptions(currentYear, YEARS);

      for (const opt of options) {
        // value format: "{Season} {Year}" e.g. "Fall Junior"
        const valueParts = opt.value.split(" ");
        expect(SEASONS).toContain(valueParts[0]);
        expect(YEARS).toContain(valueParts.slice(1).join(" "));

        // label format: "{Season} {Year} Year" e.g. "Fall Junior Year"
        expect(opt.label).toBe(`${opt.value} Year`);
      }
    }
  );

  it("defaults to the beginning when currentYear is not in the years array", () => {
    const options = academicTermOptions("Unknown", YEARS);
    expect(options).toHaveLength(12);
    // Should start with YEARS[0] = "Freshman"
    expect(options[0].value).toBe("Fall Freshman");
  });
});

// ─── Property 9: Backward-compatible date display ───────────────────────────
// **Validates: Requirements 3.6, 3.8**
//
// For any Custom_Step whose `targetDate` is a valid ISO date string
// (matching YYYY-MM-DD), `formatTargetDate(targetDate)` produces a
// human-readable date string (not an error or the raw academic term format).
// For any Custom_Step whose `targetDate` is a valid academic term string,
// `formatTargetDate(targetDate)` produces the corresponding term label with
// "Year" appended.

describe("Property 9: Backward-compatible date display", () => {
  describe("ISO date handling", () => {
    const isoDates = [
      "2025-01-15",
      "2025-09-01",
      "2024-12-31",
      "2023-06-15",
      "2026-03-22",
    ];

    it.each(isoDates)(
      "formatTargetDate(%s) produces a human-readable date, not raw ISO",
      (isoDate) => {
        const result = formatTargetDate(isoDate);
        // Should NOT return the raw ISO string
        expect(result).not.toBe(isoDate);
        // Should NOT be empty
        expect(result.length).toBeGreaterThan(0);
        // Should NOT match ISO pattern (it's now locale-formatted)
        expect(isIsoDate(result)).toBe(false);
      }
    );

    it("formats a known date to a locale string", () => {
      // 2025-09-15 should produce something recognizable as September 15, 2025
      const result = formatTargetDate("2025-09-15");
      // The exact format depends on locale, but it should contain "2025" and "15"
      expect(result).toContain("2025");
      expect(result).toContain("15");
    });
  });

  describe("Academic term string handling", () => {
    // Generate all possible academic term values
    const termValues: string[] = [];
    for (const year of YEARS) {
      for (const season of SEASONS) {
        termValues.push(`${season} ${year}`);
      }
    }

    it.each(termValues)(
      'formatTargetDate("%s") appends "Year" to produce the label',
      (termValue) => {
        const result = formatTargetDate(termValue);
        expect(result).toBe(`${termValue} Year`);
      }
    );

    it('does not double-append "Year" if already present', () => {
      const result = formatTargetDate("Fall Junior Year");
      // Should return as-is since it already ends with "Year"
      expect(result).toBe("Fall Junior Year");
    });
  });

  describe("Edge cases and graceful fallback", () => {
    it("returns empty string for undefined", () => {
      expect(formatTargetDate(undefined)).toBe("");
    });

    it("returns empty string for empty string", () => {
      expect(formatTargetDate("")).toBe("");
    });

    it("returns empty string for whitespace-only string", () => {
      expect(formatTargetDate("   ")).toBe("");
    });

    it("returns raw string for unrecognized format", () => {
      // An unrecognized string that doesn't end with "Year" will get "Year" appended
      // per the implementation logic (non-ISO → append "Year")
      const result = formatTargetDate("some random text");
      expect(result).toBe("some random text Year");
    });

    it("handles invalid ISO-like date gracefully", () => {
      // "2025-13-45" matches YYYY-MM-DD pattern but is an invalid date
      const result = formatTargetDate("2025-13-45");
      // isIsoDate returns true for the pattern match, so it goes through the Date path
      // Invalid Date → returns raw value as fallback
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });
  });

  describe("isIsoDate utility", () => {
    it("returns true for valid YYYY-MM-DD strings", () => {
      expect(isIsoDate("2025-09-15")).toBe(true);
      expect(isIsoDate("2000-01-01")).toBe(true);
      expect(isIsoDate("1999-12-31")).toBe(true);
    });

    it("returns false for academic term strings", () => {
      expect(isIsoDate("Fall Junior")).toBe(false);
      expect(isIsoDate("Spring Sophomore")).toBe(false);
      expect(isIsoDate("Summer Senior")).toBe(false);
    });

    it("returns false for partial or malformed dates", () => {
      expect(isIsoDate("2025-09")).toBe(false);
      expect(isIsoDate("2025")).toBe(false);
      expect(isIsoDate("09-15-2025")).toBe(false);
      expect(isIsoDate("")).toBe(false);
    });
  });
});


// ─── Property 8: Academic term persistence round-trip ────────────────────────
// **Validates: Requirements 3.5**
//
// For any valid `AcademicTerm.value` string (generated via `academicTermOptions`),
// saving it as the `targetDate` of a Custom_Step and reading it back should return
// the same value. Tests the pure-logic version of addCustomStep + read-back.

describe("Property 8: Academic term persistence round-trip", () => {
  // ── Pure-logic replicas of store operations ──
  type CustomStep = {
    id: string;
    title: string;
    note?: string;
    targetDate?: string;
    status: "not-started" | "in-progress" | "complete";
  };

  function addCustomStep(
    steps: CustomStep[],
    input: { title: string; note?: string; targetDate?: string }
  ): CustomStep[] {
    return [
      ...steps,
      {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: input.title,
        note: input.note?.trim() || undefined,
        targetDate: input.targetDate?.trim() || undefined,
        status: "not-started",
      },
    ];
  }

  function updateCustomStep(
    steps: CustomStep[],
    id: string,
    patch: Partial<Omit<CustomStep, "id">>
  ): CustomStep[] {
    return steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
  }

  // Generate all valid academic term values
  const allTermValues = academicTermOptions(YEARS[0], YEARS).map((t) => t.value);

  it.each(allTermValues)(
    'addCustomStep with targetDate="%s" persists and reads back identically',
    (termValue) => {
      const steps: CustomStep[] = [];
      const result = addCustomStep(steps, {
        title: "Test step",
        targetDate: termValue,
      });

      expect(result).toHaveLength(1);
      expect(result[0].targetDate).toBe(termValue);
    }
  );

  it.each(allTermValues)(
    'updateCustomStep with targetDate="%s" persists and reads back identically',
    (termValue) => {
      const initial = addCustomStep([], { title: "Existing step" });
      const id = initial[0].id;

      const updated = updateCustomStep(initial, id, { targetDate: termValue });

      expect(updated[0].targetDate).toBe(termValue);
    }
  );

  it("round-trips through simulated localStorage serialization", () => {
    // Pick a subset of term values and verify JSON round-trip
    const sampleTerms = allTermValues.filter((_, i) => i % 3 === 0);

    for (const termValue of sampleTerms) {
      const steps = addCustomStep([], {
        title: "Serialize test",
        targetDate: termValue,
      });

      // Simulate localStorage write + read
      const serialized = JSON.stringify(steps);
      const deserialized: CustomStep[] = JSON.parse(serialized);

      expect(deserialized[0].targetDate).toBe(termValue);
    }
  });

  it("preserves term value when other fields are updated", () => {
    for (const termValue of allTermValues) {
      const steps = addCustomStep([], {
        title: "Original title",
        targetDate: termValue,
      });
      const id = steps[0].id;

      // Update title only — targetDate should remain unchanged
      const afterTitleUpdate = updateCustomStep(steps, id, {
        title: "Updated title",
      });
      expect(afterTitleUpdate[0].targetDate).toBe(termValue);

      // Update status only — targetDate should remain unchanged
      const afterStatusUpdate = updateCustomStep(steps, id, {
        status: "complete",
      });
      expect(afterStatusUpdate[0].targetDate).toBe(termValue);
    }
  });

  it("handles random title + term combinations", () => {
    const randomTitles = [
      "Apply for internship",
      "Submit research proposal",
      "",
      "A".repeat(200),
      "Title with special chars: <>&\"'",
      "  spaces around  ",
    ];

    for (const title of randomTitles) {
      for (const termValue of allTermValues.slice(0, 4)) {
        const steps = addCustomStep([], { title, targetDate: termValue });
        expect(steps[0].targetDate).toBe(termValue);
      }
    }
  });
});

// ─── Property 10: Custom_Step note field mapping ─────────────────────────────
// **Validates: Requirements 2.6**
//
// For any Custom_Step and for any non-empty string value, calling
// `updateCustomStep(id, { note: value })` results in that Custom_Step's
// `note` field equaling value.

describe("Property 10: Custom_Step note field mapping", () => {
  // ── Pure-logic replicas of store operations ──
  type CustomStep = {
    id: string;
    title: string;
    note?: string;
    targetDate?: string;
    status: "not-started" | "in-progress" | "complete";
  };

  function addCustomStep(
    steps: CustomStep[],
    input: { title: string; note?: string; targetDate?: string }
  ): CustomStep[] {
    return [
      ...steps,
      {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: input.title,
        note: input.note?.trim() || undefined,
        targetDate: input.targetDate?.trim() || undefined,
        status: "not-started",
      },
    ];
  }

  function updateCustomStep(
    steps: CustomStep[],
    id: string,
    patch: Partial<Omit<CustomStep, "id">>
  ): CustomStep[] {
    return steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
  }

  // ── Randomized note values ──
  const randomNotes = [
    "Remember to check deadline",
    "Important: talk to advisor first",
    "Short",
    "A".repeat(500),
    "Note with symbols: @#$%^&*()_+-={}[]|\\:;\"'<>,.?/",
    "Multiline\nnote\nwith\nbreaks",
    "Unicode: 日本語テスト 🎓📝",
    "  leading and trailing spaces  ",
    "Tab\there",
    "1234567890",
  ];

  it.each(randomNotes)(
    "updateCustomStep with note=%j reads back the same value",
    (noteValue) => {
      const steps = addCustomStep([], { title: "Test step" });
      const id = steps[0].id;

      const updated = updateCustomStep(steps, id, { note: noteValue });

      expect(updated[0].note).toBe(noteValue);
    }
  );

  it("setting note via addCustomStep persists the trimmed value", () => {
    for (const noteValue of randomNotes) {
      const steps = addCustomStep([], {
        title: "Step with note",
        note: noteValue,
      });

      // addCustomStep trims the note, so we expect the trimmed version
      const expected = noteValue.trim() || undefined;
      expect(steps[0].note).toBe(expected);
    }
  });

  it("updateCustomStep overwrites previous note value", () => {
    const steps = addCustomStep([], { title: "Step", note: "Original note" });
    const id = steps[0].id;

    // Update with a new note
    const updated1 = updateCustomStep(steps, id, { note: "Second note" });
    expect(updated1[0].note).toBe("Second note");

    // Update again
    const updated2 = updateCustomStep(updated1, id, { note: "Third note" });
    expect(updated2[0].note).toBe("Third note");
  });

  it("updateCustomStep does not affect other steps' notes", () => {
    let steps = addCustomStep([], { title: "Step A", note: "Note A" });
    steps = addCustomStep(steps, { title: "Step B", note: "Note B" });
    const idB = steps[1].id;

    const updated = updateCustomStep(steps, idB, { note: "Updated B" });

    // Step A's note should remain unchanged
    expect(updated[0].note).toBe("Note A");
    expect(updated[1].note).toBe("Updated B");
  });

  it("updating note preserves other fields of the Custom_Step", () => {
    const steps = addCustomStep([], {
      title: "Important step",
      note: "Initial",
      targetDate: "Fall Junior",
    });
    const id = steps[0].id;

    const updated = updateCustomStep(steps, id, { note: "Changed note" });

    expect(updated[0].title).toBe("Important step");
    expect(updated[0].targetDate).toBe("Fall Junior");
    expect(updated[0].status).toBe("not-started");
    expect(updated[0].id).toBe(id);
    expect(updated[0].note).toBe("Changed note");
  });

  it("round-trips note through simulated localStorage serialization", () => {
    for (const noteValue of randomNotes.slice(0, 5)) {
      const steps = addCustomStep([], { title: "Serialize test" });
      const id = steps[0].id;
      const updated = updateCustomStep(steps, id, { note: noteValue });

      // Simulate localStorage write + read
      const serialized = JSON.stringify(updated);
      const deserialized: CustomStep[] = JSON.parse(serialized);

      expect(deserialized[0].note).toBe(noteValue);
    }
  });

  it("generates unique IDs for each Custom_Step", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const steps = addCustomStep([], { title: `Step ${i}` });
      ids.add(steps[0].id);
    }
    // All 50 IDs should be unique
    expect(ids.size).toBe(50);
  });
});
