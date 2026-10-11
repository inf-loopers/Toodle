/**
 * @file generate-allocation-modal.test.jsx
 * @description C01 allocation-engine modal: ranked preview, explainability,
 * hours overrides on commit, stale-skip reporting and the saved-drafts tab.
 *
 * The API module is mocked (repo convention) so these tests assert the contract
 * between the UI and `POST /allocations/generate|drafts*` rather than the engine
 * itself — the engine has its own suites in toodle-api.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GenerateAllocationModal from '../src/components/GenerateAllocationModal';
import { allocationEngineApi } from '../src/api/allocationEngine';
import { useAuth } from '../src/hooks/useAuth';

vi.mock('../src/api/allocationEngine', () => ({
  allocationEngineApi: {
    generate: vi.fn(),
    saveDraft: vi.fn(),
    getDrafts: vi.fn(),
    getDraft: vi.fn(),
    commitDraft: vi.fn(),
    deleteDraft: vi.fn(),
  },
}));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: vi.fn() }));

// ── Fixtures ─────────────────────────────────────────────────────────────────
// Shaped exactly like the API response: Alice (85%) wins COMS101, Bob (72%) is
// bumped to COMS202 where he is rank 2 of 2, Carol (55%) is excluded outright
// and Dan has no weekly-hours budget left.

const explanationFor = (mark, rank, remaining) => ({
  mark,
  markStatus: 'VERIFIED',
  minMarkRequired: 70,
  meetsMinMark: mark >= 70,
  sessionsCovered: 3,
  sessionsTotal: 3,
  remainingHours: remaining,
  maxHoursPerWeek: 10,
  rank,
  eligibleCount: 2,
  reasons: [
    `Mark ${mark}% (verified) meets the 70% minimum`,
    'Available for all 3 course sessions',
    'No timetable clashes with current allocations',
    `${remaining}h of 10h weekly budget remaining`,
  ],
});

const plan = {
  proposed: [
    {
      tutorId: 't1',
      tutorName: 'Alice',
      tutorEmail: 'alice@example.test',
      courseId: 'c1',
      courseCode: 'COMS101',
      courseName: 'Computing',
      hoursPerWeek: 2,
      rank: 1,
      explanation: explanationFor(85, 1, 8),
    },
    {
      tutorId: 't2',
      tutorName: 'Bob',
      tutorEmail: 'bob@example.test',
      courseId: 'c2',
      courseCode: 'COMS202',
      courseName: 'Algorithms',
      hoursPerWeek: 2,
      rank: 2,
      explanation: explanationFor(72, 2, 8),
    },
  ],
  candidates: [
    {
      courseId: 'c1',
      courseCode: 'COMS101',
      courseName: 'Computing',
      requiredTutors: 2,
      activeAllocations: 1,
      vacancies: 1,
      ranked: [
        {
          id: 't1',
          name: 'Alice',
          email: 'alice@example.test',
          mark: 85,
          rank: 1,
          proposed: true,
          explanation: explanationFor(85, 1, 8),
        },
        {
          id: 't2',
          name: 'Bob',
          email: 'bob@example.test',
          mark: 72,
          rank: 2,
          proposed: false,
          explanation: explanationFor(72, 2, 8),
        },
      ],
      excluded: [
        {
          id: 't3',
          name: 'Carol',
          email: 'carol@example.test',
          reasons: ['Mark 55% is below the 70% minimum for COMS101'],
        },
      ],
    },
  ],
  unmatched: {
    tutors: [
      {
        id: 't4',
        name: 'Dan',
        email: 'dan@example.test',
        reason: 'Weekly hours budget exhausted (0h remaining, 2h needed per allocation)',
      },
    ],
    courses: [
      {
        id: 'c3',
        code: 'COMS303',
        name: 'Databases',
        reason: 'Fewer eligible candidates (0) than the 1 vacant position(s)',
      },
    ],
  },
};

const savedDraft = {
  id: 'd1',
  name: 'Sprint plan',
  createdById: 'admin-1',
  createdAt: '2026-02-01T00:00:00.000Z',
  _count: { draftAllocationEntries: 1 },
  createdBy: { id: 'admin-1', name: 'Admin One', email: 'admin@example.test' },
};

const openDraft = {
  ...savedDraft,
  draftAllocationEntries: [
    {
      id: 'e1',
      userId: 't1',
      courseId: 'c1',
      hoursPerWeek: 2,
      reason: null,
      explanation: explanationFor(85, 1, 8),
      user: { id: 't1', name: 'Alice', email: 'alice@example.test', maxHoursPerWeek: 10 },
      course: { id: 'c1', code: 'COMS101', name: 'Computing', minMarkRequired: 70 },
    },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const show = (props = {}) => {
  const onCommitted = props.onCommitted ?? vi.fn();
  render(<GenerateAllocationModal open onClose={vi.fn()} {...props} />);
  return { onCommitted };
};

/** Run the engine and wait for the review phase. */
const generate = async (user) => {
  await user.click(screen.getByRole('button', { name: /Run Engine/ }));
  await screen.findByText('2 proposed');
};

