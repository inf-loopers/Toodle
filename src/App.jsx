/**
 * @file App.jsx
 * @description Root application component.
 *
 * Responsibilities:
 * - Wraps the application inside Auth0's `<Auth0Provider>` configured with environment variables.
 * - Renders the base welcome screen confirming successful frontend initialization and tech stack readiness.
 */

import { Auth0Provider } from '@auth0/auth0-react';
import { Layers, ShieldCheck, Cpu, Code2, Server, CheckCircle2 } from 'lucide-react';

const domain = import.meta.env.VITE_AUTH0_DOMAIN || '';
const audience = import.meta.env.VITE_AUTH0_AUDIENCE || '';
const redirectUri = import.meta.env.VITE_AUTH0_CALLBACK_URL || window.location.origin;

function WelcomeScreen() {
  const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

  const techStack = [
    { name: 'React 19', desc: 'UI Framework', icon: Code2 },
    { name: 'Vite 6', desc: 'Build & Dev Server', icon: Cpu },
    { name: 'TailwindCSS v4', desc: 'Utility-first Styling', icon: Layers },
    { name: 'Auth0 SDK', desc: 'Authentication & RBAC', icon: ShieldCheck },
    { name: 'Axios Client', desc: 'REST API Integration', icon: Server },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6 sm:p-12 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto w-full space-y-8 my-auto">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#003B73] text-white font-extrabold text-3xl shadow-lg ring-4 ring-blue-100">
            T
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Toodle
          </h1>
          <p className="text-sm font-semibold text-[#003B73] uppercase tracking-widest">
            Tutor Management System • SDP (COMS3011A)
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Frontend Base Project Initialized Successfully</span>
          </div>
        </div>

        {/* Project Core Setup Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Core Tech Stack & Configurations
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              All dependencies, API service modules, hooks, utilities, and styling have been configured and verified.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {techStack.map((tech) => {
              const Icon = tech.icon;
              return (
                <div
                  key={tech.name}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-blue-100 text-[#003B73] shrink-0 mt-0.5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">{tech.name}</h3>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{tech.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Directory Ready Info */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Directory Structure for Team Members
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-600">
              <div className="p-2 rounded bg-slate-100">
                <span className="text-blue-700 font-bold">src/api/</span> — API endpoints & Axios client
              </div>
              <div className="p-2 rounded bg-slate-100">
                <span className="text-blue-700 font-bold">src/hooks/</span> — useAuth & useApi hooks
              </div>
              <div className="p-2 rounded bg-slate-100">
                <span className="text-blue-700 font-bold">src/utils/</span> — constants & helper utilities
              </div>
              <div className="p-2 rounded bg-slate-100">
                <span className="text-blue-700 font-bold">src/pages/</span> — route views
              </div>
              <div className="p-2 rounded bg-slate-100">
                <span className="text-blue-700 font-bold">src/components/</span> — UI components & layout
              </div>
              <div className="p-2 rounded bg-slate-100">
                <span className="text-blue-700 font-bold">src/routes/</span> — navigation definitions
              </div>
            </div>
          </div>

          {/* Active Env Variables */}
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700">Active Environment:</div>
            <div className="font-mono text-[11px] bg-slate-900 text-slate-200 p-3 rounded-lg overflow-x-auto space-y-1">
              <div>API URL: {envApiUrl}</div>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 mt-8">
        Toodle 2026 • v0.0.1
      </footer>
    </div>
  );
}

export default function App() {
  const authorizationParams = {
    redirect_uri: redirectUri,
    ...(audience && audience !== 'https://api.toodle.com' ? { audience } : {}),
  };

  return (
    <Auth0Provider
      domain={domain || 'toodle-dev.uk.auth0.com'}
      authorizationParams={authorizationParams}
      cacheLocation="localstorage"
    >
      <WelcomeScreen />
    </Auth0Provider>
  );
}
