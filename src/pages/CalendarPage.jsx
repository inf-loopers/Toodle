/**
 * @file CalendarPage.jsx
 * @description The signed-in user's sessions on a FullCalendar grid (Scope A).
 *
 * Responsibilities:
 * - Renders dated session occurrences on week / month / list views.
 * - Refetches automatically whenever the visible range changes, through
 *   FullCalendar's `events` fetcher, so navigating months needs no extra wiring.
 * - Shows approved excusals as cancelled occurrences rather than hiding them.
 * - Surfaces an empty-range hint and a failure banner without unmounting the
 *   grid, so the user can still navigate to a different range.
 * - Opens the subscribe modal (Scope B) from the toolbar.
 *
 * Scoping is decided server-side (see toodle-api `calendar.service.js`): the
 * grid only ever receives courses the user is allocated to or coordinates, so
 * this component holds no role logic of its own.
 *
 * Layout note: the grid sits in a bounded-height wrapper and scrolls internally
 * (`height="100%"`), which preserves the PageLayout invariant that `<main>` is
 * the only page-level scroller — the calendar never adds a second one.
 *
 * Responsive note: below the `lg` breakpoint (`useIsMobile`) the seven-column
 * week grid is too cramped for a phone, so the page defaults to the list view
 * behind a compact toolbar and switches back to the week grid on desktop. A
 * breakpoint change after mount re-selects the view imperatively, because
 * FullCalendar reads `initialView` only once.
 *
 * Route: `/calendar` (all authenticated roles)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CalendarPlus, RefreshCw } from 'lucide-react';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';

import { calendarApi } from '../api/calendar';
import { formatDateParam, toCalendarEvent } from '../utils/calendar';
import { getApiErrorMessage } from '../utils/apiError';
import { useIsMobile } from '../hooks/useIsMobile';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import FormError from '../components/ui/FormError';
import CalendarFeedModal from '../components/calendar/CalendarFeedModal';

// Stable references: FullCalendar treats a changed `plugins`/`headerToolbar`
// identity as a new configuration, so these must not be recreated per render.
const CALENDAR_PLUGINS = [timeGridPlugin, dayGridPlugin, listPlugin, interactionPlugin];

const HEADER_TOOLBAR = {
  left: 'prev,next today',
  center: 'title',
  right: 'timeGridWeek,dayGridMonth,listWeek',
};

// A phone cannot fit the seven-column week grid or the full view switcher, so
// the compact toolbar drops the cramped week grid and the page defaults to the
// list view, keeping the month grid reachable. Both toolbars are module-level
// constants: FullCalendar re-configures whenever a toolbar identity changes.
const HEADER_TOOLBAR_MOBILE = {
  left: 'prev,next today',
  center: 'title',
  right: 'listWeek,dayGridMonth',
};

const DESKTOP_VIEW = 'timeGridWeek';
const MOBILE_VIEW = 'listWeek';

export function CalendarPage() {
  const navigate = useNavigate();
  const calendarRef = useRef(null);
  const didMountRef = useRef(false);
  const isMobile = useIsMobile();

  const [eventCount, setEventCount] = useState(0);
  const [hasFetched, setHasFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedOpen, setFeedOpen] = useState(false);

  // FullCalendar invokes this on mount and on every range change. The identity
  // must stay stable (empty deps): each setState below re-renders the page, and
  // a new function reference would make FullCalendar refetch in a loop.
  const fetchEvents = useCallback((fetchInfo, successCallback, failureCallback) => {
    const start = formatDateParam(fetchInfo.startStr || fetchInfo.start);
    const end = formatDateParam(fetchInfo.endStr || fetchInfo.end);

    setError('');

    calendarApi
      .getMyEvents({ start, end })
      .then((response) => {
        const mapped = (response?.data?.events ?? []).map(toCalendarEvent);

        setEventCount(mapped.length);
        setHasFetched(true);
        successCallback(mapped);
      })
      .catch((err) => {
        setEventCount(0);
        setHasFetched(true);
        setError(getApiErrorMessage(err, 'Could not load your calendar.'));
        failureCallback(err);
      });
  }, []);

  const handleEventClick = useCallback(
    (info) => {
      const link = info.event.extendedProps?.link;

      if (link) navigate(link);
    },
    [navigate]
  );

  // Hover / assistive-tech context the compact event chip cannot fit: the venue,
  // or why an occurrence was excused. FullCalendar hands back the element.
  const handleEventDidMount = useCallback((info) => {
    const { venue, cancelled, cancellationReason } = info.event.extendedProps ?? {};
    const parts = [info.event.title];

    if (cancelled && cancellationReason) parts.push(`Excused: ${cancellationReason}`);
    if (venue) parts.push(venue);

    info.el.title = parts.join(' · ');
  }, []);

  const handleRefresh = useCallback(() => {
    calendarRef.current?.getApi().refetchEvents();
  }, []);

  // FullCalendar reads `initialView` only once, at mount, so a breakpoint change
  // afterwards (device rotation, window resize) must switch the view
  // imperatively. The first run is skipped because `initialView` already chose
  // the right view, and `changeView` is optional-chained so the jsdom stub —
  // which implements only `refetchEvents` — is left untouched.
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    calendarRef.current?.getApi()?.changeView?.(isMobile ? MOBILE_VIEW : DESKTOP_VIEW);
  }, [isMobile]);

  const showEmptyHint = hasFetched && !loading && !error && eventCount === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Calendar</h1>

          <p className="mt-2 text-sm text-slate-500">
            Your scheduled sessions across every course you are allocated to or coordinate.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>

          <Button onClick={() => setFeedOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            Subscribe
          </Button>
        </div>
      </div>

      <FormError
        message={error}
        hint="Try refreshing, or navigate to a different range."
        className="mb-4"
      />

      {showEmptyHint && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          Nothing scheduled in this range.
        </div>
      )}

      <Card padded={false} className="overflow-hidden">
        <div className="toodle-calendar h-[calc(100dvh-15rem)] min-h-[26rem] p-2 sm:h-[calc(100vh-16rem)] sm:min-h-[32rem] sm:p-3">
          <FullCalendar
            ref={calendarRef}
            plugins={CALENDAR_PLUGINS}
            initialView={isMobile ? MOBILE_VIEW : DESKTOP_VIEW}
            headerToolbar={isMobile ? HEADER_TOOLBAR_MOBILE : HEADER_TOOLBAR}
            height="100%"
            slotMinTime="07:00:00"
            slotMaxTime="21:00:00"
            weekends
            nowIndicator
            dayMaxEvents={isMobile ? 3 : false}
            events={fetchEvents}
            eventClick={handleEventClick}
            eventDidMount={handleEventDidMount}
            loading={setLoading}
          />
        </div>
      </Card>

      <CalendarFeedModal open={feedOpen} onClose={() => setFeedOpen(false)} />
    </div>
  );
}

export default CalendarPage;
