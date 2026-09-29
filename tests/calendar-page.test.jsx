/**
 * @file calendar-page.test.jsx
 * @description Calendar page (Scope A) behaviour with a stubbed FullCalendar.
 *
 * jsdom has no layout engine or ResizeObserver, so the real grid cannot render.
 * The stub below behaves like FullCalendar for the parts the page depends on: it
 * invokes the `events` fetcher on mount (and again on `refetchEvents`), toggles
 * the `loading` callback, renders each resolved event as a button carrying its
 * class names, and calls `eventClick` with the event's extended props.
 *
 * Asserted: session titles render, a PENDING occurrence carries its pending
 * marker, an approved excusal reads "Excused", an empty range shows the hint, an
 * API rejection surfaces a FormError banner, clicking an event navigates to the
 * course, Refresh refetches, Subscribe opens the feed dialog, the responsive
 * view switch picks the week grid on desktop and the compact list on mobile, and
 * the Calendar nav entry is wired for every role.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

import CalendarPage from '../src/pages/CalendarPage';
import { NAV_SECTIONS, ROLES } from '../src/utils/constants';

const { calendarApi, mobileState } = vi.hoisted(() => ({
  calendarApi: {
    getMyEvents: vi.fn(),
    getFeedToken: vi.fn(),
    createFeedToken: vi.fn(),
    revokeFeedToken: vi.fn(),
  },
  // Drives the mocked useIsMobile so a test can render the page at either the
  // desktop or the mobile breakpoint without a real media query.
  mobileState: { isMobile: false },
}));

vi.mock('../src/api/calendar', () => ({ calendarApi, default: calendarApi }));
vi.mock('../src/api/client', () => ({ default: { defaults: { baseURL: '/api/v1' } } }));
vi.mock('../src/hooks/useIsMobile', () => ({
  useIsMobile: () => mobileState.isMobile,
  default: () => mobileState.isMobile,
}));

// The page passes these plugin objects straight to FullCalendar, which is stubbed
// below, so empty defaults keep the real (layout-heavy) packages out of jsdom.
vi.mock('@fullcalendar/timegrid', () => ({ default: {} }));
vi.mock('@fullcalendar/daygrid', () => ({ default: {} }));
vi.mock('@fullcalendar/list', () => ({ default: {} }));
vi.mock('@fullcalendar/interaction', () => ({ default: {} }));

vi.mock('@fullcalendar/react', async () => {
  const React = await import('react');

  const fetchInfo = {
    start: new Date('2026-09-28T00:00:00'),
    end: new Date('2026-10-05T00:00:00'),
    startStr: '2026-09-28T00:00:00',
    endStr: '2026-10-05T00:00:00',
  };

  const FullCalendar = React.forwardRef(function MockFullCalendar(props, ref) {
    const [events, setEvents] = React.useState([]);
    const [tick, setTick] = React.useState(0);
    const { events: fetcher, loading, eventClick } = props;

    React.useEffect(() => {
      loading?.(true);
      fetcher(
        fetchInfo,
        (resolved) => {
          setEvents(resolved);
          loading?.(false);
        },
        () => {
          setEvents([]);
          loading?.(false);
        }
      );
      // `tick` is the refetch trigger; `fetcher`/`loading` are stable page
      // callbacks, so this effect runs once on mount and once per Refresh.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick]);

    React.useImperativeHandle(
      ref,
      () => ({ getApi: () => ({ refetchEvents: () => setTick((value) => value + 1) }) }),
      []
    );

    return React.createElement(
      'div',
      {
        'data-testid': 'mock-calendar',
        'data-initial-view': props.initialView,
        'data-header-right': props.headerToolbar?.right,
      },
      events.map((event) =>
        React.createElement(
          'button',
          {
            key: event.id,
            type: 'button',
            'data-classes': (event.classNames || []).join(' '),
            onClick: () =>
              eventClick?.({ event: { title: event.title, extendedProps: event.extendedProps } }),
          },
          event.title
        )
      )
    );
  });

  return { default: FullCalendar, __esModule: true };
});

const eventsResponse = (events) => ({
  success: true,
  data: { start: '2026-09-28', end: '2026-10-05', events },
});

const activeEvent = {
  id: 'session-1-2026-09-28',
  title: 'COMS3011A Tutorial',
  courseCode: 'COMS3011A',
  courseName: 'Algorithms',
  courseId: 'course-1',
  sessionType: 'TUTORIAL',
  venue: 'Sci-Bono 3',
  start: '2026-09-28T08:00:00+02:00',
  end: '2026-09-28T09:00:00+02:00',
  allocationStatus: 'ACTIVE',
  cancelled: false,
  cancellationReason: null,
  link: '/courses/course-1',
};

const pendingEvent = {
  ...activeEvent,
  id: 'session-2-2026-09-30',
  title: 'COMS2001A Lab',
  courseCode: 'COMS2001A',
  courseId: 'course-2',
  sessionType: 'LAB',
  allocationStatus: 'PENDING',
  link: '/courses/course-2',
};

const cancelledEvent = {
  ...activeEvent,
  id: 'session-3-2026-10-01',
  title: 'COMS3011A Lecture',
  sessionType: 'LECTURE',
  cancelled: true,
  cancellationReason: 'Public lecture',
};

function LocationProbe() {
  const location = useLocation();

  return <div data-testid="location">{location.pathname}</div>;
}

function show() {
  return render(
    <MemoryRouter initialEntries={['/calendar']}>
      <CalendarPage />
      <LocationProbe />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mobileState.isMobile = false;
  calendarApi.getMyEvents.mockResolvedValue(eventsResponse([]));
  calendarApi.getFeedToken.mockResolvedValue({ data: { connected: false } });
});

describe('CalendarPage', () => {
  it('renders a session title carrying the course code and type', async () => {
    calendarApi.getMyEvents.mockResolvedValue(eventsResponse([activeEvent]));
    show();

    const event = await screen.findByRole('button', { name: 'COMS3011A Tutorial' });

    expect(event).toHaveAttribute(
      'data-classes',
      expect.stringContaining('toodle-calendar-event--active')
    );
    expect(calendarApi.getMyEvents).toHaveBeenCalledWith({
      start: '2026-09-28',
      end: '2026-10-05',
    });
  });

  it('marks a PENDING occurrence with its pending class', async () => {
    calendarApi.getMyEvents.mockResolvedValue(eventsResponse([pendingEvent]));
    show();

    const event = await screen.findByRole('button', { name: 'COMS2001A Lab' });

    expect(event).toHaveAttribute(
      'data-classes',
      expect.stringContaining('toodle-calendar-event--pending')
    );
  });

  it('shows an approved excusal as a cancelled "Excused" occurrence', async () => {
    calendarApi.getMyEvents.mockResolvedValue(eventsResponse([cancelledEvent]));
    show();

    const event = await screen.findByRole('button', { name: 'Excused: COMS3011A Lecture' });

    expect(event).toHaveAttribute(
      'data-classes',
      expect.stringContaining('toodle-calendar-event--cancelled')
    );
  });

  it('shows the empty-range hint when nothing is scheduled', async () => {
    calendarApi.getMyEvents.mockResolvedValue(eventsResponse([]));
    show();

    expect(await screen.findByText('Nothing scheduled in this range.')).toBeInTheDocument();
  });

  it('surfaces an API failure in a FormError alert', async () => {
    calendarApi.getMyEvents.mockRejectedValueOnce({
      response: { data: { error: 'Calendar unavailable' } },
    });
    show();

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('Calendar unavailable');
    expect(screen.queryByText('Nothing scheduled in this range.')).not.toBeInTheDocument();
  });

  it('navigates to the course when an event is clicked', async () => {
    calendarApi.getMyEvents.mockResolvedValue(eventsResponse([activeEvent]));
    const user = userEvent.setup();
    show();

    await user.click(await screen.findByRole('button', { name: 'COMS3011A Tutorial' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/courses/course-1');
  });

  it('refetches the visible range when Refresh is clicked', async () => {
    calendarApi.getMyEvents.mockResolvedValue(eventsResponse([activeEvent]));
    const user = userEvent.setup();
    show();

    await screen.findByRole('button', { name: 'COMS3011A Tutorial' });
    await user.click(screen.getByRole('button', { name: /Refresh/ }));

    await waitFor(() => expect(calendarApi.getMyEvents).toHaveBeenCalledTimes(2));
  });

  it('opens the subscribe dialog from the toolbar', async () => {
    const user = userEvent.setup();
    show();

    await user.click(await screen.findByRole('button', { name: /Subscribe/ }));

    expect(
      await screen.findByRole('dialog', { name: 'Subscribe to your calendar' })
    ).toBeInTheDocument();
  });

  it('uses the week grid and full view switcher on desktop', async () => {
    show();

    const calendar = await screen.findByTestId('mock-calendar');

    expect(calendar).toHaveAttribute('data-initial-view', 'timeGridWeek');
    expect(calendar).toHaveAttribute('data-header-right', 'timeGridWeek,dayGridMonth,listWeek');
  });

  it('falls back to the compact list view on mobile', async () => {
    mobileState.isMobile = true;
    show();

    const calendar = await screen.findByTestId('mock-calendar');

    expect(calendar).toHaveAttribute('data-initial-view', 'listWeek');
    // The cramped seven-column week grid is dropped from the mobile switcher.
    expect(calendar).toHaveAttribute('data-header-right', 'listWeek,dayGridMonth');
  });
});

describe('Calendar navigation wiring', () => {
  it.each([ROLES.ADMIN, ROLES.LECTURER, ROLES.TUTOR, ROLES.STUDENT])(
    'lists the Calendar entry for the %s role',
    (role) => {
      const items = NAV_SECTIONS[role].flatMap((section) => section.items);

      expect(items).toContainEqual({
        name: 'Calendar',
        path: '/calendar',
        icon: 'CalendarDays',
      });
    }
  );
});
