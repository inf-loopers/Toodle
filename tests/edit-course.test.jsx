import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditCourseModal from '../src/components/EditCourseModal';
import { coursesApi } from '../src/api/courses';

vi.mock('../src/api/courses', () => ({
  coursesApi: {
    updateCourse: vi.fn(),
  },
}));

const mockCourse = {
  id: 'c-101',
  code: 'COMS3001A',
  name: 'Software Design',
  description: 'Learn modern software design patterns.',
  year: 2026,
  semester: 1,
  requiredTutors: 10,
  minMarkRequired: 80,
  budget: {
    amount: '50000',
    spent: '12000',
  },
};

describe('EditCourseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pre-populates with existing course values when open', () => {
    render(
      <EditCourseModal open={true} onClose={vi.fn()} course={mockCourse} onUpdated={vi.fn()} />
    );

    expect(screen.getByLabelText('Course code')).toHaveValue('COMS3001A');
    expect(screen.getByLabelText('Course name')).toHaveValue('Software Design');
    expect(screen.getByLabelText('Description')).toHaveValue(
      'Learn modern software design patterns.'
    );
    expect(screen.getByLabelText('Year')).toHaveValue(2026);
    expect(screen.getByLabelText('Semester')).toHaveValue('1');
    expect(screen.getByLabelText('Tutors needed')).toHaveValue(10);
    expect(screen.getByLabelText('Min. mark %')).toHaveValue(80);
    expect(screen.getByLabelText(/Course budget/i)).toHaveValue(50000);
  });

  it('submits updated course requirements and budget to coursesApi.updateCourse', async () => {
    coursesApi.updateCourse.mockResolvedValue({ success: true });
    const onUpdated = vi.fn().mockResolvedValue();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <EditCourseModal open={true} onClose={onClose} course={mockCourse} onUpdated={onUpdated} />
    );

    const tutorsInput = screen.getByLabelText('Tutors needed');
    const markInput = screen.getByLabelText('Min. mark %');
    const budgetInput = screen.getByLabelText(/Course budget/i);

    await user.clear(tutorsInput);
    await user.type(tutorsInput, '15');

    await user.clear(markInput);
    await user.type(markInput, '85');

    await user.clear(budgetInput);
    await user.type(budgetInput, '75000');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(coursesApi.updateCourse).toHaveBeenCalledWith('c-101', {
        name: 'Software Design',
        description: 'Learn modern software design patterns.',
        year: 2026,
        semester: 1,
        requiredTutors: 15,
        minMarkRequired: 85,
        budget: 75000,
      });
      expect(onUpdated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('allows clearing the budget to null when a course had an existing budget', async () => {
    coursesApi.updateCourse.mockResolvedValue({ success: true });
    const onUpdated = vi.fn().mockResolvedValue();
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <EditCourseModal open={true} onClose={onClose} course={mockCourse} onUpdated={onUpdated} />
    );

    const budgetInput = screen.getByLabelText(/Course budget/i);
    await user.clear(budgetInput);

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(coursesApi.updateCourse).toHaveBeenCalledWith(
        'c-101',
        expect.objectContaining({
          budget: null,
        })
      );
    });
  });

  it('validates required fields and percentage ranges', async () => {
    const user = userEvent.setup();

    render(
      <EditCourseModal open={true} onClose={vi.fn()} course={mockCourse} onUpdated={vi.fn()} />
    );

    const markInput = screen.getByLabelText('Min. mark %');
    await user.clear(markInput);
    await user.type(markInput, '120');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Minimum mark must be between 0% and 100%.'
    );
    expect(coursesApi.updateCourse).not.toHaveBeenCalled();

    const nameInput = screen.getByLabelText('Course name');
    await user.clear(nameInput);
    await user.clear(markInput);
    await user.type(markInput, '75');

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Course name is required.');
  });

  it('displays an error message when update API fails', async () => {
    coursesApi.updateCourse.mockRejectedValue({
      response: { data: { error: 'Budget cannot be less than already spent amount' } },
    });
    const user = userEvent.setup();

    render(
      <EditCourseModal open={true} onClose={vi.fn()} course={mockCourse} onUpdated={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Budget cannot be less than already spent amount'
    );
  });
});
