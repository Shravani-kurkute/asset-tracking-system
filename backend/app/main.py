from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine
from app.models import asset as asset_model  # registers model before create_all
from app.models import assignment as assignment_model  # registers model before create_all
from app.models import user as user_model  # registers model before create_all
from app.api.v1 import assets, assignments, auth, health

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Asset Tracking System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(assets.router, prefix="/api/v1")
app.include_router(assignments.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "service": "Asset Tracking System"}
