import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("postgresql://postgres:root@localhost:5432/job_tracker_db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv("super-secret-key-change-in-production")
    JWT_SECRET_KEY = os.getenv("jwt-super-secret-key-change-in-production")