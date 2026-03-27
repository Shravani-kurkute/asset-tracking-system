# Backend - Asset Tracking System

FastAPI backend for the Asset Tracking System.

## Tech Stack

- FastAPI
- SQLAlchemy
- MySQL (PyMySQL driver)
- JWT authentication
- Pydantic settings via `.env`

## Requirements

- Python 3.10+
- MySQL 8+

## Setup

From this folder (`backend/`):

```bash
python -m venv .venv
```

Activate the environment:

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

Create `.env`:

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

## Run API

```bash
python run.py
```

API URL: `http://localhost:8000`

## API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Seed Demo Users

```bash
python seed_users.py
```

Default password for seeded users: `Admin@1234`

Users seeded:

- admin@company.com (system_admin)
- deptadmin@company.com (dept_admin)
- employee@company.com (employee)
- management@company.com (management)

## Utility Scripts

- `python seed_users.py` - create/update demo users
- `python reset_admin.py` - reset password for `admin@company.com`

## Health Endpoints

- `GET /health`
- `GET /api/v1/health`