/** Replace a number input's value the way a reviewer would. */
const setHours = async (user, label, value) => {
  const input = screen.getByLabelText(label);
  await user.clear(input);
  await user.type(input, value);
  return input;
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ isAdmin: true, role: 'admin', dbUser: { id: 'admin-1' } });
  allocationEngineApi.generate.mockResolvedValue({ data: plan });
  // Mirror the server: a draft comes back with one entry per proposed row, so the
  // modal has to map the edited hours onto the ids the server actually minted.
  allocationEngineApi.saveDraft.mockImplementation(async ({ proposed }) => ({
    data: {
      id: 'd1',
      draftAllocationEntries: proposed.map((row, index) => ({
        id: `e${index + 1}`,
        userId: row.tutorId,
        courseId: row.courseId,
        hoursPerWeek: row.hoursPerWeek,
      })),
    },
  }));
  allocationEngineApi.commitDraft.mockResolvedValue({
    data: { committed: [{ id: 'a1' }, { id: 'a2' }], skipped: [] },
  });
  allocationEngineApi.deleteDraft.mockResolvedValue({ data: { id: 'd1' } });
  allocationEngineApi.getDrafts.mockResolvedValue({ data: [savedDraft] });
  allocationEngineApi.getDraft.mockResolvedValue({ data: openDraft });
});

// ── Ranked preview ───────────────────────────────────────────────────────────

