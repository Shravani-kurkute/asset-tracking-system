"""Quick script to reset the default admin password in the database."""

import sys 
sys.path.append('.') 
from app.database import SessionLocal 
from app.models.user import User 
from passlib.context import CryptContext 
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto") 
db = SessionLocal() 
user = db.query(User).filter(User.email == "admin@company.com").first() 
user.hashed_password = pwd.hash("Admin@1234") 
db.commit() 
print("Password reset done!") 
db.close() 
