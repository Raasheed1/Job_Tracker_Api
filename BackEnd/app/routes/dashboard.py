from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.job import Job
from app.models.application import Application
from app.models.user import User
from app.utils.decorators import admin_required
from app import db, cache

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def user_dashboard():
    """User dashboard: personal application statistics."""
    user_id = int(get_jwt_identity())

    cache_key = f"user_dashboard_{user_id}"
    cache_data = cache.get(cache_key)
    if cache_data:
        response = jsonify(cache_data)
        response.headers['X-Cache'] = 'HIT'
        return response

    total_applications = Application.query.filter_by(user_id=user_id).count()
    selected = Application.query.filter_by(user_id=user_id, status='selected').count()
    rejected = Application.query.filter_by(user_id=user_id, status='rejected').count()

    data = {
        "message": "User dashboard stats",
        "data": {
            "total_applications": total_applications,
            "selected": selected,
            "rejected": rejected
        }
    }

    cache.set(cache_key, data, timeout=300)
    response = jsonify(data)
    response.headers['X-Cache'] = 'MISS'
    return response


@dashboard_bp.route('/admin/dashboard', methods=['GET'])
@admin_required
def admin_dashboard():
    """Admin dashboard: platform-wide statistics."""
    cache_key = "admin_dashboard"
    cache_data = cache.get(cache_key)
    if cache_data:
        response = jsonify(cache_data)
        response.headers['X-Cache'] = 'HIT'
        return response

    total_jobs = Job.query.count()
    total_applications = Application.query.count()
    selected = Application.query.filter_by(status='selected').count()
    rejected = Application.query.filter_by(status='rejected').count()

    data = {
        "message": "Admin dashboard stats",
        "data": {
            "total_jobs": total_jobs,
            "total_applications": total_applications,
            "selected": selected,
            "rejected": rejected
        }
    }

    cache.set(cache_key, data, timeout=300)
    response = jsonify(data)
    response.headers['X-Cache'] = 'MISS'
    return response