import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
/**
 * @file global-search.test.jsx
 * @description Behaviour of the navbar global search dialog (C05).
 *
 * Covers: the entry button opens the dialog, typing runs a debounced search,
 * results are grouped under Courses / People / Timesheets headings, a group the
 * backend omitted for the caller's role is never rendered (permissions
 * respected), each result navigates to a valid destination (closing the dialog),
 * and the empty / error states are surfaced.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GlobalSearch from '../src/components/layout/GlobalSearch';
import { searchApi } from '../src/api/search';

vi.mock('../src/api/search', () => ({ searchApi: { search: vi.fn() } }));

const course = {
  id: 'c1',
  code: 'COMS3011A',
  name: 'Software Development Practice',
  year: 3,
  semester: 1,
  applicationsOpen: true,
};

const person = { id: 't1', name: 'Tebogo Tutor', email: 'tebogo@test.com', role: 'TUTOR' };

const timesheet = {
  id: 'ts1',
  weekStartDate: '2026-02-02T00:00:00.000Z',
  status: 'SUBMITTED',
  totalHours: 8,
  course: { id: 'c1', code: 'COMS3011A', name: 'SDP' },
  user: { id: 't1', name: 'Tebogo Tutor' },
};

// Mirrors the real API envelope: `{ success, data: { query, courses, ... } }`.
const envelope = (data) => ({ success: true, data });

function LocationProbe() {
  const location = useLocation();
  return <p>Location: {`${location.pathname}${location.search}`}</p>;
}

function renderSearch() {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <GlobalSearch />
      <LocationProbe />
      <Routes>
        <Route path="/dashboard" element={<p>Dashboard content</p>} />
        <Route path="/courses/:id" element={<p>Course detail</p>} />
        <Route path="/tutors" element={<p>Tutors directory</p>} />
        <Route path="/timesheets" element={<p>Timesheets page</p>} />
      </Routes>
    </MemoryRouter>
  );
  return user;
}

async function openDialog(user) {
  await user.click(screen.getByRole('button', { name: 'Global search' }));
  return screen.getByRole('dialog', { name: 'Search Toodle' });
}

async function searchFor(user, term) {
  const dialog = await openDialog(user);
  await user.type(screen.getByRole('textbox', { name: 'Search Toodle' }), term);
  return dialog;
}

describe('GlobalSearch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    searchApi.search.mockResolvedValue(
      envelope({ query: 'com', courses: [course], people: [person], timesheets: [timesheet] })
    );
  });

  it('opens the search dialog from the navbar entry button', async () => {
    const user = renderSearch();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const dialog = await openDialog(user);
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: 'Search Toodle' })).toBeInTheDocument();
    // Nothing is fetched until the user actually types.
    expect(searchApi.search).not.toHaveBeenCalled();
  });

  it('hangs the panel below the navbar instead of centering it over the bar', async () => {
    const user = renderSearch();
    const dialog = await openDialog(user);

    // The positioning wrapper starts the panel flush under the h-16 navbar so it
    // reads as a palette opening from the bar, never overlapping it.
    const shell = dialog.parentElement;
    expect(shell).toHaveClass('items-start');
    expect(shell).toHaveClass('pt-16');
  });

  it('runs a debounced search once the query reaches two characters', async () => {
    const user = renderSearch();
    await openDialog(user);
    const input = screen.getByRole('textbox', { name: 'Search Toodle' });

    await user.type(input, 'c');
    expect(searchApi.search).not.toHaveBeenCalled();

    await user.type(input, 'om');
    await waitFor(() => expect(searchApi.search).toHaveBeenCalledWith('com'));
    expect(searchApi.search).toHaveBeenCalledTimes(1);
  });

  it('groups results under Courses, People and Timesheets headings', async () => {
    const user = renderSearch();
    const dialog = await searchFor(user, 'com');

    await waitFor(() => expect(searchApi.search).toHaveBeenCalledWith('com'));
    expect(await within(dialog).findByRole('heading', { name: 'Courses' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'People' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Timesheets' })).toBeInTheDocument();

    expect(
      within(dialog).getByRole('button', {
        name: /COMS3011A — Software Development Practice/,
      })
    ).toBeInTheDocument();
    // The person result is the only one carrying the tutor's email address
    // (the timesheet row also shows the tutor's name as its subtitle).
    expect(within(dialog).getByRole('button', { name: /tebogo@test.com/ })).toBeInTheDocument();
  });

  it('navigates to the course and closes the dialog when a course result is activated', async () => {
    const user = renderSearch();
    const dialog = await searchFor(user, 'com');

    await user.click(
      await within(dialog).findByRole('button', {
        name: /COMS3011A — Software Development Practice/,
      })
    );

    expect(await screen.findByText('Course detail')).toBeInTheDocument();
    expect(screen.getByText('Location: /courses/c1')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deep-links a person result into the filtered tutor directory', async () => {
    const user = renderSearch();
    const dialog = await searchFor(user, 'com');

    await user.click(await within(dialog).findByRole('button', { name: /tebogo@test.com/ }));

    expect(await screen.findByText('Tutors directory')).toBeInTheDocument();
    expect(screen.getByText('Location: /tutors?q=Tebogo%20Tutor')).toBeInTheDocument();
  });

  it('navigates to the timesheets page when a timesheet result is activated', async () => {
    const user = renderSearch();
    const dialog = await searchFor(user, 'com');

    const timesheetButton = await within(dialog).findByRole('button', { name: /week of/i });
    await user.click(timesheetButton);

    expect(await screen.findByText('Timesheets page')).toBeInTheDocument();
    expect(screen.getByText('Location: /timesheets')).toBeInTheDocument();
  });

  it('never renders a People section the backend omitted for the caller role', async () => {
    // A tutor/student response carries no people group — the UI must not widen it.
    searchApi.search.mockResolvedValue(
      envelope({ query: 'com', courses: [course], people: [], timesheets: [] })
    );
    const user = renderSearch();
    const dialog = await searchFor(user, 'com');

    expect(await within(dialog).findByRole('heading', { name: 'Courses' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'People' })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'Timesheets' })).not.toBeInTheDocument();
  });

  it('shows a no-result state naming the query', async () => {
    searchApi.search.mockResolvedValue(
      envelope({ query: 'zzz', courses: [], people: [], timesheets: [] })
    );
    const user = renderSearch();
    const dialog = await searchFor(user, 'zzz');

    expect(await within(dialog).findByText('No results for "zzz"')).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'Courses' })).not.toBeInTheDocument();
  });

  it('surfaces an error state when the request fails', async () => {
    searchApi.search.mockRejectedValue({ response: { data: { error: 'Search unavailable' } } });
    const user = renderSearch();
    const dialog = await searchFor(user, 'com');

    expect(await within(dialog).findByText('Search failed')).toBeInTheDocument();
    expect(within(dialog).getByText('Search unavailable')).toBeInTheDocument();
  });
});
