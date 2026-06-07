import pytest
import sys
import os

# 🔥 make app import work
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db


@pytest.fixture
def app():
    app = create_app()

    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["JWT_SECRET_KEY"] = "this-is-a-super-long-secret-key-for-testing-purpose-only"
    app.config["RATELIMIT_ENABLED"] = False
    app.config["SCHEDULER_ENABLED"] = False
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()