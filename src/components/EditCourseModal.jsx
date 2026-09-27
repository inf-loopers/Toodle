/**
 * @file EditCourseModal.jsx
 * @description Modal allowing staff to edit course configurations, requirements, and budget.
 */

import { useState, useEffect } from 'react';
import { coursesApi } from '../api/courses';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Textarea, Select } from './ui/Input';

export function EditCourseModal({ open, onClose, course, onUpdated }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    year: new Date().getFullYear(),
    semester: 1,
    requiredTutors: 1,
    minMarkRequired: 50,
    budget: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (course && open) {
      setForm({
        name: course.name || '',
        description: course.description || '',
        year: course.year || new Date().getFullYear(),
        semester: course.semester || 1,
        requiredTutors: course.requiredTutors ?? 1,
        minMarkRequired: course.minMarkRequired ?? 50,
        budget:
          course.budget?.amount !== undefined && course.budget?.amount !== null
            ? Number(course.budget.amount)
            : '',
      });
      setError('');
    }
  }, [course, open]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Course name is required.');
      return;
    }

    const minMark = Number(form.minMarkRequired);
    if (isNaN(minMark) || minMark < 0 || minMark > 100) {
      setError('Minimum mark must be between 0% and 100%.');
      return;
    }

    const tutors = Number(form.requiredTutors);
    if (isNaN(tutors) || tutors < 0) {
      setError('Tutors needed must be 0 or more.');
      return;
    }

    if (form.budget !== '' && form.budget !== null && form.budget !== undefined) {
      const b = Number(form.budget);
      if (isNaN(b) || b < 0) {
        setError('Budget cannot be negative.');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description ? form.description.trim() : '',
        year: Number(form.year),
        semester: Number(form.semester),
        requiredTutors: tutors,
        minMarkRequired: minMark,
      };

      if (form.budget !== '' && form.budget !== null && form.budget !== undefined) {
        payload.budget = Number(form.budget);
      } else if (course?.budget) {
        payload.budget = null;
      }

      await coursesApi.updateCourse(course.id, payload);
      await onUpdated?.();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err.message ||
          'Could not update course settings.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${course?.code || 'course'}`}
      description="Update course details, minimum prerequisite mark, staffing quotas and budget."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p role="alert" className="text-xs font-medium text-rose-600">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Course code" value={course?.code || ''} disabled readOnly />
          <Input label="Year" type="number" value={form.year} onChange={update('year')} />
        </div>

        <Input
          label="Course name"
          placeholder="e.g. Computer Graphics"
          value={form.name}
          onChange={update('name')}
        />

        <Textarea
          label="Description"
          placeholder="Course overview and objectives..."
          value={form.description}
          onChange={update('description')}
        />

        <div className="grid grid-cols-3 gap-4">
          <Select label="Semester" value={form.semester} onChange={update('semester')}>
            <option value={1}>Semester 1</option>
            <option value={2}>Semester 2</option>
          </Select>

          <Input
            label="Tutors needed"
            type="number"
            min={0}
            value={form.requiredTutors}
            onChange={update('requiredTutors')}
          />

          <Input
            label="Min. mark %"
            type="number"
            min={0}
            max={100}
            value={form.minMarkRequired}
            onChange={update('minMarkRequired')}
          />
        </div>

        <Input
          label="Course budget (R)"
          type="number"
          min={0}
          step="any"
          placeholder="Optional total budget, e.g. 50000"
          value={form.budget}
          onChange={update('budget')}
          hint="Leave blank to remove or keep unassigned."
        />
      </div>
    </Modal>
  );
}

export default EditCourseModal;
