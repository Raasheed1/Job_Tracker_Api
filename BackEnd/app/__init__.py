from flask import Flask
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()
jwt=JWTManager()

jwt_blocklist=set()

limiter=Limiter(get_remote_address)

cache=Cache()

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    return jti in jwt_blocklist

def create_app():
    app = Flask(__name__)

    app.config.from_object("config.Config")
    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    from app.routes.jobs import jobs_bp
    app.register_blueprint(jobs_bp)
    from app.routes.dashboard import dashboard_bp
    app.register_blueprint(dashboard_bp)

    from app.utils.errors import register_error_handlers
    register_error_handlers(app)

    from app.models import user, job, status_history

    limiter.init_app(app)

    app.config['CACHE_TYPE'] = 'SimpleCache'
    app.config['CACHE_DEFAULT_TIMEOUT'] = 300
    cache.init_app(app)
    
    from app.utils.scheduler import start_scheduler
    if app.config.get("SCHEDULER_ENABLED", True):
        start_scheduler(app)

    return app


