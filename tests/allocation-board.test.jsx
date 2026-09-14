import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AllocationBoardPage from '../src/pages/AllocationBoardPage';
import { AllocationProvider, useAllocationContext } from '../src/context/AllocationContext';
import { coursesApi } from '../src/api/courses';
import { tutorsApi } from '../src/api/tutors';
import { allocationsApi } from '../src/api/allocations';
import { allocationCollisionDetection } from '../src/utils/allocationCollision';

vi.mock('../src/api/courses', () => ({ coursesApi: { getCourses: vi.fn() } }));
vi.mock('../src/api/tutors', () => ({
  tutorsApi: { getTutors: vi.fn(), addOrUpdateMark: vi.fn() },
}));
vi.mock('../src/api/allocations', () => ({
  allocationsApi: {
    getAllocations: vi.fn(),
    validateAllocation: vi.fn(),
    createAllocation: vi.fn(),
  },
}));
vi.mock('../src/hooks/useIsMobile', () => ({ useIsMobile: () => false }));

const course = {
  id: 'c1',
  code: 'COMS101',
  name: 'Computing',
  minMarkRequired: 60,
  requiredTutors: 1,
};
const tutor = {
  id: 't1',
  name: 'Alice',
  email: 'alice@example.test',
  maxHoursPerWeek: 10,
  tutorMarks: [{ id: 'm1', courseId: 'c1', mark: 75, status: 'PENDING' }],
};
const markWarning = {
  type: 'MARK_NOT_VERIFIED',
  severity: 'error',
  message: 'Mark must be verified',
};
const valid = { data: { isValid: true, warnings: [], remainingHours: 10 } };

beforeEach(() => {
  vi.resetAllMocks();
  coursesApi.getCourses.mockResolvedValue({ data: [course] });
  tutorsApi.getTutors.mockResolvedValue({ data: [tutor] });
  allocationsApi.getAllocations.mockResolvedValue({ data: [] });
  allocationsApi.validateAllocation.mockResolvedValue({
    data: { isValid: false, warnings: [markWarning] },
  });
  tutorsApi.addOrUpdateMark.mockResolvedValue({
    data: { ...tutor.tutorMarks[0], status: 'VERIFIED' },
  });
  allocationsApi.createAllocation.mockResolvedValue({});
});

async function openAssignment() {
  const user = userEvent.setup();
  render(<AllocationBoardPage />);
  await user.click(await screen.findByRole('button', { name: '+ Assign tutor' }));
  await user.selectOptions(screen.getByLabelText('Tutor'), 't1');
  await screen.findByText('Mark must be verified');
  return user;
}

describe('Allocation board verification', () => {
  it('records a mark for a tutor who has never submitted one', async () => {
    tutorsApi.getTutors.mockResolvedValue({ data: [{ ...tutor, tutorMarks: [] }] });
    const user = await openAssignment();
    expect(screen.getByText(/No mark recorded/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Verified course mark (%)'), '75');
    await user.click(screen.getByRole('checkbox'));
    allocationsApi.validateAllocation.mockResolvedValue(valid);
    await user.click(screen.getByRole('button', { name: 'Save verified mark' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Confirm assignment' })).toBeEnabled()
    );
    expect(tutorsApi.addOrUpdateMark).toHaveBeenCalledWith('t1', { courseId: 'c1', mark: 75 });
  });
  it('verifies a mark without an application, rechecks eligibility and assigns', async () => {
    const user = await openAssignment();
    const save = screen.getByRole('button', { name: 'Save verified mark' });
    expect(save).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    allocationsApi.validateAllocation.mockResolvedValue(valid);
    await user.click(save);
    expect(tutorsApi.addOrUpdateMark).toHaveBeenCalledWith('t1', { courseId: 'c1', mark: 75 });
    expect(
      await screen.findByText('Recorded mark: 75% (VERIFIED) Minimum: 60%.')
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Confirm assignment' })).toBeEnabled()
    );
    await user.click(screen.getByRole('button', { name: 'Confirm assignment' }));
    expect(allocationsApi.createAllocation).toHaveBeenCalledWith({
      userId: 't1',
      courseId: 'c1',
      hoursPerWeek: 2,
      reason: undefined,
    });
  });

  it('keeps errors visible when saving fails and allows retry', async () => {
    tutorsApi.addOrUpdateMark.mockRejectedValueOnce(new Error('Verification failed'));
    const user = await openAssignment();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Save verified mark' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Verification failed');
    expect(screen.getByText('Mark must be verified')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save pending allocation' })).toBeDisabled();
    expect(allocationsApi.createAllocation).not.toHaveBeenCalled();
  });

  it('requires a new attestation when the mark is edited and rejects invalid percentages', async () => {
    const user = await openAssignment();
    await user.click(screen.getByRole('checkbox'));
    const field = screen.getByLabelText('Verified course mark (%)');
    await user.clear(field);
    await user.type(field, '101');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    await user.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Save verified mark' })).toBeDisabled();
  });

  it('blocks assignment if the eligibility recheck fails after verification', async () => {
    const user = await openAssignment();
    allocationsApi.validateAllocation.mockRejectedValue(new Error('Offline'));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Save verified mark' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not check eligibility');
    expect(screen.getByRole('button', { name: 'Save pending allocation' })).toBeDisabled();
  });

  it('excludes pending allocations from staffing and remaining hours', async () => {
    allocationsApi.getAllocations.mockResolvedValue({
      data: [
        { id: 'a1', userId: 't1', courseId: 'c1', status: 'PENDING', hoursPerWeek: 8, user: tutor },
      ],
    });
    render(<AllocationBoardPage />);
    expect(await screen.findByText('Needs tutor')).toBeInTheDocument();
    expect(screen.getByText('10h left')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(within(screen.getByText('Assigned').parentElement).getByText('0')).toBeInTheDocument();
  });

  it('surfaces tutor-loading errors instead of an empty pool', async () => {
    tutorsApi.getTutors.mockRejectedValue(new Error('Tutor service unavailable'));
    render(<AllocationBoardPage />);
    expect(await screen.findByText('Tutor service unavailable')).toBeInTheDocument();
  });

  it('opens the dropped course with the dragged tutor preselected', async () => {
    let board;
    function Probe() {
      board = useAllocationContext();
      return null;
    }
    render(
      <AllocationProvider>
        <Probe />
      </AllocationProvider>
    );
    await waitFor(() => expect(board.loading).toBe(false));
    act(() => board.dropOnCourse(tutor, course));
    expect(board.assignTarget).toMatchObject({ id: 'c1', _preselectedTutorId: 't1' });
  });
});

describe('Course drop targets', () => {
  const rectangle = { top: 0, left: 0, right: 100, bottom: 100, width: 100, height: 100 };
  const args = {
    droppableContainers: [{ id: 'course-c1' }],
    droppableRects: new Map([['course-c1', rectangle]]),
    collisionRect: rectangle,
  };
  it('does not assign to the nearest course when the pointer is outside the board', () => {
    expect(
      allocationCollisionDetection({ ...args, pointerCoordinates: { x: 300, y: 300 } })
    ).toEqual([]);
  });
  it('accepts pointer drops inside the course', () => {
    expect(
      allocationCollisionDetection({ ...args, pointerCoordinates: { x: 50, y: 50 } })[0].id
    ).toBe('course-c1');
  });
  it('retains collision detection for keyboard dragging without pointer coordinates', () => {
    expect(allocationCollisionDetection({ ...args, pointerCoordinates: null })[0].id).toBe(
      'course-c1'
    );
  });
});
