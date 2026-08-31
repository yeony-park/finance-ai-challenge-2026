/**
 * Next can provide a dynamic segment as its percent-encoded URL form during
 * static generation. Decode it once, while treating malformed user input as
 * an unknown ID that the repository can reject normally.
 */
export function decodeRouteId(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
