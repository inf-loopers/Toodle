/**
 * @file MarkImportModal.jsx
 * @description Modal for staff to bulk-verify course marks from a CSV class list.
 *
 * Flow: choose a CSV file -> preview matched rows (nothing is written yet) ->
 * confirm -> the selected rows are saved as VERIFIED marks. Unmatched and
 * invalid rows are reported and skipped, and any row can be excluded before
 * committing.
 */

import { useEffect, useState } from 'react';
import { FileUp, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { tutorsApi } from '../api/tutors';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import FormError from './ui/FormError';
import { getApiErrorMessage } from '../utils/apiError';

const TEMPLATE_CSV = 'email,mark\n';

const EXISTING_STATUS_LABELS = {
  PENDING: 'currently pending',
  VERIFIED: 'already verified',
  REJECTED: 'currently rejected',
};

const downloadTemplate = () => {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mark-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
};

export function MarkImportModal({ open, onClose, course, onImported }) {
  const [step, setStep] = useState('select'); // select | preview | done
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [excluded, setExcluded] = useState(() => new Set());
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setStep('select');
      setFile(null);
      setPreview(null);
      setExcluded(new Set());
      setResult(null);
      setBusy(false);
      setError('');
    }
  }, [open]);

  if (!course) return null;

  const rows = preview?.rows ?? [];
  const summary = preview?.summary ?? {};
  const selectable = rows.filter((row) => row.action && !row.issue && !row.unmatchedReason);
  const toImport = selectable.filter((row) => !excluded.has(row.rowNumber)).length;

  const handlePreview = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const data = await tutorsApi.previewMarkImport(course.id, file);
      setPreview(data);
      setStep('preview');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not read the CSV file.'));
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await tutorsApi.commitMarkImport(course.id, file, [...excluded]);
      setResult(data);
      setStep('done');
      await onImported?.();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not import the marks.'));
    } finally {
      setBusy(false);
    }
  };

  const toggleRow = (rowNumber) =>
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });

  const title = step === 'done' ? 'Import complete' : `Import marks for ${course.code}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={title}
      description={
        step === 'done'
          ? 'The selected marks have been saved as verified.'
          : 'Upload a CSV class list (columns: email or student number, and mark). Rows are matched to Toodle users before anything is saved.'
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
              Continue
            </Button>
          )}
          {step === 'preview' && (
            <Button onClick={handleCommit} disabled={toImport === 0} loading={busy}>
              Import {toImport} mark{toImport === 1 ? '' : 's'}
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
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-center hover:border-primary/50">
              <FileUp className="mx-auto h-6 w-6 text-slate-400" />
              <span className="mt-2 block text-sm font-medium text-slate-700">
                {file ? file.name : 'Choose a CSV file'}
              </span>
              <span className="mt-1 block text-xs text-slate-400">
                Only .csv files, up to 2000 rows.
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                aria-label="Choose a CSV file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">{summary.willCreate ?? 0} will be created</Badge>
              <Badge tone="info">{summary.willUpdate ?? 0} will be updated</Badge>
              <Badge tone="warning">{summary.unmatched ?? 0} unmatched</Badge>
              <Badge tone="danger">{summary.invalid ?? 0} invalid</Badge>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-slate-400">No rows were found in this file.</p>
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                {rows.map((row) => {
                  const applicable = Boolean(row.action && !row.issue && !row.unmatchedReason);
                  const reason = row.issue || row.unmatchedReason;
                  const identifier = row.email || row.studentNumber || '—';

                  return (
                    <label
                      key={row.rowNumber}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                        applicable
                          ? 'cursor-pointer border-slate-100 hover:bg-slate-50'
                          : 'border-transparent bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={applicable && !excluded.has(row.rowNumber)}
                        disabled={!applicable}
                        onChange={() => toggleRow(row.rowNumber)}
                        className="h-4 w-4 accent-primary"
                        aria-label={`Include row ${row.rowNumber}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {applicable && row.studentName ? row.studentName : identifier}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {applicable && row.studentName ? identifier : `Row ${row.rowNumber}`}
                          {applicable && row.existingStatus
                            ? ` · ${EXISTING_STATUS_LABELS[row.existingStatus] ?? row.existingStatus}`
                            : ''}
                        </p>
                      </div>
                      {applicable ? (
                        <>
                          <span className="text-sm font-semibold text-slate-800">{row.mark}%</span>
                          <Badge tone={row.action === 'create' ? 'primary' : 'info'}>
                            {row.action === 'create' ? 'New' : 'Update'}
                          </Badge>
                        </>
                      ) : (
                        <span className="flex max-w-[45%] items-center gap-1.5 text-xs text-rose-600">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          {reason}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-slate-400">
              Un-checked rows will be skipped. Unmatched and invalid rows are never imported.
            </p>
          </div>
        )}

        {step === 'done' && result && (
          <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="space-y-1 text-sm text-emerald-800">
              <p className="font-semibold">
                {result.created} created · {result.updated} updated
              </p>
              <p>
                {result.skipped} skipped, {result.unmatched} unmatched, {result.invalid} invalid.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default MarkImportModal;
