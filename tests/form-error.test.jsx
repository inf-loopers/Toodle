/**
 * @file form-error.test.jsx
 * @description The shared API-failure presentation: the FormError alert (message
 * plus a next action) and the getApiErrorMessage unwrapping precedence.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FormError from '../src/components/ui/FormError';
import { getApiErrorMessage } from '../src/utils/apiError';

describe('FormError', () => {
  it('renders nothing when there is no message', () => {
    const { container } = render(<FormError message="" />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces the failure together with a clear next action', () => {
    render(<FormError message="Budget cannot be negative." />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Budget cannot be negative.');
    expect(alert).toHaveTextContent(/try again/i);
  });

  it('accepts a custom next action and can omit it', () => {
    const { rerender } = render(
      <FormError message="Could not load entries." hint="Close and reopen the dialog." />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Close and reopen the dialog.');

    rerender(<FormError message="Could not load entries." hint={null} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load entries.');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/try again/i);
  });
});

describe('getApiErrorMessage', () => {
  it('prefers the API error envelope, then message, then the Error text', () => {
    expect(
      getApiErrorMessage(
        { response: { data: { error: 'Allocation clashes with another session' } } },
        'Fallback'
      )
    ).toBe('Allocation clashes with another session');

    expect(
      getApiErrorMessage({ response: { data: { message: 'Server says no' } } }, 'Fallback')
    ).toBe('Server says no');

    expect(getApiErrorMessage(new Error('Network Error'), 'Fallback')).toBe('Network Error');
  });

  it('always falls back to an actionable message so an alert is never blank', () => {
    expect(getApiErrorMessage({}, 'Could not save the mark.')).toBe('Could not save the mark.');
    expect(getApiErrorMessage(null)).toMatch(/try again/i);
    expect(getApiErrorMessage({ response: { data: { error: '' } } }, 'Fallback')).toBe('Fallback');
  });

  it('expands a generic validation failure with the first field detail', () => {
    const err = {
      response: {
        data: {
          error: 'Validation failed',
          details: [
            { field: 'mark', message: 'Expected number, received string' },
            { field: 'courseId', message: 'Required' },
          ],
        },
      },
    };

    expect(getApiErrorMessage(err)).toBe('Validation failed: Expected number, received string');
  });
});
