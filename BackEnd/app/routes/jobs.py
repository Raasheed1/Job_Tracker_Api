from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.job import Job
from app.models.application import Application
from app import db
from datetime import datetime, timezone

jobs_bp = Blueprint('jobs', __name__)


@jobs_bp.route('/jobs', methods=['GET'])
@jwt_required()
def get_jobs():
    """List all active job postings with optional search filters."""
    query = Job.query.filter_by(is_active=True)

    title = request.args.get('title')
    company = request.args.get('company')
    location = request.args.get('location')
    job_type = request.args.get('job_type')

    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)

    if title:
        query = query.filter(Job.title.ilike(f"%{title}%"))
    if company:
        query = query.filter(Job.company.ilike(f"%{company}%"))
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if job_type:
        query = query.filter(Job.job_type == job_type)

    jobs = query.order_by(Job.created_at.desc()).paginate(page=page, per_page=limit, error_out=False)

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
                    "created_at": j.created_at.isoformat() if j.created_at else None
                } for j in jobs.items
            ]
        }
    })


@jobs_bp.route('/jobs/<int:job_id>', methods=['GET'])
@jwt_required()
def get_job(job_id):
    """Get a single active job posting by ID."""
    job = Job.query.filter_by(id=job_id, is_active=True).first()

    if not job:
        return jsonify({"error": "Job not found", "code": 404}), 404

    return jsonify({
        "message": "Job fetched",
        "data": {
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "description": job.description,
            "location": job.location,
            "salary": job.salary,
            "job_type": job.job_type,
            "created_at": job.created_at.isoformat() if job.created_at else None
        }
    })


@jobs_bp.route('/jobs/<int:job_id>/apply', methods=['POST'])
@jwt_required()
def apply_job(job_id):
    """Apply to a job. Users can only apply once per job."""
    user_id = int(get_jwt_identity())

    job = Job.query.filter_by(id=job_id, is_active=True).first()
    if not job:
        return jsonify({"error": "Job not found or not active", "code": 404}), 404

    existing = Application.query.filter_by(job_id=job_id, user_id=user_id).first()
    if existing:
        return jsonify({"error": "Already applied to this job", "code": 400}), 400

    application = Application(
        job_id=job_id,
        user_id=user_id,
        status='pending'
    )
    db.session.add(application)
    db.session.commit()

    return jsonify({
        "message": "Application submitted",
        "data": {
            "id": application.id,
            "job_id": application.job_id,
            "status": application.status,
            "applied_at": application.applied_at.isoformat() if application.applied_at else None
        }
    }), 201


@jobs_bp.route('/my-applications', methods=['GET'])
@jwt_required()
def my_applications():
    """List all applications submitted by the current user."""
    user_id = int(get_jwt_identity())

    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)

    apps = Application.query.filter_by(user_id=user_id)\
        .order_by(Application.applied_at.desc())\
        .paginate(page=page, per_page=limit, error_out=False)

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
                    "status": a.status,
                    "applied_at": a.applied_at.isoformat() if a.applied_at else None,
                    "updated_at": a.updated_at.isoformat() if a.updated_at else None
                } for a in apps.items
            ]
        }
    })


@jobs_bp.route('/applications/<int:application_id>', methods=['DELETE'])
@jwt_required()
def withdraw_application(application_id):
    """Withdraw (delete) a pending application. Only the applicant can do this."""
    user_id = int(get_jwt_identity())

    application = Application.query.filter_by(id=application_id, user_id=user_id).first()
    if not application:
        return jsonify({"error": "Application not found", "code": 404}), 404

    if application.status != 'pending':
        return jsonify({"error": "Only pending applications can be withdrawn", "code": 400}), 400

    db.session.delete(application)
    db.session.commit()

    return jsonify({"message": "Application withdrawn"})
