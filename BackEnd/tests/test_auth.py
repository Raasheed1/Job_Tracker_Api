import uuid

def test_register(client):
    email = f"test_{uuid.uuid4()}@gmail.com"

    response = client.post('/auth/register', json={
        "email": email,
        "password": "12345678"
    })

    assert response.status_code == 201


def test_login(client):
    email = f"test_{uuid.uuid4()}@gmail.com"

    client.post('/auth/register', json={
        "email": email,
        "password": "12345678"
    })

    response = client.post('/auth/login', json={
        "email": email,
        "password": "12345678"
    })

    assert response.status_code == 200
    assert "access_token" in response.json["data"]