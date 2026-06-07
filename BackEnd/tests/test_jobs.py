def get_token(client):
    import uuid

    email = f"test_{uuid.uuid4()}@gmail.com"

    client.post('/auth/register', json={
        "email": email,
        "password": "12345678"
    })

    res = client.post('/auth/login', json={
        "email": email,
        "password": "12345678"
    })

    return res.json["data"]["access_token"]


def test_create_job(client):
    token = get_token(client)

    response = client.post('/jobs',
        headers={"Authorization": f"Bearer {token}"},
        json={
            "company": "Google",
            "role": "SDE"
        }
    )

    assert response.status_code == 201


def test_get_jobs(client):
    token = get_token(client)

    client.post('/jobs',
        headers={"Authorization": f"Bearer {token}"},
        json={
            "company": "Google",
            "role": "SDE"
        }
    )

    response = client.get('/jobs',
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200