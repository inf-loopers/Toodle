import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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
});
