from flask import Blueprint, jsonify, request
from app.models.job import Job
from app.models.application import Application
from app.models.user import User
from app.schemas.job_schema import JobSchema
from app.schemas.application_schema import ApplicationStatusSchema
from app.utils.decorators import admin_required
from app import db, cache
from datetime import datetime, timezone

admin_bp = Blueprint('admin', __name__)


# 1─── Job Management ─────────────────────────────────────────────────────────

@admin_bp.route('/jobs', methods=['POST'])
@admin_required
def create_job():
    """Admin: Create a new job posting."""
    from flask_jwt_extended import get_jwt_identity
    admin_id = int(get_jwt_identity())

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data", "code": 400}), 400

    schema = JobSchema()
    errors = schema.validate(data)
    if errors:
        return jsonify({"error": errors, "code": 422}), 422

    job = Job(
        title=data['title'],
        company=data['company'],
        description=data['description'],
        location=data.get('location'),
        salary=data.get('salary'),
        job_type=data.get('job_type'),
        is_active=data.get('is_active', True),
        created_by=admin_id
    )
    db.session.add(job)
    db.session.commit()
    cache.delete("admin_dashboard")

    return jsonify({
        "message": "Job created",
        "data": {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "salary": job.salary,
            "job_type": job.job_type,
            "is_active": job.is_active,
            "created_at": job.created_at.isoformat() if job.created_at else None
        }
    }), 201


#2
@admin_bp.route('/jobs/<int:job_id>', methods=['PUT'])
@admin_required
def update_job(job_id):
    """Admin: Edit an existing job posting."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data", "code": 400}), 400

    schema = JobSchema()
    errors = schema.validate(data, partial=True)
    if errors:
        return jsonify({"error": errors, "code": 422}), 422

    job = Job.query.get(job_id)
    if not job:
        return jsonify({"error": "Job not found", "code": 404}), 404

    job.title = data.get('title', job.title)
    job.company = data.get('company', job.company)
    job.description = data.get('description', job.description)
    job.location = data.get('location', job.location)
    job.salary = data.get('salary', job.salary)
    job.job_type = data.get('job_type', job.job_type)
    job.is_active = data.get('is_active', job.is_active)

    db.session.commit()
    cache.delete("admin_dashboard")

    return jsonify({
        "message": "Job updated",
        "data": {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "salary": job.salary,
            "job_type": job.job_type,
            "is_active": job.is_active
        }
    })

#3
@admin_bp.route('/jobs/<int:job_id>', methods=['DELETE'])
@admin_required
def delete_job(job_id):
    """Admin: Delete a job posting (hard delete, cascades to applications)."""
    job = Job.query.get(job_id)
    if not job:
        return jsonify({"error": "Job not found", "code": 404}), 404

    db.session.delete(job)
    db.session.commit()
    cache.delete("admin_dashboard")

    return jsonify({"message": "Job deleted"})

#4
@admin_bp.route('/jobs', methods=['GET'])
@admin_required
def list_jobs():
    """Admin: List all job postings (active and inactive)."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)

    jobs = Job.query.order_by(Job.created_at.desc()).paginate(page=page, per_page=limit, error_out=False)

    return jsonify({
        "message": "Jobs fetched",
        "data": {
            "total": jobs.total,
            "page": jobs.page,
            "pages": jobs.pages,
            "jobs": [
                {
                    "id": j.id,
                    "title": j.title,
                    "company": j.company,
                    "location": j.location,
                    "salary": j.salary,
                    "job_type": j.job_type,
                    "is_active": j.is_active,
                    "application_count": len(j.applications),
                    "created_at": j.created_at.isoformat() if j.created_at else None
                } for j in jobs.items
            ]
        }
    })

#5
@admin_bp.route('/jobs/<int:job_id>/applicants', methods=['GET'])
@admin_required
def get_job_applicants(job_id):
    """Admin: Get all applicants for a specific job."""
    job = Job.query.get(job_id)
    if not job:
        return jsonify({"error": "Job not found", "code": 404}), 404

    applications = Application.query.filter_by(job_id=job_id)\
        .order_by(Application.applied_at.desc()).all()

    return jsonify({
        "message": "Applicants fetched",
        "data": {
            "job_id": job_id,
            "job_title": job.title,
            "total": len(applications),
            "applicants": [
                {
                    "application_id": a.id,
                    "user_id": a.user_id,
                    "email": a.applicant.email,
                    "status": a.status,
                    "applied_at": a.applied_at.isoformat() if a.applied_at else None
                } for a in applications
            ]
        }
    })

#6
# ─── Application Management ─────────────────────────────────────────────────

@admin_bp.route('/applications', methods=['GET'])
@admin_required
def list_applications():
    """Admin: List all applications across all jobs."""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    status = request.args.get('status')

    query = Application.query
    if status:
        query = query.filter_by(status=status)

    apps = query.order_by(Application.applied_at.desc()).paginate(page=page, per_page=limit, error_out=False)

    return jsonify({
        "message": "Applications fetched",
        "data": {
            "total": apps.total,
            "page": apps.page,
            "pages": apps.pages,
            "applications": [
                {
                    "id": a.id,
                    "job_id": a.job_id,
                    "job_title": a.job.title,
                    "company": a.job.company,
                    "user_id": a.user_id,
                    "email": a.applicant.email,
                    "status": a.status,
                    "applied_at": a.applied_at.isoformat() if a.applied_at else None,
                    "updated_at": a.updated_at.isoformat() if a.updated_at else None
                } for a in apps.items
            ]
        }
    })

#7
@admin_bp.route('/applications/<int:application_id>', methods=['PATCH'])
@admin_required
def update_application_status(application_id):
    """Admin: Update the status of an application (pending/selected/rejected)."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data", "code": 400}), 400

    schema = ApplicationStatusSchema()
    errors = schema.validate(data)
    if errors:
        return jsonify({"error": errors, "code": 422}), 422

    application = Application.query.get(application_id)
    if not application:
        return jsonify({"error": "Application not found", "code": 404}), 404

    application.status = data['status']
    application.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    # Invalidate caches for the affected user and admin
    cache.delete(f"user_dashboard_{application.user_id}")
    cache.delete("admin_dashboard")

    return jsonify({
        "message": "Application status updated",
        "data": {
            "id": application.id,
            "status": application.status,
            "updated_at": application.updated_at.isoformat() if application.updated_at else None
        }
    })
