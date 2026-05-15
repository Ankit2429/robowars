/**
 * Centralized API URL resolver for production.
 * Used by both customFetch (via setBaseUrl) and socket.io-client.
 * 
 * Handles the case where VITE_API_URL might be:
 * - A full URL: "https://my-backend.onrender.com"
 * - A bare domain: "my-backend.onrender.com"
 * - undefined: falls back to window.location.origin (same-origin)
 */
export function getApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (!raw) {
    return window.location.origin;
  }
  // Already has a protocol
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/+$/, "");
  }
  // Bare domain — add https
  return `https://${raw}`.replace(/\/+$/, "");
}
