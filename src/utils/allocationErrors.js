/**
 * @file allocationErrors.js
 * @description Shared error classification for allocation board mutations.
 *
 * The allocation API answers stale writes with 404 (row retired or changed by
 * someone else) or 409 (lock, capacity or uniqueness conflict). Both mean the
 * caller's view of the board was stale: the message tells the organiser the
 * board has been refreshed, and the caller is expected to refetch when
 * `isStaleAllocationError` is true.
 */

/** True when the failure means the caller's view of the board was stale. */
export function isStaleAllocationError(err) {
  const status = err?.response?.status;
  return status === 404 || status === 409;
}

/**
 * Map an allocation mutation failure to an actionable message. Server
 * conflict text (e.g. "Unlock the allocation before changing or retiring
 * it") is preserved and followed by the refresh hint.
 */
export function describeAllocationError(err, fallback = 'Could not save the allocation.') {
  const status = err?.response?.status;
  const serverMessage = err?.response?.data?.error || err?.response?.data?.message;
  if (status === 404) {
    return 'This allocation was changed or removed by someone else. The board has been refreshed — review the latest state and try again.';
  }
  if (status === 409) {
    return `${serverMessage || 'This change conflicts with a newer update.'} The board has been refreshed — review the latest state and try again.`;
  }
  return serverMessage || err?.message || fallback;
}
