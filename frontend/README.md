# Smart City Dashboard Frontend

This folder contains the React frontend for the Smart City Dashboard. It is built with:

- React
- TypeScript
- Vite

The app connects to the Flask backend and provides:

- citizen registration and login
- admin login
- role-based dashboard access
- citizen carbon and energy prediction forms
- city-level aggregate forecasting
- admin user management view
- admin announcement publishing
- citizen announcement viewing

## Folder Structure

```text
frontend/
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── README.md
└── src/
    ├── api/
    ├── auth/
    ├── features/
    ├── lib/
    ├── styles/
    ├── types/
    ├── utils/
    ├── App.tsx
    └── main.tsx
```

## Features

### Public experience

- modern landing page
- citizen registration form
- citizen/admin login form

### Citizen dashboard

- overview cards with city sustainability summary
- personal prediction form
- city forecast form for multiple citizens
- announcements list
- dataset and model metadata

### Admin dashboard

- all citizen features
- registered user list
- announcement publishing form

## Backend Connection

The frontend expects the Flask backend at:

`http://127.0.0.1:5000/api/v1`

You can override this with an environment variable:

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:5000/api/v1"
```

## Install and Run

From the `frontend` folder:

```powershell
npm install
npm run dev
```

The Vite development server runs by default at:

`http://127.0.0.1:5173`

## Build for Production

```powershell
npm run build
npm run preview
```

## Authentication

The frontend stores the signed access token in local storage and sends it as a bearer token on protected requests.

For initial admin access, the backend currently creates this default admin unless you override it in backend environment variables:

- Email: `admin@smartcity.local`
- Password: `Admin@123`

## Notes

- The UI is intentionally structured with a small number of reusable modules so it stays easy to extend.
- The dashboard is responsive for desktop and mobile layouts.
- The app uses native `fetch` instead of extra state libraries to keep the codebase straightforward.
