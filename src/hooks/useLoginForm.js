/**
 * @file useLoginForm.js
 * @description Custom hook encapsulating all login form state, validation, and
 *              submission logic. Keeps the LoginForm component lean and testable.
 *
 * Responsibilities:
 * - Tracks email and password field values with controlled inputs.
 * - Validates email format (must be a valid email address) and password
 *   (minimum 8 characters). Validation runs on blur and on submit.
 * - Manages password visibility toggle for the password field.
 * - Exposes a `handleSubmit` function that validates and then triggers
 *   the Auth0 `loginWithRedirect` call via the provided callback.
 * - Tracks loading and error states for UI feedback.
 *
 * Usage:
 *   const { email, password, errors, showPassword, isLoading, ...
 *          handleEmailChange, handlePasswordChange, togglePasswordVisibility,
 *          handleSubmit } = useLoginForm(login);
 */

import { useState, useCallback } from 'react';

/**
 * Validates an email address against a standard email regex.
 * @param {string} email - The email string to validate.
 * @returns {boolean} True if the email is valid.
 */
function isValidEmail(email) {
  // Standard email regex — covers typical university email formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates the password meets minimum length requirements.
 * @param {string} password - The password string to validate.
 * @returns {boolean} True if the password is at least 8 characters.
 */
function isValidPassword(password) {
  return password.length >= 8;
}

/**
 * useLoginForm
 *
 * @param {Function} onLogin - Callback invoked with { email, password } on
 *                             successful validation. Typically wraps
 *                             Auth0's loginWithRedirect or loginWithPopup.
 * @returns {object} Form state and handlers.
 */
export function useLoginForm(onLogin) {
  // ── Field state ──────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ── Validation error state (per-field) ───────────────────────────────
  const [errors, setErrors] = useState({ email: '', password: '' });

  // ── UI state ─────────────────────────────────────────────────────────
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ── Field-level validation on blur ───────────────────────────────────

  /**
   * Validates the email field and updates the errors state.
   * Called on blur to give immediate feedback without being intrusive.
   */
  const validateEmail = useCallback((value) => {
    if (!value.trim()) {
      setErrors((prev) => ({ ...prev, email: 'Email address is required.' }));
    } else if (!isValidEmail(value.trim())) {
      setErrors((prev) => ({
        ...prev,
        email: 'Please enter a valid email address.',
      }));
    } else {
      setErrors((prev) => ({ ...prev, email: '' }));
    }
  }, []);

  /**
   * Validates the password field and updates the errors state.
   * Called on blur to give immediate feedback.
   */
  const validatePassword = useCallback((value) => {
    if (!value) {
      setErrors((prev) => ({ ...prev, password: 'Password is required.' }));
    } else if (!isValidPassword(value)) {
      setErrors((prev) => ({
        ...prev,
        password: 'Password must be at least 8 characters.',
      }));
    } else {
      setErrors((prev) => ({ ...prev, password: '' }));
    }
  }, []);

  // ── Change handlers ──────────────────────────────────────────────────

  const handleEmailChange = useCallback(
    (e) => {
      const value = e.target.value;
      setEmail(value);
      // Clear inline error while user is typing
      if (errors.email) {
        setErrors((prev) => ({ ...prev, email: '' }));
      }
      // Clear any lingering submit error
      if (submitError) setSubmitError('');
    },
    [errors.email, submitError],
  );

  const handlePasswordChange = useCallback(
    (e) => {
      const value = e.target.value;
      setPassword(value);
      if (errors.password) {
        setErrors((prev) => ({ ...prev, password: '' }));
      }
      if (submitError) setSubmitError('');
    },
    [errors.password, submitError],
  );

  // ── Password visibility toggle ───────────────────────────────────────

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  // ── Form submission ──────────────────────────────────────────────────

  /**
   * Validates all fields and, if valid, invokes the onLogin callback.
   * Handles loading state and captures any errors thrown during login.
   *
   * @param {Event} e - The form submit event (prevented by default).
   */
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Run full validation
      const emailError = !email.trim()
        ? 'Email address is required.'
        : !isValidEmail(email.trim())
          ? 'Please enter a valid email address.'
          : '';

      const passwordError = !password
        ? 'Password is required.'
        : !isValidPassword(password)
          ? 'Password must be at least 8 characters.'
          : '';

      setErrors({ email: emailError, password: passwordError });

      // Abort if any field is invalid
      if (emailError || passwordError) return;

      setIsLoading(true);
      setSubmitError('');

      try {
        // Delegate to the parent-provided login function (e.g. Auth0 redirect)
        await onLogin({ email: email.trim(), password });
      } catch (err) {
        // Capture any unexpected errors thrown during the login attempt
        setSubmitError(
          err?.message || 'An unexpected error occurred. Please try again.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, onLogin],
  );

  // ── Public API ───────────────────────────────────────────────────────
  return {
    // Field values
    email,
    password,

    // Validation errors
    errors,

    // UI toggles
    showPassword,
    isLoading,
    submitError,

    // Handlers
    handleEmailChange,
    handlePasswordChange,
    handleBlurEmail: () => validateEmail(email),
    handleBlurPassword: () => validatePassword(password),
    togglePasswordVisibility,
    handleSubmit,
  };
}