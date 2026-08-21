import type { Profile } from "@/lib/wayfind-store";

const YEAR_ORDER = ["freshman", "sophomore", "junior", "senior", "graduate"];

/**
 * Simple heuristic eligibility check — no AI call needed.
 * Compares a requirement string against the student's profile.
 */
export function checkRequirement(
  requirement: string,
  profile: Profile | null,
): "yes" | "no" | "unknown" {
  if (!profile) return "unknown";

  const req = requirement.toLowerCase();
  const year = profile.year?.toLowerCase() ?? "";
  const major = profile.major?.toLowerCase() ?? "";
  const gpa = profile.gpa ? parseFloat(profile.gpa) : null;
  const allText = [
    profile.experience,
    profile.priorWork,
    profile.clubs,
    profile.skills,
    profile.alreadyDone,
  ].filter(Boolean).join(" ").toLowerCase();

  // GPA checks
  const gpaMatch = req.match(/(\d\.\d+)\+?\s*gpa|gpa\s*(?:of\s*)?(\d\.\d+)/);
  if (gpaMatch) {
    const required = parseFloat(gpaMatch[1] || gpaMatch[2]);
    if (gpa !== null) return gpa >= required ? "yes" : "no";
    return "unknown";
  }

  // Year/standing checks
  for (const y of YEAR_ORDER) {
    if (req.includes(y)) {
      const reqIdx = YEAR_ORDER.indexOf(y);
      const userIdx = YEAR_ORDER.indexOf(year);
      if (userIdx >= 0) {
        if (req.includes("or above") || req.includes("or higher") || req.includes("at least")) {
          return userIdx >= reqIdx ? "yes" : "no";
        }
        return userIdx === reqIdx ? "yes" : "unknown";
      }
      return "unknown";
    }
  }

  // Major checks
  if (req.includes("major") || req.includes("majoring")) {
    if (major && req.includes(major)) return "yes";
    return "unknown";
  }

  // Keyword matching against profile text
  const keywords = ["faculty", "research", "mentor", "recommendation", "letter", "leadership", "internship", "volunteer"];
  for (const kw of keywords) {
    if (req.includes(kw)) {
      if (allText.includes(kw)) return "yes";
      return "unknown";
    }
  }

  return "unknown";
}
