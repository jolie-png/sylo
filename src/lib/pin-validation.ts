/** Shared constants and validation for Pin screenshot upload (client + server). */

export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export type ValidationResult = { valid: true } | { valid: false; message: string };

/**
 * Client-side validation for a screenshot image file.
 * Checks MIME type and size before any upload or processing occurs.
 */
export function validatePinImage(file: File): ValidationResult {
  if (
    !ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
    )
  ) {
    return {
      valid: false,
      message: "Please upload a PNG, JPEG, or WebP image.",
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, message: "Image must be under 8 MB." };
  }

  return { valid: true };
}

/** @deprecated Use validatePinImage instead */
export const validateCatchImage = validatePinImage;
