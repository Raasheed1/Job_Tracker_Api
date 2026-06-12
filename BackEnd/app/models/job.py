from app import db
from datetime import datetime, timezone


class Job(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    company = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(255))
    salary = db.Column(db.String(100))
    job_type = db.Column(db.String(50))  # e.g. full-time, part-time, contract
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    applications = db.relationship('Application', backref='job', lazy=True, cascade='all, delete-orphan')