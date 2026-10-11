import { describe, expect, it } from 'vitest';
import { buildBudgetRows, summarizeBudget } from '../src/utils/budgetReport';

// "Known examples" — hand-calculated figures that must reconcile exactly
// with what buildBudgetRows/summarizeBudget compute, using the same
// amount/spent values (50000, 60000, 8000, 10000) already established as
// test fixtures for course budgets in the backend course.service tests.
const underBudget = {
  id: 'c-a',
  code: 'COMS1001A',
  name: 'Intro to CS',
  budget: { amount: '50000', spent: '32500' }, // -> remaining 17500, 65% used
};
const overBudget = {
  id: 'c-b',
  code: 'COMS2001A',
  name: 'Data Structures',
  budget: { amount: '10000', spent: '12000' }, // -> remaining -2000, 120% used
};
const untouchedBudget = {
  id: 'c-c',
  code: 'COMS3011A',
  name: 'Software Design',
  budget: { amount: '8000', spent: '0' }, // -> remaining 8000, 0% used
};
const noBudget = { id: 'c-d', code: 'COMS4001A', name: 'No Budget Set' };

describe('buildBudgetRows', () => {
  it('reconciles a known under-budget example: 50000 budget, 32500 spent', () => {
    const [row] = buildBudgetRows([underBudget]);

    expect(row.amount).toBe(50000);
    expect(row.spent).toBe(32500);
    expect(row.remaining).toBe(17500);
    expect(row.percentUsed).toBeCloseTo(65, 5);
    expect(row.overBudget).toBe(false);
  });

  it('reconciles a known over-budget example: 10000 budget, 12000 spent', () => {
    const [row] = buildBudgetRows([overBudget]);

    expect(row.amount).toBe(10000);
    expect(row.spent).toBe(12000);
    expect(row.remaining).toBe(-2000);
    expect(row.percentUsed).toBeCloseTo(120, 5);
    expect(row.overBudget).toBe(true);
  });

  it('reconciles a known untouched-budget example: 8000 budget, 0 spent', () => {
    const [row] = buildBudgetRows([untouchedBudget]);

    expect(row.remaining).toBe(8000);
    expect(row.percentUsed).toBe(0);
    expect(row.overBudget).toBe(false);
  });

  it('omits courses with no budget set', () => {
    const rows = buildBudgetRows([noBudget]);

    expect(rows).toEqual([]);
  });

  it('treats a zero-amount budget with recorded spend as unambiguously over budget', () => {
    const [row] = buildBudgetRows([
      { id: 'c-e', code: 'COMS5001A', budget: { amount: '0', spent: '500' } },
    ]);

    expect(row.percentUsed).toBe(Infinity);
    expect(row.overBudget).toBe(true);
  });

  it('is reproducible: sorts rows by course code regardless of input order', () => {
    const rows = buildBudgetRows([overBudget, untouchedBudget, underBudget, noBudget]);

    expect(rows.map((r) => r.code)).toEqual(['COMS1001A', 'COMS2001A', 'COMS3011A']);
  });

  it('returns an empty array for no courses', () => {
    expect(buildBudgetRows([])).toEqual([]);
    expect(buildBudgetRows(undefined)).toEqual([]);
  });
});

describe('summarizeBudget', () => {
  it('reconciles known per-course examples into a correct aggregate total', () => {
    const rows = buildBudgetRows([underBudget, overBudget, untouchedBudget]);

    const summary = summarizeBudget(rows);

    // 50000 + 10000 + 8000 = 68000; 32500 + 12000 + 0 = 44500.
    expect(summary.amount).toBe(68000);
    expect(summary.spent).toBe(44500);
    expect(summary.remaining).toBe(23500);
    expect(summary.percentUsed).toBeCloseTo((44500 / 68000) * 100, 5);
    expect(summary.coursesOverBudget).toBe(1);
  });

  it('returns a zeroed summary for no budgeted courses', () => {
    const summary = summarizeBudget([]);

    expect(summary).toEqual({
      amount: 0,
      spent: 0,
      remaining: 0,
      percentUsed: 0,
      coursesOverBudget: 0,
    });
  });
});
