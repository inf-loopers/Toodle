import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NotificationBell from '../src/components/layout/NotificationBell';
import { notificationsApi } from '../src/api/notifications';

vi.mock('../src/api/notifications', () => ({
  notificationsApi: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

describe('NotificationBell integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders unread badge and marks notification as read on click', async () => {
    const user = userEvent.setup();
    const items = [
      {
        id: 'n1',
        title: 'Timesheet Approved',
        body: 'Your hours were approved.',
        isRead: false,
        createdAt: new Date().toISOString(),
        link: '/timesheets',
      },
    ];

    notificationsApi.getNotifications.mockResolvedValue({ success: true, data: items });
    notificationsApi.markAsRead.mockResolvedValue({
      success: true,
      data: { ...items[0], isRead: true },
    });

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );

    // Wait for the bell to load and show badge count "1"
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // Open the dropdown
    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    await user.click(bellBtn);

    // Notification title should appear
    expect(screen.getByText('Timesheet Approved')).toBeInTheDocument();
    expect(screen.getByText('Your hours were approved.')).toBeInTheDocument();

    // Click the notification item
    const itemBtn = screen.getByRole('button', { name: /timesheet approved/i });
    await user.click(itemBtn);

    expect(notificationsApi.markAsRead).toHaveBeenCalledWith('n1');
  });

  it('allows user to mark all notifications as read', async () => {
    const user = userEvent.setup();
    const items = [
      {
        id: 'n1',
        title: 'Allocation Assigned',
        body: 'You were assigned to COMS3011A',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ];

    notificationsApi.getNotifications.mockResolvedValue({ success: true, data: items });
    notificationsApi.markAllAsRead.mockResolvedValue({ success: true, data: { count: 1 } });

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    await user.click(bellBtn);

    const markAllBtn = screen.getByRole('button', { name: /mark all read/i });
    await user.click(markAllBtn);

    expect(notificationsApi.markAllAsRead).toHaveBeenCalled();
  });

  it('uses a viewport-fitted notification panel on mobile', async () => {
    const user = userEvent.setup();

    notificationsApi.getNotifications.mockResolvedValue({ success: true, data: [] });

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );

    const bellBtn = screen.getByRole('button', { name: /notifications/i });
    await user.click(bellBtn);

    const panel = screen.getByRole('region', { name: /notifications panel/i });
    expect(panel).toHaveClass('fixed', 'inset-x-3', 'top-20', 'max-h-[calc(100dvh-5.5rem)]');
    expect(panel).toHaveClass('sm:absolute', 'sm:w-96');

    await user.click(screen.getByRole('button', { name: /close notification panel/i }));
    expect(screen.queryByRole('region', { name: /notifications panel/i })).not.toBeInTheDocument();
    expect(bellBtn).toHaveFocus();
    await user.keyboard('{Enter}{Tab}');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: /notifications panel/i })).not.toBeInTheDocument();
    expect(bellBtn).toHaveFocus();
  });

  describe('email delivery status (B03)', () => {
    const notification = (overrides) => ({
      id: 'n',
      title: 'Allocation changed',
      body: 'Your hours changed.',
      isRead: false,
      createdAt: new Date().toISOString(),
      link: '/courses/c1',
      ...overrides,
    });

    const openBell = async (items) => {
      notificationsApi.getNotifications.mockResolvedValue({ data: items });
      notificationsApi.markAsRead.mockResolvedValue({ data: {} });
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<NotificationBell />} />
            <Route path="/courses/:id" element={<p>Course page</p>} />
          </Routes>
        </MemoryRouter>
      );
      await user.click(await screen.findByRole('button', { name: /notifications/i }));
      return user;
    };

    it('flags a notification whose email failed, and never labels it delivered', async () => {
      await openBell([notification({ id: 'n1', emailStatus: 'FAILED' })]);

      expect(screen.getByText(/Email copy could not be delivered/)).toBeInTheDocument();
      expect(screen.queryByText(/email (sent|delivered)/i)).not.toBeInTheDocument();
    });

    it('marks a notification that was never emailed as in-app only', async () => {
      await openBell([notification({ id: 'n2', emailStatus: 'SKIPPED' })]);

      expect(screen.getByText(/Not emailed — in-app only/)).toBeInTheDocument();
    });

    it('adds no label when the email was sent', async () => {
      await openBell([notification({ id: 'n3', emailStatus: 'SENT' })]);

      expect(screen.getByText('Allocation changed')).toBeInTheDocument();
      expect(screen.queryByText(/Email copy|Not emailed/)).not.toBeInTheDocument();
    });

    it("follows the notification's link to a page the recipient can open", async () => {
      const user = await openBell([notification({ id: 'n4' })]);

      await user.click(screen.getByText('Allocation changed'));

      expect(await screen.findByText('Course page')).toBeInTheDocument();
      expect(notificationsApi.markAsRead).toHaveBeenCalledWith('n4');
    });
  });
});
