/**
 * @file LoginHero.jsx
 * @description Left-panel branding section for the login page. Displays the
 *              Toodle logo, headline, descriptive subtitle, and copyright
 *              footer over a university building background photo.
 *
 * Responsibilities:
 * - Renders the Toodle brand identity (GraduationCap icon + name).
 * - Displays the hero headline "Empowering Academic Excellence."
 * - Shows a supporting subtitle explaining the platform's purpose.
 * - Shows the university copyright in the bottom-left corner.
 * - Applies a dark gradient overlay over the background image for
 *   text readability.
 *
 * Usage:
 *   <LoginHero />
 */

import React from 'react';
import { GraduationCap } from 'lucide-react';

/**
 * LoginHero
 *
 * Renders the left branding panel of the login page with university
 * background imagery and platform messaging.
 */
export default function LoginHero() {
  return (
    <section className="relative flex min-h-full flex-col justify-between overflow-hidden bg-slate-900">
      {/*
        Background image — Wits University Great Hall.
        Using a dark overlay to ensure white text remains readable.
      */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://www.wits.ac.za/media/wits-university/about-wits/images/Great%20Hall%20landscape%20Chante%20Schatz.jpg')",
        }}
        aria-hidden="true"
      />

      {/* Dark gradient overlay: navy-to-dark for depth and text contrast */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-950/85 to-slate-900/90"
        aria-hidden="true"
      />

      {/* ── Content (above the overlay) ──────────────────────────────── */}
      <div className="relative z-10 flex flex-col flex-1 px-10 py-12">
        {/* ── Logo & Brand ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5">
          <GraduationCap
            size={24}
            className="text-white"
            strokeWidth={2.2}
          />
          <span className="text-lg font-bold text-white tracking-tight">
            Toodle - Wits Tutor Management
          </span>
        </div>

        {/* ── Headline & Subtitle ──────────────────────────────────── */}
        <div className="mt-auto mb-auto flex flex-col justify-center">
          <h1 className="text-4xl font-extrabold leading-tight text-white lg:text-5xl">
            Empowering Academic Excellence.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-blue-100/80 lg:text-lg">
            Streamlined scheduling, task allocation, and performance tracking
            for the Wits University academic community.
          </p>
        </div>
      </div>

      {/* ── Copyright footer ──────────────────────────────────────────── */}
      <div className="relative z-10 px-10 pb-8">
        <p className="text-xs font-medium tracking-wide text-white/50">
          &copy; {new Date().getFullYear()} UNIVERSITY OF THE WITWATERSRAND
        </p>
      </div>
    </section>
  );
}