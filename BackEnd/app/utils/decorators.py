from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models.user import User


def admin_required(fn):
    """Decorator that ensures the current JWT user has the 'admin' role."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({"error": "Admin access required", "code": 403}), 403
        return fn(*args, **kwargs)
    return wrapper
