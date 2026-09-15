import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { AllocationProvider, useAllocationContext } from '../src/context/AllocationContext';
import { allocationsApi } from '../src/api/allocations';

vi.mock('../src/api/courses', () => ({
  coursesApi: { getCourses: vi.fn(async () => ({ data: [] })) },
}));
vi.mock('../src/api/tutors', () => ({
  tutorsApi: { getTutors: vi.fn(async () => ({ data: [] })) },
}));
vi.mock('../src/api/allocations', () => ({ allocationsApi: { getAllocations: vi.fn() } }));

let board;
function Probe() {
  board = useAllocationContext();
  return null;
}
async function mountBoard() {
  const view = render(
    <AllocationProvider>
      <Probe />
    </AllocationProvider>
  );
  await waitFor(() => expect(board.loading).toBe(false));
  return view;
}
beforeEach(() => {
  vi.clearAllMocks();
  allocationsApi.getAllocations.mockResolvedValue({ data: [] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Allocation board refresh after swaps', () => {
  it('polls while visible and removes the timer when unmounted', async () => {
    vi.useFakeTimers();
    let view;
    await act(async () => {
      view = render(
        <AllocationProvider>
          <Probe />
        </AllocationProvider>
      );
    });
    expect(allocationsApi.getAllocations).toHaveBeenCalledTimes(1);
    const incoming = {
      id: 'allocation',
      userId: 'new-tutor',
      courseId: 'course',
      hoursPerWeek: 5,
      status: 'ACTIVE',
    };
    allocationsApi.getAllocations.mockResolvedValue({ data: [incoming] });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(allocationsApi.getAllocations).toHaveBeenCalledTimes(2);
    expect(board.courseAllocMap.course).toEqual([incoming]);
    expect(board.allocatedHoursMap).toEqual({ 'new-tutor': 5 });
    view.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    window.dispatchEvent(new Event('focus'));
    expect(allocationsApi.getAllocations).toHaveBeenCalledTimes(2);
  });

  it('ignores hidden-tab events and refreshes when visible again', async () => {
    await mountBoard();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(allocationsApi.getAllocations).toHaveBeenCalledTimes(1);
    visibility.mockReturnValue('visible');
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(allocationsApi.getAllocations).toHaveBeenCalledTimes(2);
  });

  it.each(['editing', 'dragging'])(
    'pauses refresh while %s and resumes afterwards',
    async (mode) => {
      await mountBoard();
      act(() =>
        mode === 'editing'
          ? board.openAssignModal({ id: 'course' })
          : board.startDragTutor({ id: 'tutor' })
      );
      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });
      expect(allocationsApi.getAllocations).toHaveBeenCalledTimes(1);
      act(() => (mode === 'editing' ? board.closeAssignModal() : board.cancelDrag()));
      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });
      expect(allocationsApi.getAllocations).toHaveBeenCalledTimes(2);
    }
  );

  it('coalesces focus and visibility events while a refresh is in flight', async () => {
    await mountBoard();
    let resolve;
    allocationsApi.getAllocations.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    );
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    expect(allocationsApi.getAllocations).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolve({ data: [] });
    });
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(allocationsApi.getAllocations).toHaveBeenCalledTimes(3);
  });

  it('exposes refresh failures and recovers on the next focus', async () => {
    await mountBoard();
    allocationsApi.getAllocations.mockRejectedValueOnce(new Error('Refresh unavailable'));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(board.coursesError).toBe('Refresh unavailable');
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(board.coursesError).toBeFalsy();
    expect(board.loading).toBe(false);
  });
});
