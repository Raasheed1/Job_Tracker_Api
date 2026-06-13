from flask import Flask
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from flask_cors import CORS

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

jwt_blocklist = set()

limiter = Limiter(get_remote_address)

cache = Cache()


@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    return jti in jwt_blocklist


def create_app():
    app = Flask(__name__)

    app.config.from_object("config.Config")
    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"

    # Allow requests from the frontend (file://, localhost, etc.)
    CORS(
    app,
    supports_credentials=True,
    origins=[
        "https://lucky-puppy-13e192.netlify.app/",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ]
)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Register blueprints
    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')

    from app.routes.jobs import jobs_bp
    app.register_blueprint(jobs_bp)

    from app.routes.dashboard import dashboard_bp
    app.register_blueprint(dashboard_bp)

    from app.routes.admin import admin_bp
    app.register_blueprint(admin_bp, url_prefix='/admin')

    from app.utils.errors import register_error_handlers
    register_error_handlers(app)

    from app.models import user, job, application

    limiter.init_app(app)

    app.config['CACHE_TYPE'] = 'SimpleCache'
    app.config['CACHE_DEFAULT_TIMEOUT'] = 300
    cache.init_app(app)

    return app
