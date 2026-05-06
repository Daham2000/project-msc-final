import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


class Config:
    DATASET_PATH = str(BASE_DIR.parent / "smart_city_citizen_activity.csv")
    SECRET_KEY = os.getenv("SECRET_KEY", "smart-city-dev-secret")
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "smart_city_dashboard")
    CORS_ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5175,http://127.0.0.1:5175",
        ).split(",")
        if origin.strip()
    ]
    DEFAULT_ADMIN_NAME = os.getenv("DEFAULT_ADMIN_NAME", "Local Government Admin")
    DEFAULT_ADMIN_EMAIL = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@smartcity.local")
    DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "Admin@123")
