import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MarkImportModal from '../src/components/MarkImportModal';
import { tutorsApi } from '../src/api/tutors';

vi.mock('../src/api/tutors', () => ({
  tutorsApi: { previewMarkImport: vi.fn(), commitMarkImport: vi.fn() },
}));

const course = { id: 'c1', code: 'COMS101', name: 'Intro to CS' };

const previewData = {
  course,
  summary: { totalRows: 3, matched: 2, willCreate: 1, willUpdate: 1, unmatched: 1, invalid: 0 },
  rows: [
    {
      rowNumber: 2,
      email: 'alice@wits.ac.za',
      studentNumber: null,
      mark: 72,
      studentName: 'Alice',
      existingStatus: null,
      action: 'create',
      issue: null,
      unmatchedReason: null,
      warnings: [],
    },
    {
      rowNumber: 3,
      email: 'bob@wits.ac.za',
      studentNumber: null,
      mark: 88,
      studentName: 'Bob',
      existingStatus: 'PENDING',
      action: 'update',
      issue: null,
      unmatchedReason: null,
      warnings: [],
    },
    {
      rowNumber: 4,
      email: 'ghost@wits.ac.za',
      studentNumber: null,
      mark: 60,
      studentName: null,
      existingStatus: null,
      action: null,
      issue: null,
      unmatchedReason: 'No user found with this email or student number',
      warnings: [],
    },
  ],
};

const show = (props = {}) =>
  render(
    <MarkImportModal open onClose={vi.fn()} course={course} onImported={vi.fn()} {...props} />
  );

beforeEach(() => {
  vi.resetAllMocks();
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
  globalThis.URL.revokeObjectURL = vi.fn();
});

const uploadCsv = async (user) => {
  await user.upload(
    screen.getByLabelText('Choose a CSV file'),
    new File(['email,mark\nalice@wits.ac.za,72\n'], 'marks.csv', { type: 'text/csv' })
  );
};

describe('MarkImportModal', () => {
  it('starts on the file-selection step with a template link', () => {
    show();

    expect(screen.getByText('Choose a CSV file')).toBeTruthy();
    expect(screen.getByText('Download CSV template')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('previews the CSV and shows the matched rows and summary', async () => {
    const user = userEvent.setup();
    tutorsApi.previewMarkImport.mockResolvedValue(previewData);

    show();
    await uploadCsv(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(tutorsApi.previewMarkImport).toHaveBeenCalledWith('c1', expect.any(File));
    expect(await screen.findByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('1 will be created')).toBeTruthy();
    expect(screen.getByText('1 will be updated')).toBeTruthy();
    expect(screen.getByText('No user found with this email or student number')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import 2 marks' })).toBeEnabled();
  });

  it('sends excluded rows to commit when a row is un-checked', async () => {
    const user = userEvent.setup();
    tutorsApi.previewMarkImport.mockResolvedValue(previewData);
    tutorsApi.commitMarkImport.mockResolvedValue({ created: 1, updated: 0 });

    show();
    await uploadCsv(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.click(await screen.findByLabelText('Include row 3'));
    await user.click(screen.getByRole('button', { name: 'Import 1 mark' }));

    expect(tutorsApi.commitMarkImport).toHaveBeenCalledWith('c1', expect.any(File), [3]);
  });

  it('shows the import result summary after a successful commit', async () => {
    const user = userEvent.setup();
    const onImported = vi.fn();
    tutorsApi.previewMarkImport.mockResolvedValue(previewData);
    tutorsApi.commitMarkImport.mockResolvedValue({
      total: 3,
      created: 1,
      updated: 1,
      skipped: 0,
      unmatched: 1,
      invalid: 0,
    });

    show({ onImported });
    await uploadCsv(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Import 2 marks' }));

    expect(await screen.findByText('Import complete')).toBeTruthy();
    expect(screen.getByText('1 created · 1 updated')).toBeTruthy();
    expect(onImported).toHaveBeenCalled();
  });

  it('shows the server error when preview fails', async () => {
    const user = userEvent.setup();
    tutorsApi.previewMarkImport.mockRejectedValue({
      response: { data: { error: 'The CSV must include a "Mark" column.' } },
    });

    show();
    await uploadCsv(user);
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The CSV must include a "Mark" column.'
    );
    expect(tutorsApi.commitMarkImport).not.toHaveBeenCalled();
  });
});
