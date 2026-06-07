from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.schedulers.base import STATE_RUNNING
from datetime import datetime,timedelta,timezone
from app.models.job import Job
from app import db,cache

scheduler=BackgroundScheduler()
def mark_stale_jobs():
    from flask import current_app

    with current_app.app_context():
        deadline=datetime.now(timezone.utc)-timedelta(days=7)

        stale_jobs=Job.query.filter(Job.status=="applied",Job.created_at<deadline).all()
        for job in stale_jobs:
            if "[STALE]" not in (job.notes or ""):
                job.notes = (job.notes or "") + " [STALE]"

        db.session.commit()

def clear_cache():
    cache.clear()

def start_scheduler(app=None):
    if app and app.config.get("TESTING"):
        return
    if scheduler.state!=STATE_RUNNING:
        scheduler.add_job(mark_stale_jobs,'interval',days=1)
        scheduler.add_job(clear_cache,'interval',weeks=1)
        scheduler.start()
