# SPEC_03 — Frontend Foundation Setup

## Objective

Create the complete frontend foundation for PCDC using React, TypeScript, Vite, Tailwind CSS, React Router, Axios, and Lucide React.

This feature only covers frontend setup and architecture.

Do NOT implement business features yet.

No dashboards.
No case study screens.
No mentor pages.
No faculty workflows.

Only establish the frontend structure required for future development.

---

## Project Context

Read these files before making changes:

1. `context/project-overview.md`
2. `context/coding-standards.md`
3. `context/ai-interaction.md`

Follow all rules defined there.

---

## Tech Stack

Frontend stack:

* React
* TypeScript
* Vite
* React Router DOM
* Axios
* Tailwind CSS
* Lucide React Icons

Use `.tsx` for React components.

Use `.ts` for API files, types, utilities, and hooks.

Do NOT use plain JavaScript for frontend files.

---

## Setup Command

Create the frontend app inside the existing `/frontend` directory.

Use:

```bash
npm create vite@latest frontend -- --template react-ts
```

If `/frontend` already exists and is not empty, do not delete anything without confirmation. Instead, explain the issue and ask for approval.

---

## Dependencies

Install:

```bash
npm install react-router-dom axios lucide-react
```

Install Tailwind CSS using the latest Vite-compatible setup.

Configure:

* `tailwind.config.js`
* `postcss.config.js`
* `src/index.css`

---

## Environment Variables

Create:

```text
frontend/.env
```

Add:

```env
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

---

## Directory Structure

Create this structure:

```text
frontend/
└── src/
    ├── api/
    │   └── axios.ts
    │
    ├── components/
    │   ├── common/
    │   ├── layout/
    │   └── ui/
    │
    ├── context/
    │   └── AuthContext.tsx
    │
    ├── hooks/
    │
    ├── layouts/
    │   ├── AuthLayout.tsx
    │   └── DashboardLayout.tsx
    │
    ├── pages/
    │   ├── auth/
    │   │   ├── Login.tsx
    │   │   └── Register.tsx
    │   │
    │   ├── student/
    │   ├── faculty/
    │   ├── mentor/
    │   └── admin/
    │
    ├── router/
    │   └── AppRouter.tsx
    │
    ├── types/
    │   ├── auth.ts
    │   └── user.ts
    │
    ├── utils/
    │
    ├── App.tsx
    ├── main.tsx
    └── index.css
```

---

## Type Definitions

Create:

```text
src/types/user.ts
```

Add:

```ts
export type UserRole =
  | "student"
  | "faculty"
  | "mentor"
  | "program_head"
  | "director"
  | "admin"

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
}
```

Create:

```text
src/types/auth.ts
```

Add:

```ts
import type { User } from "./user"

export interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}
```

---

## Axios Setup

Create:

```text
src/api/axios.ts
```

Requirements:

* Base URL from `VITE_API_URL`
* Automatically attach JWT token
* Token key:

```text
pcdc_token
```

Authorization header:

```text
Bearer {token}
```

Example implementation:

```ts
import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1",
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pcdc_token")

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api
```

---

## Authentication Context

Create:

```text
src/context/AuthContext.tsx
```

Requirements:

* Provide `user`
* Provide `token`
* Provide `isAuthenticated`
* Provide `login(email, password)`
* Provide `logout()`
* Store token in localStorage under key `pcdc_token`
* Use mock login only
* Do NOT call backend APIs yet

Mock login behavior:

* Accept any email/password
* Store fake token
* Set mock user role as `student`

---

## Routing

Create:

```text
src/router/AppRouter.tsx
```

Routes:

```text
/login
/register
```

Unknown routes should redirect to:

```text
/login
```

Use `BrowserRouter`, `Routes`, `Route`, and `Navigate`.

---

## Layouts

### AuthLayout.tsx

Create centered authentication layout.

Requirements:

* Full-screen background
* Centered card
* Accept `children` prop typed as `ReactNode`

---

### DashboardLayout.tsx

Create placeholder dashboard layout.

Requirements:

* Sidebar placeholder
* Header placeholder
* Main content area
* Accept `children` prop typed as `ReactNode`

No business functionality.

---

## Pages

### Login.tsx

Fields:

* Email
* Password

Button:

```text
Login
```

Requirements:

* Use `useState`
* Use AuthContext login
* Mock submit only
* Show loading state
* Show basic error message if mock submit fails

No API integration yet.

---

### Register.tsx

Fields:

* Name
* Email
* Password

Button:

```text
Register
```

Requirements:

* Use `useState`
* Mock submit only
* Show loading state
* No API integration yet

---

## App.tsx

Render:

```tsx
import AppRouter from "./router/AppRouter"

export default function App() {
  return <AppRouter />
}
```

---

## Styling Rules

Use Tailwind CSS only.

Do NOT use:

* Bootstrap
* Material UI
* Chakra UI
* Inline styles

---

## TypeScript Rules

* No `any` unless absolutely unavoidable
* Prefer explicit interfaces for props
* Use `ReactNode` for children props
* Use `import type` for type-only imports
* Do not suppress TypeScript errors
* Do not add `// @ts-ignore`
* Do not add `// eslint-disable` unless explicitly required and explained

---

## Definition Of Done

* React TypeScript app runs successfully
* Tailwind CSS works
* Router works
* `/login` page loads
* `/register` page loads
* Axios instance created
* AuthContext created
* AuthLayout created
* DashboardLayout created
* TypeScript build passes
* No browser console errors
* `npm run dev` starts successfully

---

## Verification Commands

Run:

```bash
npm install
npm run dev
```

Also run:

```bash
npm run build
```

Fix all TypeScript/build errors before reporting completion.

---

## Restrictions

Do not:

* Implement case studies
* Implement dashboards
* Implement AI chat
* Implement mentor screens
* Implement faculty screens
* Implement admin screens
* Connect login/register to backend APIs
* Add Zustand, Redux, TanStack Query, React Hook Form, or Zod yet

Only create the frontend architecture and foundation.
