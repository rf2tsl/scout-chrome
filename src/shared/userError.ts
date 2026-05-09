// User-facing error sanitizer. Maps any thrown value to a generic, safe
// string suitable for showing in the panel. Never surface raw response
// bodies, stack traces, or upstream provider messages — those leak
// implementation details (ngrok offline pages, DRF tracebacks, etc.) and
// confuse users.
//
// Detail belongs in the backend logs, not in the UI.

import { ApiError } from "./api";

export function toUserMessage(err: unknown): string {
  // Network unreachable — fetch throws TypeError before we ever get a Response.
  if (err instanceof TypeError) {
    return "Couldn't reach Scout. Check your connection and try again.";
  }

  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Your session expired. Please sign in again.";
    }
    if (err.status === 404) {
      return "Not found.";
    }
    if (err.status === 429) {
      return "Too many requests. Please wait a moment and try again.";
    }
    if (err.status >= 500) {
      // 502 from the backend means the analyzer call failed (LLM error,
      // truncation, etc.). The detailed reason is logged server-side.
      return "Something went wrong on our end. Please try again.";
    }
    if (err.status === 400) {
      // Validation errors are usually safe to surface — but only if they
      // look like a short, intentional message. Otherwise fall back.
      const body = err.body as { detail?: unknown } | null;
      const detail = body?.detail;
      if (typeof detail === "string" && detail.length > 0 && detail.length < 200) {
        return detail;
      }
      return "Invalid request.";
    }
    return "Request failed.";
  }

  return "Something went wrong. Please try again.";
}
