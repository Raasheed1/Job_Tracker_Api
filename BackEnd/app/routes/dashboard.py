from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.job import Job
from app.models.status_history import StatusHistory
from sqlalchemy import func
from app import db
from datetime import datetime,timezone,timedelta
from app import cache

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    user_id = int(get_jwt_identity())

    cache_key= f"dashboard_{user_id}"
    cache_data=cache.get(cache_key)
    if cache_data:
        response=jsonify(cache_data)
        response.headers['X-Cache']='HIT'
        return response
    
    total_jobs = Job.query.filter_by(user_id=user_id, deleted_at=None).count()
    applied = Job.query.filter_by(user_id=user_id, status='applied', deleted_at=None).count()
    interview = Job.query.filter_by(user_id=user_id, status='interview', deleted_at=None).count()
    offer = Job.query.filter_by(user_id=user_id, status='offer', deleted_at=None).count()
    rejected = Job.query.filter_by(user_id=user_id, status='rejected', deleted_at=None).count()

    response_rate=0
    if total_jobs> 0:
        response_rate=((interview + offer)/total_jobs)*100
    data = {
        "message": "Dashboard stats",
        "data": {
            "total_jobs": total_jobs,
            "applied": applied,
            "interview": interview,
            "offer": offer,
            "rejected": rejected,
            "response_rate": round(response_rate, 2)
        }
    }
    cache.set(cache_key,data,timeout=300)
    response=jsonify(data)
    response.headers['X-Cache'] = 'MISS'
    return response

@dashboard_bp.route('/dashboard/stale',methods=['GET'])
@jwt_required()
def stale_jobs():
    
    user_id=int(get_jwt_identity())
    seven_days=datetime.now(timezone.utc)-timedelta(days=7)

    latest_updates = db.session.query(StatusHistory.job_id,func.max(StatusHistory.changed_at).label("last_update")).group_by(StatusHistory.job_id).subquery()
    stale_jobs = Job.query.outerjoin(latest_updates,
            Job.id == latest_updates.c.job_id).filter(
            Job.user_id == user_id,
            Job.status == "applied",
            Job.deleted_at.is_(None),
            (
                (latest_updates.c.last_update == None) | (latest_updates.c.last_update < seven_days)
            )).all()

    return jsonify({
        "message": "Stale jobs",
        "data": [
            {
                "id": j.id,
                "company": j.company,
                "role": j.role,
                "created_at": j.created_at.isoformat() if j.created_at else None
            } for j in stale_jobs
        ]
    })