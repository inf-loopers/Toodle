import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimetableImportModal, {
  TIMETABLE_TEMPLATE_CSV,
} from '../src/components/availability/TimetableImportModal';
import { tutorsApi } from '../src/api/tutors';

vi.mock('../src/api/tutors', () => ({
  tutorsApi: { previewTimetableImport: vi.fn(), commitTimetableImport: vi.fn() },
}));

const csvFile = (name = 'timetable.csv') =>
  new File([TIMETABLE_TEMPLATE_CSV], name, { type: 'text/csv' });

const row = (rowNumber, dayOfWeek, startTime, endTime, module, location = 'CBG01') => ({
  rowNumber,
  day: dayOfWeek,
  dayOfWeek,
  startTime,
  endTime,
  module,
  location,
  issue: null,
});

const validPreview = {
  rows: [
    row(2, 'MONDAY', '08:00', '10:00', 'CS101'),
    row(3, 'TUESDAY', '13:00', '15:00', 'MATH101', 'WC01'),
  ],
  summary: { totalRows: 2, valid: 2, invalid: 0 },
  clashes: [],
  duplicates: [],
  currentSlots: [{ dayOfWeek: 'MONDAY', startTime: '09:00', endTime: '12:00' }],
  proposedSlots: [
    { dayOfWeek: 'MONDAY', startTime: '10:00', endTime: '17:00' },
    { dayOfWeek: 'TUESDAY', startTime: '08:00', endTime: '13:00' },
    { dayOfWeek: 'TUESDAY', startTime: '15:00', endTime: '17:00' },
  ],
  keptSlots: [],
  affectedAllocations: [],
  canImport: true,
};

const show = (props = {}) =>
  render(
    <TimetableImportModal
      open
      onClose={vi.fn()}
      tutorId="tutor-1"
      onImported={vi.fn()}
      {...props}
    />
  );

const previewWith = async (user, data = validPreview) => {
  tutorsApi.previewTimetableImport.mockResolvedValue({ success: true, data });
  await user.upload(screen.getByLabelText('Choose a timetable CSV'), csvFile());
  await user.click(screen.getByRole('button', { name: 'Preview' }));
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('TimetableImportModal', () => {
  it('previews classes and the free time that will be saved before anything is written', async () => {
    const user = userEvent.setup();
    show();

    await previewWith(user);

    expect(tutorsApi.previewTimetableImport).toHaveBeenCalledWith('tutor-1', expect.any(File));
    expect(await screen.findByText('MATH101')).toBeInTheDocument();
    expect(screen.getByText('13:00–15:00')).toBeInTheDocument();
    expect(screen.getByText('Availability after import')).toBeInTheDocument();
    expect(screen.getByText('08:00–13:00, 15:00–17:00')).toBeInTheDocument();
    expect(tutorsApi.commitTimetableImport).not.toHaveBeenCalled();
  });

  it('imports only after the tutor confirms, then refreshes the profile', async () => {
    const onImported = vi.fn();
    tutorsApi.commitTimetableImport.mockResolvedValue({
      success: true,
      data: { importedClasses: 2, totalRows: 2, availability: [] },
    });
    const user = userEvent.setup();
    show({ onImported });

    await previewWith(user);
    await user.click(await screen.findByRole('button', { name: 'Confirm import' }));

    expect(tutorsApi.commitTimetableImport).toHaveBeenCalledWith('tutor-1', expect.any(File));
    expect(await screen.findByText(/Imported 2 classes/)).toBeInTheDocument();
    expect(onImported).toHaveBeenCalled();
  });

  it('blocks the import and points at invalid rows', async () => {
    const user = userEvent.setup();
    show();

    await previewWith(user, {
      ...validPreview,
      rows: [
        validPreview.rows[0],
        {
          ...row(3, null, null, null, 'CS101'),
          issue: 'Classes must be on a school day (Monday to Friday)',
        },
      ],
      summary: { totalRows: 2, valid: 1, invalid: 1 },
      proposedSlots: [],
      canImport: false,
    });

    expect(await screen.findByText(/school day \(Monday to Friday\)/)).toBeInTheDocument();
    expect(
      screen.getByText(/Nothing can be imported until every row is valid/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm import' })).toBeDisabled();
  });

  it('blocks the import when it would break an active allocation', async () => {
    const user = userEvent.setup();
    show();

    await previewWith(user, {
      ...validPreview,
      affectedAllocations: [
        {
          allocationId: 'a1',
          course: { id: 'c1', code: 'COMS2002' },
          reasons: ['Tutor is unavailable for COMS2002 Lab (Mon 08:00–09:00)'],
        },
      ],
      canImport: false,
    });

    expect(
      await screen.findByText(/COMS2002: Tutor is unavailable for COMS2002 Lab/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm import' })).toBeDisabled();
  });

  it('warns about clashing classes but still allows the import', async () => {
    const user = userEvent.setup();
    show();

    await previewWith(user, {
      ...validPreview,
      clashes: [{ dayOfWeek: 'MONDAY', rowNumbers: [2, 3], modules: ['CS101', 'MATH101'] }],
    });

    expect(
      await screen.findByText('CS101 and MATH101 overlap on Monday (rows 2 and 3).')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm import' })).toBeEnabled();
  });

  it('rejects a non-CSV file before uploading it', async () => {
    const user = userEvent.setup({ applyAccept: false });
    show();

    await user.upload(
      screen.getByLabelText('Choose a timetable CSV'),
      new File(['x'], 'timetable.xlsx', { type: 'application/vnd.ms-excel' })
    );

    expect(screen.getByText(/Only \.csv files are supported/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled();
    expect(tutorsApi.previewTimetableImport).not.toHaveBeenCalled();
  });

  it('shows the server explanation when the file is in the wrong format', async () => {
    tutorsApi.previewTimetableImport.mockRejectedValue({
      response: {
        data: {
          error:
            'Unsupported timetable format. The first row must be exactly: day,start_time,end_time,module,location',
        },
      },
    });
    const user = userEvent.setup();
    show();

    await user.upload(screen.getByLabelText('Choose a timetable CSV'), csvFile());
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() =>
      expect(screen.getByText(/Unsupported timetable format/)).toBeInTheDocument()
    );
    expect(screen.queryByRole('button', { name: 'Confirm import' })).not.toBeInTheDocument();
  });
});
