import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import HelpButton from '../src/components/layout/HelpButton';
import HelpPage from '../src/pages/HelpPage';

const auth = vi.hoisted(() => ({ isTutor: true, isStudent: false, isLecturer: false }));
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => auth }));
beforeEach(() => {
  auth.isTutor = true;
  auth.isStudent = false;
  auth.isLecturer = false;
  auth.isAdmin = false;
});

it('offers administrator help for staff invitations and requests', async () => {
  auth.isTutor = false;
  auth.isAdmin = true;
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/users']}>
      <Routes>
        <Route path="/users" element={<HelpButton />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </MemoryRouter>
  );
  await user.click(screen.getByRole('button', { name: 'Help' }));
  await user.click(screen.getByRole('link', { name: 'Help with this page' }));
  expect(screen.getByText('Getting started as an Administrator')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Invite staff and review access requests' })
  ).toHaveFocus();
});

it('opens Lecturer allocation help and shows the Lecturer navigation image', async () => {
  auth.isTutor = false;
  auth.isLecturer = true;
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/allocations']}>
      <Routes>
        <Route path="/allocations" element={<HelpButton />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </MemoryRouter>
  );
  await user.click(screen.getByRole('button', { name: 'Help' }));
  await user.click(screen.getByRole('link', { name: 'Help with this page' }));
  expect(screen.getByText('Getting started as a Lecturer')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Assign tutors to courses' })).toHaveFocus();
  expect(screen.getByText(/Use "Confirm assignment"/)).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Check eligibility and apply to tutor' })
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Find your way around Toodle' }));
  expect(
    screen.getByRole('img', { name: 'Mobile navigation menu showing Lecturer pages.' })
  ).toBeInTheDocument();
});

it('takes a tutor from page help to the relevant guide topic by keyboard', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<HelpButton />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </MemoryRouter>
  );
  screen.getByRole('button', { name: 'Help' }).focus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('link', { name: 'Getting started' })).toHaveFocus();
  await user.tab();
  expect(screen.getByRole('link', { name: 'Help with this page' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(
    screen.getByRole('button', { name: 'Set your availability and weekly hours' })
  ).toHaveFocus();
  expect(screen.getByText(/separate "Save" buttons/)).toBeInTheDocument();
  expect(document.getElementById('availability-content').querySelector('a')).toBeNull();
  expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute(
    'href',
    'mailto:toodle.issues@gmail.com'
  );
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Find your way around Toodle' }));
  expect(
    screen.getByRole('img', { name: 'Mobile navigation menu showing Tutor pages.' })
  ).toBeInTheDocument();
});

it('starts collapsed and reveals only the chosen topic', async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <HelpPage />
    </MemoryRouter>
  );
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  const dashboard = screen.getByRole('button', { name: 'Understand your dashboard' });
  dashboard.focus();
  await user.keyboard('{Enter}');
  expect(dashboard).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText(/Your dashboard summarises/)).toBeInTheDocument();
  const calendar = screen.getByRole('button', { name: 'Check your calendar' });
  await user.click(calendar);
  expect(dashboard).toHaveAttribute('aria-expanded', 'false');
  expect(calendar).toHaveAttribute('aria-expanded', 'true');
  expect(screen.queryByText(/Your dashboard summarises/)).not.toBeInTheDocument();
  await user.click(calendar);
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Find your way around Toodle' }));
  expect(screen.getAllByRole('img')).toHaveLength(1);
});

it('keeps support available without offering the Tutor guide to other roles', async () => {
  auth.isTutor = false;
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <HelpButton />
    </MemoryRouter>
  );
  await user.click(screen.getByRole('button', { name: 'Help' }));
  expect(screen.queryByRole('link', { name: 'Getting started' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute(
    'href',
    'mailto:toodle.issues@gmail.com'
  );
});

it('opens Student profile help with Student steps and no Tutor-only topics', async () => {
  auth.isTutor = false;
  auth.isStudent = true;
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<HelpButton />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </MemoryRouter>
  );
  await user.click(screen.getByRole('button', { name: 'Help' }));
  await user.click(screen.getByRole('link', { name: 'Help with this page' }));
  expect(screen.getByText('Getting started as a Student')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Set your profile, availability and weekly hours' })
  ).toHaveFocus();
  expect(
    screen.getByText(/year of study, weekly hours and availability have separate/)
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Request an excusal' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Check eligibility and apply to tutor' }));
  expect(screen.getByText(/Press "Apply to tutor"/)).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Find your way around Toodle' }));
  expect(
    screen.getByRole('img', { name: 'Mobile navigation menu showing Student pages.' })
  ).toBeInTheDocument();
});
