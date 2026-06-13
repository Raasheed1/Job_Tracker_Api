import os
from flask import Blueprint, request, jsonify
from app import db, jwt_blocklist, limiter
from app.models.user import User
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    get_jwt, jwt_required, get_jwt_identity
)
from app.schemas.user_schema import UserSchema

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("10 per minute")
def register():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data", "code": 400}), 400

    schema = UserSchema()
    errors = schema.validate(data)

    if errors:
        return jsonify({"error": errors, "code": 422}), 422

    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email already exists", "code": 400}), 400

    hashed_pw = generate_password_hash(data['password'])

    user = User(
        email=data['email'],
        password_hash=hashed_pw,
        role='user'
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered", "data": {"email": user.email, "role": user.role}}), 201


@auth_bp.route('/register-admin', methods=['POST'])
@limiter.limit("5 per minute")
def register_admin():
    """Register an admin user. Requires X-Admin-Secret header matching ADMIN_SECRET env var."""
    admin_secret = os.environ.get('ADMIN_SECRET', '')
    provided_secret = request.headers.get('X-Admin-Secret', '')

    if not admin_secret or provided_secret != admin_secret:
        return jsonify({"error": "Invalid or missing admin secret", "code": 403}), 403

    data = request.get_json()

    if not data:
        return jsonify({"error": "No data", "code": 400}), 400

    schema = UserSchema()
    errors = schema.validate(data)

    if errors:
        return jsonify({"error": errors, "code": 422}), 422

    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email already exists", "code": 400}), 400

    hashed_pw = generate_password_hash(data['password'])

    user = User(
        email=data['email'],
        password_hash=hashed_pw,
        role='admin'
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Admin registered", "data": {"email": user.email, "role": user.role}}), 201


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data", "code": 400}), 400

    schema = UserSchema()
    errors = schema.validate(data)

    if errors:
        return jsonify({"error": errors, "code": 422}), 422

    user = User.query.filter_by(email=data['email']).first()

    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({"error": "Invalid credentials", "code": 401}), 401

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful",
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "role": user.role,
            "email": user.email
        }
    })



@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    jwt_blocklist.add(jti)
    return jsonify({"message": "Logged out successfully"})


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = int(get_jwt_identity())
    new_access_token = create_access_token(identity=str(user_id))
    return jsonify({"message": "Token refreshed", "data": {"access_token": new_access_token}})