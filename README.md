# Toodle — Frontend SPA

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Auth0](https://img.shields.io/badge/Auth0-RBAC-eb5424?logo=auth0)](https://auth0.com/)

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
git clone <repo-url>
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
VITE_AUTH0_CALLBACK_URL=http://localhost:5173
```

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
