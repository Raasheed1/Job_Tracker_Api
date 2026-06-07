from app import db
from datetime import datetime,timezone

class Job(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    company = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default='applied')
    notes = db.Column(db.Text)
    job_url = db.Column(db.String(500))
    applied_date = db.Column(db.Date)
    deleted_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime(timezone=True),default=lambda: datetime.now(timezone.utc))