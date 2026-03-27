# Asset Tracking System

Full-stack asset management platform with role-based access for admins and employees.

## Tech Stack

- Backend: FastAPI, SQLAlchemy, MySQL, JWT authentication
- Frontend: React + Vite, Tailwind CSS, Axios, React Router

## Project Structure

```text
asset-tracking-system/
|- backend/   # FastAPI API + database models + auth
|- frontend/  # React client application
```

## Features

- JWT login with role-based access control
- Asset lifecycle management (create, update, delete, list)
- Asset assignment and assignment history
- Role-aware dashboards and protected routes
- Health checks for app and database

## Roles

- `system_admin`
- `dept_admin`
- `employee`
- `management`

## Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL 8+

## Quick Start (Local)

### 1. Clone the Repository

```bash
git clone https://github.com/Shravani-kurkute/asset-tracking-system.git
cd asset-tracking-system
```

### 2. Setup Backend

```bash
cd backend
python -m venv .venv
```

Activate virtual environment:

- Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

- macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `backend/.env` file:

```env
APP_NAME=Asset Tracking System
APP_VERSION=1.0.0
DEBUG=True

SECRET_KEY=replace_with_a_long_random_secret

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=asset_tracking

JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

FRONTEND_URL=http://localhost:5173
```

Create MySQL database:

```sql
CREATE DATABASE asset_tracking;
```

Seed demo users:

```bash
python seed_users.py
```

Run backend API:

```bash
python run.py
```

Backend will run at `http://localhost:8000`

- Swagger docs: `http://localhost:8000/docs`
- API health: `http://localhost:8000/api/v1/health`

### 3. Setup Frontend

Open a new terminal at project root:

```bash
cd frontend
npm install
```

Create `frontend/.env` file:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Run frontend:

```bash
npm run dev
```

Frontend will run at `http://localhost:5173`

## Demo Login Accounts

Default password for all seeded users: `Admin@1234`

- admin@company.com (System Admin)
- deptadmin@company.com (Department Admin)
- employee@company.com (Employee)
- management@company.com (Management)

## Useful Commands

From `backend/`:

```bash
python seed_users.py
python reset_admin.py
python run.py
```

From `frontend/`:

```bash
npm run dev
npm run build
npm run preview
```

## API Base URL

- Local backend base URL: `http://localhost:8000/api/v1`

## Deployment

Recommended production setup:

- Frontend: Vercel
- Backend: Render
- Database: hosted MySQL provider

### 1. Deploy Backend on Render

- Create a new Web Service from this GitHub repository.
- Render will detect `render.yaml`.
- Service root: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Set these environment variables in Render:

```env
SECRET_KEY=replace_with_a_long_random_secret
DATABASE_URL=mysql+pymysql://user:password@host:3306/asset_tracking_db
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
FRONTEND_URL=https://your-frontend-domain.vercel.app
CORS_ORIGINS=https://your-frontend-domain.vercel.app
```

After deploy, your backend URL will look like:

```text
https://your-render-service.onrender.com/api/v1
```

### 2. Deploy Frontend on Vercel

- Import the same GitHub repository into Vercel.
- Set the project root directory to `frontend`.
- Vercel will use `frontend/vercel.json` so React Router routes work after refresh.

Set this environment variable in Vercel:

```env
VITE_API_URL=https://your-render-service.onrender.com/api/v1
```

### 3. Production Database

- Use a hosted MySQL database and pass its connection string as `DATABASE_URL`.
- The backend still supports individual `DB_*` variables, but `DATABASE_URL` is the easiest production option.

### 4. Important Notes

- GitHub Pages alone is not enough for the full project because it can host only the frontend, not FastAPI or MySQL.
- Use HTTPS URLs in production for both frontend and backend.
- Update `CORS_ORIGINS` whenever your frontend production domain changes.

## Troubleshooting

- `401 Unauthorized` on frontend:
	- Log in again to refresh tokens in browser local storage.
- Database connection errors:
	- Verify MySQL is running and `.env` DB values are correct.
- CORS issues:
	- Ensure `FRONTEND_URL` in `backend/.env` matches your frontend URL.

## License

This project is for educational and portfolio use.
