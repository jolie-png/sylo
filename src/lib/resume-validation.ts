/** Shared constants and validation for resume upload (client + server). */

export const ALLOWED_EXTENSIONS = [".pdf"] as const;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Fields extracted from a resume by Claude. All optional — empty means Claude couldn't find it. */
export type ParsedResumeData = {
  name?: string;
  school?: string;
  gpa?: string;
  experience?: string;
  skills?: string;
  priorWork?: string;
  clubs?: string;
  alreadyDone?: string;
};

export type ValidationResult = { valid: true } | { valid: false; message: string };

/**
 * Client-side validation for a resume file.
 * Checks file extension and size before any upload occurs.
 */
export function validateResumeFile(file: File): ValidationResult {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return { valid: false, message: "Please upload a PDF file." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, message: "File must be under 5 MB." };
  }

  return { valid: true };
}
