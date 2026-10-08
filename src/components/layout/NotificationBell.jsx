/**
 * @file NotificationBell.jsx
 * @description Notification bell icon with unread count badge and responsive dropdown panel.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, X } from 'lucide-react';
import { notificationsApi } from '../../api/notifications';
import { formatShortDate } from '../../utils/helpers';

/**
 * Truthful label for a notification's email copy. Delivered (or never
 * attempted) emails need no label; anything else must not look delivered.
 */
const EMAIL_STATUS_LABELS = {
  FAILED: 'Email copy could not be delivered',
  SKIPPED: 'Not emailed — in-app only',
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const panelId = 'notification-panel';
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const panelRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await notificationsApi.getNotifications();
      const list = result?.data ?? result ?? [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err) {
      setNotifications([]);
      if (err?.response?.status === 404) setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const onClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', onClick);
    }

    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const handleToggle = () => {
    setOpen((value) => {
      if (!value) fetchNotifications();
      return !value;
    });
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await notificationsApi.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
      } catch {
        // Keep navigation responsive; the next fetch will reconcile read state.
      }
    }

    setOpen(false);

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Keep the panel usable if the bulk update fails.
    }
  };

  if (unavailable) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-x-0 bottom-0 top-16 z-40 bg-slate-900/20 backdrop-blur-[1px] sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div
            id={panelId}
            role="region"
            aria-label="Notifications panel"
            className="fixed inset-x-3 top-20 z-50 flex max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-h-[28rem]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Notifications
              </h3>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary-subtle hover:text-primary/80 dark:hover:bg-slate-800"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white sm:hidden"
                  aria-label="Close notification panel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${
                      !notification.isRead ? 'bg-primary-subtle/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1.5 flex shrink-0">
                        {!notification.isRead ? (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        ) : (
                          <span className="h-2 w-2" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm leading-snug ${
                            !notification.isRead
                              ? 'font-semibold text-slate-900 dark:text-slate-100'
                              : 'font-normal text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {notification.title}
                        </p>

                        {notification.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                            {notification.body}
                          </p>
                        )}

                        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          {formatShortDate(notification.createdAt)}
                          {EMAIL_STATUS_LABELS[notification.emailStatus] && (
                            <span
                              className={
                                notification.emailStatus === 'FAILED'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : undefined
                              }
                            >
                              {' · '}
                              {EMAIL_STATUS_LABELS[notification.emailStatus]}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
