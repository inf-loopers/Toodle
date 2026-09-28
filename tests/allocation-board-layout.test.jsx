import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AllocationBoardPage from '../src/pages/AllocationBoardPage';
import PageLayout from '../src/components/layout/PageLayout';
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
// Layout children are heavy (auth, notifications) — the shell contract under
// test is the scroll structure, not their behaviour.
vi.mock('../src/components/layout/Sidebar', () => ({
  default: () => <aside data-testid="sidebar" />,
}));
vi.mock('../src/components/layout/Navbar', () => ({
  default: () => <header data-testid="navbar" />,
}));

const course = {
  id: 'c1',
  code: 'COMS101',
  name: 'Computing',
  minMarkRequired: 60,
  requiredTutors: 1,
  coordinators: [],
};
const tutor = {
  id: 't1',
  name: 'Alice',
  email: 'alice@example.test',
  maxHoursPerWeek: 10,
  tutorMarks: [],
};

beforeEach(() => {
  vi.resetAllMocks();
  coursesApi.getCourses.mockResolvedValue({ data: [course] });
  tutorsApi.getTutors.mockResolvedValue({ data: [tutor] });
  allocationsApi.getAllocations.mockResolvedValue({ data: [] });
});

describe('Allocation board scrolling containment', () => {
  it('keeps course columns inside a horizontally scrolling region instead of growing the page', async () => {
    render(<AllocationBoardPage />);

    const columns = await screen.findByTestId('board-columns');
    expect(columns).toHaveClass('overflow-x-auto', 'min-h-0');
    // Columns keep a minimum width (the limit that makes the region scroll)
    // and can shrink vertically so their own lists scroll instead of the page.
    for (const column of screen.getAllByTestId('course-column')) {
      expect(column).toHaveClass('min-w-[260px]', 'min-h-0');
    }
  });

  it('aligns every course column with the tutor pool level', async () => {
    render(<AllocationBoardPage />);

    // Columns stretch (no self-start) to the pool-driven row height, so tops
    // and bottoms line up across the board regardless of allocation count.
    for (const column of await screen.findAllByTestId('course-column')) {
      expect(column).toHaveClass('min-h-0', 'min-w-[260px]');
      expect(column).not.toHaveClass('self-start');
    }
    // Each column's list fills that level and scrolls internally beyond it.
    for (const list of screen.getAllByTestId('course-column-list')) {
      expect(list).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    }
  });

  it('limits the tutor pool to five visible cards, then scrolls vertically', async () => {
    render(<AllocationBoardPage />);

    // The pool section hugs its capped content height (self-start) — this
    // makes it the height benchmark the course columns align to.
    const pool = await screen.findByTestId('tutor-pool');
    expect(pool).toHaveClass('min-h-0', 'lg:self-start');
    // max-h-[46.5rem] ≈ five tutor cards visible; the rest scroll vertically.
    expect(screen.getByTestId('tutor-pool-list')).toHaveClass(
      'max-h-[46.5rem]',
      'min-h-0',
      'overflow-y-auto'
    );
  });

  it('sizes the board to the pool instead of stretching the page', async () => {
    render(<AllocationBoardPage />);

    // The row hugs the pool-driven height (no flex-1); the page root only
    // guarantees containment inside main's scroll region (lg:min-h-full).
    const body = await screen.findByTestId('board-body');
    expect(body).toHaveClass('min-h-[600px]', 'lg:min-h-0');
    expect(body).not.toHaveClass('flex-1');
    expect(body.parentElement).toHaveClass('lg:min-h-full');
  });
});

describe('App shell scrolling', () => {
  function renderShell() {
    return render(
      <MemoryRouter initialEntries={['/allocations']}>
        <Routes>
          <Route element={<PageLayout />}>
            <Route path="/allocations" element={<div data-testid="page-content">Board</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  }

  it('locks the shell to the viewport so the page itself never scrolls', () => {
    const { container } = renderShell();

    expect(container.firstChild).toHaveClass(
      'h-screen',
      'h-[100dvh]',
      'overflow-hidden',
      'overscroll-none'
    );
  });

  it('scrolls main independently and keeps the sidebar outside the scroller', () => {
    renderShell();

    const main = screen.getByTestId('page-content').closest('main');
    expect(main).toHaveClass(
      'min-h-0',
      'flex-1',
      'overflow-y-auto',
      'overflow-x-hidden',
      'overscroll-contain'
    );
    expect(main.contains(screen.getByTestId('sidebar'))).toBe(false);
    // The content column can shrink below wide content — pages with wide
    // inner regions (like the board) scroll inside, never at body level.
    expect(main.parentElement).toHaveClass('min-h-0', 'min-w-0', 'flex-1');
    expect(main.parentElement.parentElement).toHaveClass('overflow-hidden');
  });
});