describe('GenerateAllocationModal preview', () => {
  it('runs the engine into a ranked, grouped review', async () => {
    const user = userEvent.setup();
    show();

    expect(screen.queryByText('2 proposed')).not.toBeInTheDocument();
    await generate(user);

    expect(allocationEngineApi.generate).toHaveBeenCalledTimes(1);
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    // The course code heads its group and is repeated on the row badge.
    expect(screen.getAllByText('COMS101').length).toBeGreaterThan(0);
    expect(screen.getByRole('checkbox', { name: 'Select Alice for COMS101' })).toBeChecked();
    expect(screen.getByRole('button', { name: /Commit Selected \(2\)/ })).toBeEnabled();
  });

  it('explains a ranking with the engine reasons in the Why? popover', async () => {
    const user = userEvent.setup();
    show();
    await generate(user);

    const row = screen.getByRole('checkbox', { name: 'Select Alice for COMS101' }).closest('div');
    await user.click(within(row).getByRole('button', { name: 'Why?' }));

    expect(await screen.findByText('Rank #1 of 2 eligible')).toBeInTheDocument();
    expect(screen.getByText('Mark 85% (verified) meets the 70% minimum')).toBeInTheDocument();
    expect(screen.getByText('No timetable clashes with current allocations')).toBeInTheDocument();
    expect(screen.getByText('8h of 10h weekly budget remaining')).toBeInTheDocument();
  });

  it('lists ranked and excluded candidates per course with blocking reasons', async () => {
    const user = userEvent.setup();
    show();
    await generate(user);

    expect(screen.queryByText('Eligible, best first')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ranked candidates — COMS101' }));

    expect(await screen.findByText('Eligible, best first')).toBeInTheDocument();
    expect(screen.getByText('1 vacant')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 filled')).toBeInTheDocument();
    expect(screen.getByText('Proposed')).toBeInTheDocument();
    expect(screen.getByText('Excluded')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('Mark 55% is below the 70% minimum for COMS101')).toBeInTheDocument();
  });

  it('shows the specific unmatched reasons from the API', async () => {
    const user = userEvent.setup();
    show();
    await generate(user);

    await user.click(screen.getByRole('button', { name: '2 unmatched items' }));

    // Each line is "<name> — <reason>", so match the reason as a substring.
    expect(
      await screen.findByText(
        /Weekly hours budget exhausted \(0h remaining, 2h needed per allocation\)/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Fewer eligible candidates \(0\) than the 1 vacant position\(s\)/)
    ).toBeInTheDocument();
  });

  it('re-runs the engine when the reviewer asks to revalidate', async () => {
    const user = userEvent.setup();
    show();
    await generate(user);

    await user.click(screen.getByRole('button', { name: 'Revalidate' }));
    await screen.findByText('2 proposed');

    expect(allocationEngineApi.generate).toHaveBeenCalledTimes(2);
  });

  it('surfaces the server message when generation fails', async () => {
    const user = userEvent.setup();
    allocationEngineApi.generate.mockRejectedValue({
      response: { data: { error: 'Only admins and lecturers can generate allocations' } },
    });

    show();
    await user.click(screen.getByRole('button', { name: /Run Engine/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only admins and lecturers can generate allocations'
    );
    expect(screen.getByRole('button', { name: /Run Engine/ })).toBeEnabled();
  });
});

// ── Commit ───────────────────────────────────────────────────────────────────

describe('GenerateAllocationModal commit', () => {
  it('sends edited hours as hoursOverrides and removes the throwaway draft', async () => {
    const user = userEvent.setup();
    const { onCommitted } = show({ onCommitted: vi.fn() });
    await generate(user);

    await setHours(user, 'Weekly hours for Alice on COMS101', '6');

    await user.click(screen.getByRole('button', { name: /Commit Selected/ }));

    expect(await screen.findByText('Allocations committed')).toBeInTheDocument();
    expect(allocationEngineApi.saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.stringContaining('Auto-commit') })
    );
    // The edited hours travel keyed by the server entry id, not the row key.
    expect(allocationEngineApi.commitDraft).toHaveBeenCalledWith('d1', ['e1', 'e2'], {
      e1: 6,
      e2: 2,
    });
    expect(allocationEngineApi.deleteDraft).toHaveBeenCalledWith('d1');
    expect(onCommitted).toHaveBeenCalledTimes(1);
  });

  it('keeps a named plan instead of the Auto-commit label when one is typed', async () => {
    const user = userEvent.setup();
    show();
    await generate(user);

    await user.type(screen.getByLabelText('Draft name'), 'Semester 2 plan');
    await user.click(screen.getByRole('button', { name: /Commit Selected/ }));

    await screen.findByText('Allocations committed');
    expect(allocationEngineApi.saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Semester 2 plan' })
    );
  });

  it('reports skipped entries with the tutor, the course and the conflict text', async () => {
    const user = userEvent.setup();
    allocationEngineApi.commitDraft.mockResolvedValue({
      data: {
        committed: [{ id: 'a1' }],
        skipped: [
          {
            entryId: 'e2',
            tutorId: 't2',
            tutorName: 'Bob',
            courseId: 'c2',
            courseCode: 'COMS202',
            reason: 'Tutor already has an allocation for this course, or it is locked',
          },
        ],
      },
    });

    show();
    await generate(user);
    await user.click(screen.getByRole('button', { name: /Commit Selected/ }));

    expect(await screen.findByText('1 allocation created, 1 skipped.')).toBeInTheDocument();
    const skippedRow = screen.getByText('Bob · COMS202').closest('p');
    expect(skippedRow).toHaveTextContent(
      'Tutor already has an allocation for this course, or it is locked'
    );
  });

  it('saves a draft without committing and points at the Drafts tab', async () => {
    const user = userEvent.setup();
    show();
    await generate(user);

    expect(screen.getByRole('button', { name: /Save Draft/ })).toBeDisabled();
    await user.type(screen.getByLabelText('Draft name'), 'Sprint plan');
    expect(screen.getByRole('button', { name: /Save Draft/ })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /Save Draft/ }));

    expect(await screen.findByText('Draft saved')).toBeInTheDocument();
    expect(screen.getByText(/Open it from the Drafts tab/)).toBeInTheDocument();
    expect(allocationEngineApi.saveDraft).toHaveBeenCalledWith({
      name: 'Sprint plan',
      proposed: expect.arrayContaining([expect.objectContaining({ tutorId: 't1' })]),
    });
    expect(allocationEngineApi.commitDraft).not.toHaveBeenCalled();
  });

  it('only commits the checked rows', async () => {
    const user = userEvent.setup();
    show();
    await generate(user);

    await user.click(screen.getByRole('checkbox', { name: 'Select Bob for COMS202' }));
    await user.click(screen.getByRole('button', { name: /Commit Selected \(1\)/ }));

    await screen.findByText('Allocations committed');
    expect(allocationEngineApi.saveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        proposed: [expect.objectContaining({ tutorId: 't1', courseId: 'c1' })],
      })
    );
    expect(allocationEngineApi.commitDraft).toHaveBeenCalledWith('d1', ['e1'], { e1: 2 });
  });
});

