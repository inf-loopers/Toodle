/**
 * @file budgetReport.js
 * @description Builds spend-against-budget comparison figures from courses
 * that carry a `budget` relation ({ amount, spent }, from GET /courses as
 * seen by staff). Figures are derived directly from the same stored decimal
 * values Course Detail and course management already display, so they
 * always reconcile with those screens — there is no separate calculation
 * of "spend" here, just a side-by-side comparison of the two numbers.
 */

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Percentage of the budget consumed. Returns Infinity for the edge case of
 * a zero-amount budget that still has recorded spend (nothing to divide
 * by, but it is unambiguously over budget) and 0 for a zero/zero budget.
 */
function percentUsed(amount, spent) {
  if (amount > 0) return (spent / amount) * 100;
  return spent > 0 ? Infinity : 0;
}

/**
 * One row per course that has a budget set. Courses without a budget are
 * omitted entirely — there is nothing to compare spend against. Rows are
 * sorted by course code so the same input data always produces the same
 * order, regardless of how the courses were fetched (reproducible, in
 * keeping with the payroll export's ordering guarantee).
 */
export function buildBudgetRows(courses) {
  const rows = [];
  for (const course of courses ?? []) {
    const budget = course?.budget;
    if (!budget) continue;
    const amount = toNumber(budget.amount);
    const spent = toNumber(budget.spent);
    rows.push({
      courseId: course.id,
      code: course.code,
      name: course.name,
      amount,
      spent,
      remaining: amount - spent,
      percentUsed: percentUsed(amount, spent),
      overBudget: spent > amount,
    });
  }
  rows.sort((a, b) => String(a.code).localeCompare(String(b.code)));
  return rows;
}

/** Aggregate totals across every budgeted course, for a single headline figure. */
export function summarizeBudget(rows) {
  const amount = (rows ?? []).reduce((s, r) => s + r.amount, 0);
  const spent = (rows ?? []).reduce((s, r) => s + r.spent, 0);
  return {
    amount,
    spent,
    remaining: amount - spent,
    percentUsed: percentUsed(amount, spent),
    coursesOverBudget: (rows ?? []).filter((r) => r.overBudget).length,
  };
}
