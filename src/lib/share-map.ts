// ---------------------------------------------------------------------------
// Self-contained sharing for Success Maps.
//
// The app has no backend database, so a shared map travels *inside the URL*:
// the map is JSON-encoded to URL-safe base64 and read back on the /shared-map
// page. This makes a shared link work on any device without server storage.
// ---------------------------------------------------------------------------

import type { PublishedMap } from "./published-maps";

/** Encode a map to URL-safe base64 (UTF-8 safe). */
export function encodeMap(map: PublishedMap): string {
  const json = JSON.stringify(map);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 = btoa(binary);
  // URL-safe: +/ -> -_, drop padding
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a URL-safe base64 string back into a map. Returns null if malformed. */
export function decodeMap(encoded: string): PublishedMap | null {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const obj = JSON.parse(json) as unknown;

    // Minimal shape validation — enough to trust it for rendering.
    if (
      !obj ||
      typeof obj !== "object" ||
      typeof (obj as PublishedMap).outcome !== "string" ||
      !Array.isArray((obj as PublishedMap).steps)
    ) {
      return null;
    }
    return obj as PublishedMap;
  } catch {
    return null;
  }
}

/**
 * Build an absolute, shareable URL for a map. Pass an explicit origin when
 * available (e.g. window.location.origin); falls back to a relative path.
 */
export function buildShareUrl(map: PublishedMap, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/shared-map?d=${encodeMap(map)}`;
}
