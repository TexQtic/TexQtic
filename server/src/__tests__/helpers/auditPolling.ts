/**
 * Audit Event Polling Helper
 *
 * Handles eventually-consistent audit log queries with bounded retry.
 * Useful when audit events are written asynchronously and may not be
 * immediately available for query.
 *
 * Usage:
 * ```typescript
 * const event = await expectAuditEventually(
 *   () => prisma.auditLog.findFirst({ where: { actorId: userId } }),
 *   (result) => result !== null,
 *   1000, // timeout
 *   50    // interval
 * );
 * ```
 */

/**
 * Poll for audit event with eventual consistency handling.
 *
 * Repeatedly executes queryFn until predicate returns true or timeout.
 *
 * @param queryFn - Function that executes the query
 * @param predicate - Function that validates the result
 * @param timeoutMs - Maximum time to wait (default: 1000ms)
 * @param intervalMs - Polling interval (default: 50ms)
 * @returns Promise<T> - Query result when predicate succeeds
 * @throws Error if timeout reached without success
 */
export async function expectAuditEventually<T>(
  queryFn: () => Promise<T>,
  predicate: (result: T) => boolean,
  timeoutMs: number = 1000,
  intervalMs: number = 50
): Promise<T> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await queryFn();

    if (predicate(result)) {
      return result;
    }

    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  // Timeout reached - throw descriptive error
  throw new Error(
    `[Audit Polling] Timeout after ${timeoutMs}ms waiting for audit event. ` +
      `Query did not satisfy predicate within ${Math.floor(timeoutMs / intervalMs)} attempts.`
  );
}

/**
 * Poll for audit events (array result) with eventual consistency handling.
 *
 * @param queryFn - Function that executes the query returning array
 * @param predicate - Function that validates the array result
 * @param timeoutMs - Maximum time to wait (default: 1000ms)
 * @param intervalMs - Polling interval (default: 50ms)
 * @returns Promise<T[]> - Query result array when predicate succeeds
 * @throws Error if timeout reached without success
 */
export async function expectAuditEventsEventually<T>(
  queryFn: () => Promise<T[]>,
  predicate: (results: T[]) => boolean,
  timeoutMs: number = 1000,
  intervalMs: number = 50
): Promise<T[]> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const results = await queryFn();

    if (predicate(results)) {
      return results;
    }

    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  // Timeout reached - throw descriptive error
  throw new Error(
    `[Audit Polling] Timeout after ${timeoutMs}ms waiting for audit events. ` +
      `Query did not satisfy predicate within ${Math.floor(timeoutMs / intervalMs)} attempts.`
  );
}
