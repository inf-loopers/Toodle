import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AllocationBoardPage from '../src/pages/AllocationBoardPage';
import { AuthContext } from '../src/context/AuthContext';
import { coursesApi } from '../src/api/courses';
import { tutorsApi } from '../src/api/tutors';
import { allocationsApi } from '../src/api/allocations';

vi.mock('../src/api/courses', () => ({ coursesApi: { getCourses: vi.fn() } }));
vi.mock('../src/api/tutors', () => ({
  tutorsApi: { getTutors: vi.fn(), addOrUpdateMark: vi.fn() },
}));
vi.mock('../src/api/allocations', () => ({
  allocationsApi: {
    getAllocations: vi.fn(),
    validateAllocation: vi.fn(),
    createAllocation: vi.fn(),
    updateAllocation: vi.fn(),
    deleteAllocation: vi.fn(),
  },
}));
vi.mock('../src/hooks/useIsMobile', () => ({ useIsMobile: () => false }));
// GenerateAllocationModal (rendered by the board) reads the current user to
// decide draft-delete rights. A plain function keeps the stub intact across the
// `vi.resetAllMocks()` in beforeEach.
vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({ isAdmin: true, role: 'admin', dbUser: { id: 'admin-1' } }),
}));

const course = {
  id: 'c1',
  code: 'COMS101',
  name: 'Computing',
  minMarkRequired: 60,
  requiredTutors: 1,
  coordinators: [{ user: { id: 'lec1', name: 'Lerato' } }],
};
const otherCourse = {
  id: 'c2',
  code: 'COMS202',
  name: 'Algorithms',
  minMarkRequired: 50,
  requiredTutors: 1,
  coordinators: [{ user: { id: 'lec9', name: 'Pieter' } }],
};
const tutor = {
  id: 't1',
  name: 'Alice',
  email: 'alice@example.test',
  maxHoursPerWeek: 10,
  tutorMarks: [],
};

function allocation(overrides = {}) {
  return {
    id: 'a1',
    userId: 't1',
    courseId: 'c1',
    status: 'ACTIVE',
    hoursPerWeek: 2,
    isLocked: false,
    user: tutor,
    ...overrides,
  };
}

function renderBoard(authValue) {
  const board = <AllocationBoardPage />;
  return render(
    <MemoryRouter initialEntries={['/allocations']}>
      {authValue ? <AuthContext.Provider value={authValue}>{board}</AuthContext.Provider> : board}
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  coursesApi.getCourses.mockResolvedValue({ data: [course] });
  tutorsApi.getTutors.mockResolvedValue({ data: [tutor] });
  allocationsApi.getAllocations.mockResolvedValue({ data: [] });
  allocationsApi.validateAllocation.mockResolvedValue({
    data: { isValid: true, warnings: [], remainingHours: 10 },
  });
  allocationsApi.createAllocation.mockResolvedValue({});
});

describe('Allocation locks on the board', () => {
  it('marks locked allocations and blocks removal until unlocked', async () => {
    allocationsApi.getAllocations.mockResolvedValue({ data: [allocation({ isLocked: true })] });
    renderBoard();
    expect(await screen.findByLabelText('Locked')).toBeInTheDocument();
    expect(screen.getByTitle('Unlock this allocation before removing it')).toBeDisabled();
    expect(screen.getByTitle('Unlock')).toBeEnabled();
  });

  it('preserves locks across board refreshes (server state wins)', async () => {
    allocationsApi.getAllocations.mockResolvedValue({ data: [allocation()] });
    renderBoard();
    expect(await screen.findByTitle('Lock')).toBeEnabled();
    allocationsApi.getAllocations.mockResolvedValue({ data: [allocation({ isLocked: true })] });
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(await screen.findByTitle('Unlock this allocation before removing it')).toBeDisabled();
  });

  it('toggles the lock and refreshes the board', async () => {
    const user = userEvent.setup();
    allocationsApi.getAllocations.mockResolvedValue({ data: [allocation()] });
    allocationsApi.updateAllocation.mockResolvedValue({});
    renderBoard();
    await user.click(await screen.findByTitle('Lock'));
    expect(allocationsApi.updateAllocation).toHaveBeenCalledWith('a1', { isLocked: true });
    await waitFor(() => expect(allocationsApi.getAllocations).toHaveBeenCalledTimes(2));
  });
});

describe('Stale allocation saves', () => {
  it('explains stale lock toggles and refreshes the board', async () => {
    const user = userEvent.setup();
    allocationsApi.getAllocations.mockResolvedValue({ data: [allocation()] });
    allocationsApi.updateAllocation.mockRejectedValue({
      response: { status: 404, data: { error: 'Allocation not found' } },
    });
    renderBoard();
    await user.click(await screen.findByTitle('Lock'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /changed or removed by someone else/
    );
    await waitFor(() => expect(allocationsApi.getAllocations).toHaveBeenCalledTimes(2));
  });

  it('keeps server conflict text actionable when removal is rejected', async () => {
    const user = userEvent.setup();
    allocationsApi.getAllocations.mockResolvedValue({ data: [allocation()] });
    allocationsApi.deleteAllocation.mockRejectedValue({
      response: {
        status: 409,
        data: { error: 'Unlock the allocation before changing or retiring it' },
      },
    });
    renderBoard();
    await user.click(await screen.findByTitle('Remove'));
    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Unlock the allocation before changing or retiring it');
    expect(banner).toHaveTextContent(/refreshed/);
    await waitFor(() => expect(allocationsApi.getAllocations).toHaveBeenCalledTimes(2));
  });

  it('surfaces create conflicts in the modal and refreshes the board', async () => {
    const user = userEvent.setup();
    renderBoard();
    await user.click(await screen.findByRole('button', { name: '+ Assign tutor' }));
    await user.selectOptions(screen.getByLabelText('Tutor'), 't1');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Confirm assignment' })).toBeEnabled()
    );
    allocationsApi.createAllocation.mockRejectedValue({
      response: {
        status: 409,
        data: { error: 'Tutor already has an allocation for this course, or it is locked' },
      },
    });
    await user.click(screen.getByRole('button', { name: 'Confirm assignment' }));
    expect(await screen.findByText(/already has an allocation/)).toHaveTextContent(/refreshed/);
    await waitFor(() => expect(allocationsApi.getAllocations).toHaveBeenCalledTimes(2));
  });
});

describe('Course visibility by role', () => {
  beforeEach(() => {
    coursesApi.getCourses.mockResolvedValue({ data: [course, otherCourse] });
  });

  it('shows lecturers only the courses they coordinate', async () => {
    renderBoard({ dbUser: { id: 'lec1', role: 'lecturer' } });
    expect(await screen.findByText('COMS101')).toBeInTheDocument();
    expect(screen.queryByText('COMS202')).not.toBeInTheDocument();
  });

  it('shows admins every course', async () => {
    renderBoard({ dbUser: { id: 'admin1', role: 'admin' } });
    expect(await screen.findByText('COMS101')).toBeInTheDocument();
    expect(screen.getByText('COMS202')).toBeInTheDocument();
  });
});
