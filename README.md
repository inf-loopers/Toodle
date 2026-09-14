# Toodle — Frontend SPA

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Auth0](https://img.shields.io/badge/Auth0-RBAC-eb5424?logo=auth0)](https://auth0.com/)
[![codecov](https://codecov.io/gh/inf-loopers/Toodle/graph/badge.svg)](https://codecov.io/gh/inf-loopers/Toodle)

> **Toodle Tutor Management & Allocation System**  
> School of Computer Science and Applied Mathematics  
> University of the Witwatersrand (COMS3011A Software Design Project)

---

## 🚀 Overview

`Toodle` is a responsive Single Page Application (SPA) designed to streamline computer science course staffing, tutor availability collection, and real-time constraint validation (minimum grade thresholds, schedule clashes, weekly hour limits).

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite 6](https://vite.dev/)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/) (CSS-first config)
- **Routing**: [React Router v7](https://reactrouter.com/) (Role-based guards)
- **Authentication**: [@auth0/auth0-react](https://auth0.com/) (Universal Login with RBAC)
- **Icons**: [lucide-react](https://lucide.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/) (Bearer token interceptor)
- **Testing**: [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/)

---

## 📦 Project Structure

```
Toodle/
├── public/
│   └── favicon.svg             # Application brand icon
├── src/
│   ├── api/                    # API client and modular endpoint services
│   │   ├── client.js           # Axios instance with Auth0 interceptors
│   │   ├── courses.js          # Course CRUD and sessions
│   │   ├── tutors.js           # Tutor marks and availability
│   │   ├── allocations.js      # Assignment board & constraint checks
│   │   └── users.js            # User management
│   ├── components/
│   │   ├── auth/               # ProtectedRoute, RoleGate, Login/Logout buttons
│   │   ├── layout/             # Navbar, Sidebar, PageLayout, Footer
│   │   └── ui/                 # Accessible primitives (Button, Card, Badge, Modal, Spinner)
│   ├── hooks/                  # Custom hooks (useAuth, useApi)
│   ├── pages/                  # Route views (Dashboard, AllocationBoard, Courses, Tutors, Profile, Login)
│   ├── routes/                 # Central routing configuration (AppRoutes)
│   ├── styles/                 # Global styling & Tailwind v4 theme tokens
│   ├── utils/                  # Constants (roles, constraints) and helper utilities
│   ├── App.jsx                 # Root component with providers
│   └── main.jsx                # Application DOM entry point
├── tests/                      # Unit and integration test suites
│   ├── setup.js                # Testing setup
│   ├── helpers.test.js         # Utilities testing
│   └── ui.test.jsx             # UI components testing
├── .env.example                # Environment variable template
├── eslint.config.js            # ESLint 9 configuration
├── vite.config.js              # Vite configuration
└── package.json
```

---

## ⚙️ Getting Started

### 1. Prerequisites

- **Node.js**: v20+ or v24+
- **npm**: v10+

### 2. Installation

```bash
git clone https://sdp.ms.wits.ac.za/infinite-loopers/Toodle.git
cd Toodle
npm install
```

### 3. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your Auth0 tenant variables in `.env`:

```ini
VITE_API_URL=http://localhost:3000/api/v1
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your_client_id
VITE_AUTH0_AUDIENCE=https://api.toodle.com
```

During `npm run dev`, API requests go through Vite at `/api/v1`. The committed
`.env.development` points the proxy to `http://localhost:3000/api/v1`, overriding
the URL in `.env`. Start the backend in a separate terminal:

```powershell
cd "D:\Toodle App\toodle-api"
npm.cmd run dev
```

To use a deployed backend locally, set `VITE_API_URL` in the ignored
`.env.development.local` file. Restart Vite after changing environment files.
The URL must serve the Express API; a React frontend URL will return HTML for
GET requests and can reject the sign-in POST with 405 Method Not Allowed.

Production builds use `VITE_API_URL` from the deployment environment or
`.env.production`, not `.env.development`. Set it to the deployed backend API
URL, and allow the deployed frontend origin in the backend's `FRONTEND_URL`.

Authentication automatically returns to the current browser origin at `/callback`.
`VITE_AUTH0_CALLBACK_URL` is no longer used, so a deployed URL in an old `.env`
cannot redirect local sign-ins to production.

In Auth0 Application Settings, register each environment (replace the example
deployed origin with your real domain):

| Setting               | Local                            | Deployed example                    |
| --------------------- | -------------------------------- | ----------------------------------- |
| Allowed Callback URLs | `http://localhost:5173/callback` | `https://your-app.example/callback` |
| Allowed Logout URLs   | `http://localhost:5173`          | `https://your-app.example`          |
| Allowed Web Origins   | `http://localhost:5173`          | `https://your-app.example`          |

Add exact entries for any other ports or preview domains you use. The deployed
host must serve the SPA for `/callback`, as it does for other frontend routes.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing & Code Quality

```bash
# Run unit & component tests with Vitest
npm test

# Run Vitest in interactive watch mode
npm run test:watch

# Run ESLint linter
npm run lint

# Format code with Prettier
npm run format

# Production build preview
npm run build
npm run preview
```

---

## 👥 Roles & Permissions

| Role          | Access Permissions                                                          |
| ------------- | --------------------------------------------------------------------------- |
| **ORGANISER** | Full access to Allocation Board, Course Management, Tutor Marks & Directory |
| **TUTOR**     | View assigned courses, manage weekly availability matrix and hour capacity  |
| **STUDENT**   | Browse course directory and tutorial schedules                              |
