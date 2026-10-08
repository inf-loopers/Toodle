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

export function getApiErrorMessage(err, fallback = DEFAULT_FALLBACK) {
  const data = err?.response?.data;
  const message = data?.error || data?.message || err?.message || fallback;

  // "Validation failed" on its own tells the user nothing actionable, so append
  // the first field-level detail the API provided.
  if (message === 'Validation failed' && Array.isArray(data?.details)) {
    const detail = data.details.find((d) => d?.message)?.message;
    if (detail) return `${message}: ${detail}`;
  }

  return message;
}

export default getApiErrorMessage;
