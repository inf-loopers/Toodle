/**
 * @file apiError.js
 * @description Shared helper for turning API/Axios errors into user-facing text.
 *
 * The backend answers failures with a `{ success: false, error, details }`
 * envelope; the Zod validation middleware uses the generic `error:
 * 'Validation failed'` plus a `details` array of `{ field, message }`, and a few
 * paths use `message` instead of `error`. `getApiErrorMessage` unwraps the most
 * specific text available and always returns an actionable fallback so a failure
 * can never render as an empty or silent alert.
 *
 * Expected Usage:
 * ```js
 * try {
 *   await coursesApi.createCourse(payload);
 * } catch (err) {
 *   setError(getApiErrorMessage(err, 'Could not create the course.'));
 * }
 * ```
 */

const DEFAULT_FALLBACK = 'Something went wrong. Please try again.';

/*
 * Technical strings that must never reach a user verbatim. Raw ORM/SQL
 * diagnostics, backticked constraint names, framework codes and route echoes
 * read like meaningless hashes to a person, so they are swapped for the
 * actionable fallback instead of being displayed.
 */
const TECHNICAL_PATTERNS = [
  /prisma/i,
  /invocation/i,
  /`/,
  /\w+_(fkey|pkey|key|idx|unique)\b/i,
  /\bP2\d{3}\b/,
  /^route\s+\S+\s+\S+\s+not found/i,
  /\[object Object\]/,
];

const isTechnical = (message) =>
  typeof message === 'string' && TECHNICAL_PATTERNS.some((pattern) => pattern.test(message));

export function getApiErrorMessage(err, fallback = DEFAULT_FALLBACK) {
  const data = err?.response?.data;
  const raw = data?.error || data?.message || err?.message || fallback;
  const message = typeof raw === 'string' && raw.trim() !== '' ? raw : fallback;

  if (isTechnical(message)) return fallback;

  // "Validation failed" on its own tells the user nothing actionable, so append
  // the first field-level detail the API provided.
  if (message === 'Validation failed' && Array.isArray(data?.details)) {
    const detail = data.details.find((d) => d?.message)?.message;
    if (detail && !isTechnical(detail)) return `${message}: ${detail}`;
  }

  return message;
}

export default getApiErrorMessage;