// ── Saved drafts ─────────────────────────────────────────────────────────────

describe('GenerateAllocationModal drafts tab', () => {
  it('lists saved drafts with their entry count and author', async () => {
    const user = userEvent.setup();
    show();

    expect(allocationEngineApi.getDrafts).not.toHaveBeenCalled();
    await user.click(screen.getByRole('tab', { name: 'Drafts' }));

    expect(await screen.findByText('Sprint plan')).toBeInTheDocument();
    expect(allocationEngineApi.getDrafts).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/by Admin One/)).toBeInTheDocument();
  });

  it('opens a draft in the review UI and commits its stored entry ids', async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole('tab', { name: 'Drafts' }));
    await user.click(await screen.findByRole('button', { name: 'Open' }));

    expect(await screen.findByText(/Reviewing saved draft/)).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    // A saved draft is committed in place: no throwaway draft, no delete.
    expect(screen.queryByRole('button', { name: /Save Draft/ })).not.toBeInTheDocument();

    await setHours(user, 'Weekly hours for Alice on COMS101', '5');
    await user.click(screen.getByRole('button', { name: /Commit Selected/ }));

    expect(await screen.findByText('Allocations committed')).toBeInTheDocument();
    expect(allocationEngineApi.saveDraft).not.toHaveBeenCalled();
    expect(allocationEngineApi.commitDraft).toHaveBeenCalledWith('d1', ['e1'], { e1: 5 });
    expect(allocationEngineApi.deleteDraft).not.toHaveBeenCalled();
  });

  it('deletes a draft and drops it from the list', async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole('tab', { name: 'Drafts' }));

    await user.click(await screen.findByRole('button', { name: 'Delete draft Sprint plan' }));

    expect(allocationEngineApi.deleteDraft).toHaveBeenCalledWith('d1');
    expect(await screen.findByText('No saved drafts')).toBeInTheDocument();
  });

  it('hides delete for somebody else’s draft when the reviewer is not an admin', async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({ isAdmin: false, role: 'lecturer', dbUser: { id: 'lec-1' } });

    show();
    await user.click(screen.getByRole('tab', { name: 'Drafts' }));

    expect(await screen.findByText('Sprint plan')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete draft Sprint plan' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toBeEnabled();
  });

  it('surfaces a delete failure without dropping the row', async () => {
    const user = userEvent.setup();
    allocationEngineApi.deleteDraft.mockRejectedValue({
      response: { data: { error: 'You can only delete your own drafts' } },
    });

    show();
    await user.click(screen.getByRole('tab', { name: 'Drafts' }));
    await user.click(await screen.findByRole('button', { name: 'Delete draft Sprint plan' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You can only delete your own drafts'
    );
    expect(screen.getByText('Sprint plan')).toBeInTheDocument();
  });
});
