# Frontend - Asset Tracking System

React + Vite client for the Asset Tracking System.

## Features

- Login with JWT authentication
- Role-based route protection
- Dashboard, assets, assignments, and my-assets views
- Axios API client with token interceptor and global `401` handling

## Requirements

- Node.js 18+
- npm 9+

## Setup

From this folder (`frontend/`):

```bash
npm install
```

Create `.env` file:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Run in Development

```bash
npm run dev
```

App URL: `http://localhost:5173`

## Build for Production

```bash
npm run build
```

## Preview Production Build

```bash
npm run preview
```

## Scripts

- `npm run dev` - start Vite dev server
- `npm run build` - create production build
- `npm run preview` - preview production build locally
- `npm run lint` - run ESLint

## Authentication Notes

- Access token, refresh token, and user profile are stored in local storage.
- On API `401`, local storage is cleared and user is redirected to `/login`.

## Demo Credentials

These users are created by the backend seed script:

- admin@company.com
- deptadmin@company.com
- employee@company.com
- management@company.com

Default password: `Admin@1234`
