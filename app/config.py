from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


class Config:
    DATASET_PATH = str(BASE_DIR.parent / "smart_city_citizen_activity.csv")
