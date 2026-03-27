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

## Troubleshooting

- `401 Unauthorized` on frontend:
	- Log in again to refresh tokens in browser local storage.
- Database connection errors:
	- Verify MySQL is running and `.env` DB values are correct.
- CORS issues:
	- Ensure `FRONTEND_URL` in `backend/.env` matches your frontend URL.

## License

This project is for educational and portfolio use.