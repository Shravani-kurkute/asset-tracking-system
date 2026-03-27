"""Utility script that seeds the database with demo and admin users."""

import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.models.user import User, UserRole


SEED_USERS = [
    {
        "employee_id": "EMP001",
        "full_name": "System Admin",
        "email": "admin@company.com",
        "password": "Admin@1234",
        "role": UserRole.system_admin,
        "department": "IT",
    },
    {
        "employee_id": "EMP002",
        "full_name": "Department Admin",
        "email": "deptadmin@company.com",
        "password": "Admin@1234",
        "role": UserRole.dept_admin,
        "department": "Operations",
    },
    {
        "employee_id": "EMP003",
        "full_name": "Test Employee",
        "email": "employee@company.com",
        "password": "Admin@1234",
        "role": UserRole.employee,
        "department": "Engineering",
    },
    {
        "employee_id": "EMP004",
        "full_name": "Management User",
        "email": "management@company.com",
        "password": "Admin@1234",
        "role": UserRole.management,
        "department": "Management",
    },
]


def seed():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    created = 0
    updated = 0

    try:
        for seed_user in SEED_USERS:
            normalized_email = seed_user["email"].strip().lower()
            normalized_employee_id = seed_user["employee_id"].strip().upper()

            existing = (
                db.query(User)
                .filter(User.employee_id == normalized_employee_id)
                .first()
            )

            if existing:
                existing.full_name = seed_user["full_name"]
                existing.email = normalized_email
                existing.hashed_password = hash_password(seed_user["password"])
                existing.role = seed_user["role"]
                existing.department = seed_user["department"]
                existing.is_active = True
                print(f"UPDATE {normalized_email} -> role: {seed_user['role'].value}")
                updated += 1
                continue

            db.add(
                User(
                    employee_id=normalized_employee_id,
                    full_name=seed_user["full_name"],
                    email=normalized_email,
                    hashed_password=hash_password(seed_user["password"]),
                    role=seed_user["role"],
                    department=seed_user["department"],
                    is_active=True,
                )
            )
            print(f"CREATE {normalized_email} -> role: {seed_user['role'].value}")
            created += 1

        db.commit()
        print(f"\nDone! Created: {created} | Updated: {updated}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("\nSeeding predefined users...\n")
    seed()
