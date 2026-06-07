from app import db
from datetime import datetime,timezone

class StatusHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('job.id'), nullable=False)
    from_status = db.Column(db.String(50))
    to_status = db.Column(db.String(50), nullable=False)
    changed_at = db.Column(db.DateTime(timezone=True),default=lambda: datetime.now(timezone.utc))
    note = db.Column(db.Text)