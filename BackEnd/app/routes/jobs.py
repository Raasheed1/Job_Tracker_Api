from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.job import Job
from app.models.status_history import StatusHistory
from app import db
from datetime import datetime,timezone
from app.schemas.job_schema import JobSchema

jobs_bp = Blueprint('jobs', __name__)

@jobs_bp.route('/jobs',methods=['POST'])
@jwt_required()
def create_job():
    user_id = int(get_jwt_identity())
    data=request.get_json()
    if not data:
        return jsonify({"error": "No data", "code": 400}), 400

    schema = JobSchema()
    errors = schema.validate(data)

    if errors:
        return jsonify({"error": errors, "code": 422}), 422
    
    existing_job = Job.query.filter_by(
        user_id=user_id,
        company=data['company'],
        role=data['role'],
        deleted_at=None
        ).first()

    if existing_job:
        return jsonify({"error": "Job already exists", "code": 400}), 400
    
    job=Job(
        user_id=user_id,
        company=data['company'],
        role=data['role'],
        notes=data.get('notes'),
        job_url=data.get('job_url'),
        applied_date=data.get('applied_date')
    )
    db.session.add(job)
    db.session.commit()
    return jsonify({
        "message": "Job created",
        "data": {
            "id": job.id,
            "company": job.company,
            "role": job.role,
            "status": job.status
        }
    }), 201


@jobs_bp.route('/jobs', methods=['GET'])
@jwt_required()
def get_jobs():
    user_id= int(get_jwt_identity())
    query=Job.query.filter_by(user_id=user_id,deleted_at=None)

    status=request.args.get('status')
    company=request.args.get('company')

    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 5, type=int)

    if status:
        query=query.filter(Job.status==status)
    if company:
        query=query.filter(Job.company.ilike(f"%{company}%"))
    
    jobs = query.paginate(page=page, per_page=limit, error_out=False)
    
    return jsonify({"message": "Jobs fetched",
            "data": {
                "total": jobs.total,
                "page": jobs.page,
                "pages": jobs.pages,
                "jobs": [
                    {
                        "id": j.id,
                        "company": j.company,
                        "role": j.role,
                        "status": j.status
                    } for j in jobs.items
                ]
            }
    })


@jobs_bp.route('/jobs/<int:job_id>',methods=['GET'])
@jwt_required()
def get_job(job_id):
    user_id= int(get_jwt_identity())
    job=Job.query.filter_by(user_id=user_id,id=job_id,deleted_at=None).first()

    if not job:
        return jsonify({"error": "Job not found", "code": 404}), 404
    
    return jsonify({"message": "Job fetched",
        "data": {
            "id": job.id,
            "company": job.company,
            "role": job.role,
            "status": job.status,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "notes": job.notes,
            "job_url": job.job_url,
            "applied_date": job.applied_date
        }
    })


@jobs_bp.route('/jobs/<int:job_id>',methods=['PUT'])
@jwt_required()
def update_job(job_id):
    user_id= int(get_jwt_identity())
    data=request.get_json()
    if not data:
        return jsonify({"error": "No data", "code": 400}), 400

    schema = JobSchema()
    errors = schema.validate(data, partial=True)

    if errors:
        return jsonify({"error": errors, "code": 422}), 422
    job=Job.query.filter_by(id=job_id,user_id=user_id,deleted_at=None).first()
    if not job:
        return jsonify({"error": "Job not found", "code": 404}), 404
    
    job.company=data.get('company',job.company)
    job.role=data.get('role',job.role)
    job.notes = data.get('notes', job.notes)
    job.job_url = data.get('job_url', job.job_url)
    job.applied_date = data.get('applied_date', job.applied_date)

    if 'status' in data and data['status'] != job.status:
        history = StatusHistory(
            job_id=job.id,
            from_status=job.status,
            to_status=data['status'],
            changed_at=datetime.now(timezone.utc)
        )
        db.session.add(history)
        job.status = data['status']

    db.session.commit()
    return jsonify({"message": "Job updated",
        "data": {
            "id": job.id,
            "company": job.company,
            "role": job.role,
            "status": job.status
        }
    })

@jobs_bp.route('/jobs/<int:job_id>',methods=['DELETE'])
@jwt_required()
def delete_job(job_id):
    user_id= int(get_jwt_identity())
    
    job=Job.query.filter_by(id=job_id,user_id=user_id,deleted_at=None).first()

    if not job:
        return jsonify({"error": "Job not found", "code": 404}), 404
    
    job.deleted_at=datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"message": "Job deleted"})


@jobs_bp.route('/jobs/<int:job_id>/history', methods=['GET'])
@jwt_required()
def get_history(job_id):
    user_id = int(get_jwt_identity())

    job = Job.query.filter_by(id=job_id,user_id=user_id,deleted_at=None).first()

    if not job:
        return jsonify({"error": "Job not found", "code": 404}), 404

    history = StatusHistory.query.filter_by(job_id=job_id).all()

    return jsonify({"message": "History fetched",
        "data": [
            {
                "from": h.from_status,
                "to": h.to_status,
                "time": h.changed_at.isoformat() if h.changed_at else None
            } for h in history
        ]
    })

