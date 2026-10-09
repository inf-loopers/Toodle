/**
 * @file TimetableImportModal.jsx
 * @description Lets a tutor turn their class timetable into availability (C03).
 *
 * Flow: choose a CSV file -> preview (nothing is saved yet) -> confirm -> the
 * server replaces the tutor's availability. Classes are busy time, so the
 * preview shows them separately from the free time that will be saved.
 * Saving is blocked while the file has invalid rows or would make the tutor
 * miss a session of an active allocation.
 *
 * Endpoint Connections:
 * - `POST /tutors/:id/timetable/import/preview`
 * - `POST /tutors/:id/timetable/import/commit`
 */

import { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Download, FileUp } from 'lucide-react';

import { tutorsApi } from '../../api/tutors';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatDay } from '../../utils/helpers';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import FormError from '../ui/FormError';

export const TIMETABLE_TEMPLATE_CSV =
  'day,start_time,end_time,module,location\n' +
  'Monday,08:00,10:00,CS101,CBG01\n' +
  'Tuesday,13:00,15:00,MATH101,WC01\n' +
  'Wednesday,10:00,12:00,CS201,CBG02\n';

const WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const downloadTemplate = () => {
  const blob = new Blob([TIMETABLE_TEMPLATE_CSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'timetable-template.csv';
  link.click();
  URL.revokeObjectURL(url);
};

const isCsvFile = (file) => /\.csv$/i.test(file?.name ?? '');

/** Slots grouped by day, in week order, for a compact before/after summary. */
const byDay = (slots = []) =>
  WEEK.map((day) => ({
    day,
    windows: slots
      .filter((slot) => slot.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((slot) => `${slot.startTime}–${slot.endTime}`),
  })).filter((entry) => entry.windows.length > 0);

function SlotSummary({ title, slots, emptyText }) {
  const days = byDay(slots);
  return (
    <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      {days.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">{emptyText}</p>
      ) : (
        <dl className="mt-2 space-y-1 text-sm">
          {days.map(({ day, windows }) => (
            <div key={day} className="flex flex-col sm:flex-row sm:gap-2">
              <dt className="shrink-0 font-medium sm:w-24 text-slate-700 dark:text-slate-200">
                {formatDay(day)}
              </dt>
              <dd className="break-words text-slate-600 dark:text-slate-300">{windows.join(', ')}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function TimetableImportModal({ open, onClose, tutorId, onImported }) {
  const [step, setStep] = useState('select'); // select | preview | done
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setStep('select');
      setFile(null);
      setPreview(null);
      setResult(null);
      setBusy(false);
      setError('');
    }
  }, [open]);

  const chooseFile = (chosen) => {
    setError('');
    if (chosen && !isCsvFile(chosen)) {
      setFile(null);
      setError('Only .csv files are supported. Export your timetable as CSV and try again.');
      return;
    }
    setFile(chosen ?? null);
  };

  const handlePreview = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const response = await tutorsApi.previewTimetableImport(tutorId, file);
      setPreview(response?.data ?? response);
      setStep('preview');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not read the timetable file.'));
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await tutorsApi.commitTimetableImport(tutorId, file);
      setResult(response?.data ?? response);
      setStep('done');
      await onImported?.();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not import the timetable.'));
    } finally {
      setBusy(false);
    }
  };

  const rows = preview?.rows ?? [];
  const invalidRows = rows.filter((row) => row.issue);
  const clashes = preview?.clashes ?? [];
  const duplicates = preview?.duplicates ?? [];
  const affected = preview?.affectedAllocations ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={step === 'done' ? 'Timetable imported' : 'Import your timetable'}
      description={
        step === 'done'
          ? 'Your availability now reflects the free time around your classes.'
          : 'Upload your class timetable as a CSV. Your classes are treated as busy time; the free time around them (08:00–17:00, Monday to Friday) becomes your availability.'
      }
      footer={
        <>
          {step !== 'done' && (
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
          )}
          {step === 'select' && (
            <Button onClick={handlePreview} disabled={!file} loading={busy}>
              Preview
            </Button>
          )}
          {step === 'preview' && (
            <Button onClick={handleCommit} disabled={!preview?.canImport} loading={busy}>
              Confirm import
            </Button>
          )}
          {step === 'done' && <Button onClick={onClose}>Close</Button>}
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />

        {step === 'select' && (
          <div className="space-y-4">
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 px-4 py-6 text-center sm:py-8 hover:border-primary/50">
              <FileUp className="mx-auto h-6 w-6 text-slate-400" />
              <span className="mt-2 block break-all text-sm font-medium text-slate-700 dark:text-slate-200">
                {file ? file.name : 'Choose a timetable CSV'}
              </span>
              <span className="mt-1 block text-xs text-slate-400">
                Columns: day, start_time, end_time, module, location
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                aria-label="Choose a timetable CSV"
                onChange={(e) => chooseFile(e.target.files?.[0])}
              />
            </label>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Download className="h-3.5 w-3.5" /> Download CSV template
            </button>
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">{preview.summary?.valid ?? 0} classes</Badge>
              {invalidRows.length > 0 && <Badge tone="danger">{invalidRows.length} invalid</Badge>}
              {clashes.length > 0 && <Badge tone="warning">{clashes.length} clash(es)</Badge>}
              {duplicates.length > 0 && (
                <Badge tone="warning">{duplicates.length} duplicate(s)</Badge>
              )}
            </div>

            <div className="max-h-56 overflow-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500 dark:bg-slate-900">
                  <tr>
                    <th className="px-3 py-2 font-medium">Row</th>
                    <th className="px-3 py-2 font-medium">Day</th>
                    <th className="px-3 py-2 font-medium">Time</th>
                    <th className="px-3 py-2 font-medium">Module</th>
                    <th className="px-3 py-2 font-medium">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className="border-t border-slate-100 dark:border-slate-800"
                    >
                      <td className="px-3 py-2 text-slate-400">{row.rowNumber}</td>
                      {row.issue ? (
                        <td colSpan={4} className="px-3 py-2 text-rose-600">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {row.issue}
                          </span>
                        </td>
                      ) : (
                        <>
                          <td className="px-3 py-2">{formatDay(row.dayOfWeek)}</td>
                          <td className="whitespace-nowrap px-3 py-2">
                            {row.startTime}–{row.endTime}
                          </td>
                          <td className="px-3 py-2">{row.module}</td>
                          <td className="px-3 py-2 text-slate-500">{row.location}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidRows.length > 0 && (
              <p className="text-sm text-rose-600">
                Nothing can be imported until every row is valid. Fix the rows above and upload the
                file again.
              </p>
            )}

            {(clashes.length > 0 || duplicates.length > 0) && (
              <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <ul className="space-y-1">
                  {clashes.map((clash) => (
                    <li key={clash.rowNumbers.join('-')}>
                      {clash.modules.join(' and ')} overlap on {formatDay(clash.dayOfWeek)} (rows{' '}
                      {clash.rowNumbers.join(' and ')}).
                    </li>
                  ))}
                  {duplicates.map((duplicate) => (
                    <li key={duplicate.rowNumber}>
                      Row {duplicate.rowNumber} repeats row {duplicate.duplicateOf}.
                    </li>
                  ))}
                  <li>You will be treated as busy for all of these times.</li>
                </ul>
              </div>
            )}

            {affected.length > 0 && (
              <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                <p className="font-semibold">
                  This timetable conflicts with sessions you are allocated to:
                </p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {affected.map((item) => (
                    <li key={item.allocationId}>
                      {item.course?.code ?? 'A course'}: {item.reasons.join('; ')}
                    </li>
                  ))}
                </ul>
                <p className="mt-2">
                  Ask your course coordinator to reassign those sessions before importing.
                </p>
              </div>
            )}

            {invalidRows.length === 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <SlotSummary
                  title="Current availability"
                  slots={preview.currentSlots}
                  emptyText="No availability saved yet."
                />
                <SlotSummary
                  title="Availability after import"
                  slots={preview.proposedSlots}
                  emptyText="No free time left in school hours."
                />
              </div>
            )}

            {preview.keptSlots?.length > 0 && (
              <p className="text-xs text-slate-500">
                Availability outside school hours (evenings and weekends) is kept as it is.
              </p>
            )}
          </div>
        )}

        {step === 'done' && result && (
          <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm text-emerald-800">
              Imported {result.importedClasses} class{result.importedClasses === 1 ? '' : 'es'}. You
              can still fine-tune your availability below.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default TimetableImportModal;
