import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Moon, Sun } from 'lucide-react';

import AppLogo from '../ui/AppLogo';
import { useAuth } from '../../hooks/useAuth';

const THEME_STORAGE_KEY = 'toodle.theme';

function getInitialTheme() {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export default function LandingNavbar() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getInitialTheme);

  const isDark = theme === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = theme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage may be unavailable in some browser contexts.
    }
  }, [theme, isDark]);

  const handleThemeToggle = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleLogin = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login', { state: { from: '/dashboard' } });
    }
  };

  return (
    <header className="shrink-0 w-full border-b border-slate-100 bg-white transition-colors dark:border-slate-800 dark:bg-[#000000]">
      <nav className="mx-auto flex h-16 max-w-7xl items-center px-6 md:px-10">
        {/* LOGO */}
        <a href="/" className="flex items-center">
          <AppLogo className="h-12 w-12 object-contain" />
        </a>

        {/* NAVIGATION */}
        <div className="ml-auto mr-auto hidden items-center gap-10 text-sm font-medium text-slate-600 md:flex dark:text-slate-300">
          <a
            href="/"
            className="relative text-[#0b3b70] transition hover:text-[#0b3b70] dark:text-white dark:hover:text-white"
          >
            Home
            <span className="absolute -bottom-2 left-0 h-0.5 w-full rounded-full bg-[#f6b81a]" />
          </a>

          <a href="#features" className="transition hover:text-[#0b3b70] dark:hover:text-white">
            Features
          </a>

          <a href="#how-it-works" className="transition hover:text-[#0b3b70] dark:hover:text-white">
            How it works
          </a>

          <a href="#about" className="transition hover:text-[#0b3b70] dark:hover:text-white">
            About
          </a>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">
          {/* THEME TOGGLE */}
          <button
            type="button"
            onClick={handleThemeToggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b3b70] text-white transition hover:bg-[#092f59] dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            {isDark ? <Sun size={19} strokeWidth={2.2} /> : <Moon size={19} strokeWidth={2.2} />}
          </button>

          {/* LOGIN */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0b3b70] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#092f59] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#f6b81a] dark:text-[#07111f] dark:hover:bg-[#ffd35a]"
          >
            Login
            <ArrowRight size={15} />
          </button>
        </div>
      </nav>
    </header>
  );
}
