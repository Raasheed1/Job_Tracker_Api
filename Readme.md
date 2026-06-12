# 🚀 Job Tracker API

![Python](https://img.shields.io/badge/Python-3.12-blue)
![Flask](https://img.shields.io/badge/Flask-API-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-ORM-red)
![JWT](https://img.shields.io/badge/JWT-Authentication-green)

A production-ready backend API to track job applications with authentication, status tracking, analytics, caching, and automated testing.

---

## 🌐 Live API

👉 yet to add

---

## 🧠 Overview

The **Job Tracker API** is a backend with simple frountend system designed to help users manage and track their job applications and Admin to track the total applications, 
This API is designed with production-ready practices including caching, background jobs, and CI/CD.

It allows users to:

* Register and authenticate securely  
* Track job applications  
* Update job status over time  
* View complete status history  

It allows admin to:

* track their total Application
* Manage jobs status (add,delet,update) 
* Select or Reject the candidate

Overall:

* Analyze job statistics  
* Improve performance using caching


This project focuses on **real-world backend architecture**, **clean API design**, and **scalable structure** with **simple UI**.

---

## ⚙️ Tech Stack

* **Python**
* **Flask**
* **HTML**
* **Js**
* **css**
* **PostgreSQL**
* **SQLite (for testing)**
* **SQLAlchemy (ORM)**
* **Flask-JWT-Extended (Authentication)**
* **Flask-Migrate (Alembic)**
* **Flask-Caching (Performance)**
* **Flask-Limiter (Rate Limiting)**
* **APScheduler (Background Jobs)**
* **Pytest (Testing)**  
* **GitHub Actions (CI)**  
* **Render (Deployment)**
* **Railway (Database Hosting)**
* **Postman (API Testing)**

---

## 🔐 Features

### 🔑 Authentication

* User Registration
* admin Registration   
* Login with JWT  
* Access & Refresh Tokens  
* Secure password hashing  
* Token-based protected routes  
* Logout with token blocklist  

---

### 💼 Job Management

* Create job applications  
* Get all jobs (with filters & pagination)  
* Get single job details  
* Update job details  
* delete jobs  

---

### 📊 Status Tracking

* Track status changes (applied → admin(verify)→ selected/rejected)  
* Maintain complete history of status transitions  

---

### 📈 Dashboard

* Total jobs count  
* Applied / Interview / Rejected stats  
* Response rate calculation  
* Stale job detection (based on inactivity, not creation time)  

---

### ⚡ Performance Optimization

* User-specific dashboard caching  
* Manual cache control using:
  - `X-Cache: HIT`
  - `X-Cache: MISS`

---

### 🔄 Background Jobs

* Daily job: identify stale applications  
* Weekly job: clear cached data  

---

### 🛡️ Validation & Error Handling

* Consistent JSON response format  
* Proper HTTP status codes (400, 401, 404, 429)  
* Schema-based validation  

---

## 📬 API Endpoints

### 🔑 Auth

| Method | Endpoint         | Description          |
| ------ | ---------------- | -------------------- |
| POST   | `/auth/register` | Register user        |
| POST   | `/auth/login`    | Login user           |
| POST   | `/auth/refresh`  | Get new access token |
| POST   | `/auth/logout`   | Logout user          |

---

### 💼 Admin View

| Method | Endpoint            | Description                         |
| ------ | ------------------- | ----------------------------------- |
| POST   | `/jobs`             | Create new job                      |
| PUT    | `/jobs/<id>`        | Update job                          |
| DELETE | `/jobs/<id>`        | Soft delete job                     |
| GET    | `/jobs`             | Get all jobs (filters + pagination) |
| GET    | `/jobs/<id>`        | Get single job                      |
| GET    | `/applications`     | List all applications               |
| GET    | `/applications/<id>`| List all applications               |

---

### 💼 User View

| Method | Endpoint     | Description                         |
| ------ | ------------ | ----------------------------------- |
| GET    | `/jobs`      | Get all jobs (filters + pagination) |
| POST   | `/jobs`      | Create new job                      |
| GET    | `/jobs/<id>` | Get single job                      |
| PUT    | `/jobs/<id>` | Update job                          |
| DELETE | `/jobs/<id>` | Soft delete job                     |

---

### 📊 History

| Method | Endpoint             | Description                       | User          |
| ------ | -------------------- | --------------------------------- | ------------  |
| GET    | `/dashboard`         | personal application statistics   | Applicant     |
| GET    | `/admin/dashboard`   | total jobs/selection statistics   | Admin         |


---

## ⚡ Caching Strategy

Dashboard responses are cached per user.

Cache key format:


```
dashboard_<user_id>
```


Response header shows cache behavior:


```
X-Cache: HIT / MISS
```
---


### 🧪 Testing & CI

* Pytest-based test suite  
* GitHub Actions CI pipeline  
* In-memory database for isolated testing  

---

## 🧪 API Testing (Postman)

A complete Postman collection is included covering:

* Auth flow (Register/Login)
* Job CRUD operations
* Status updates & history
* Full request lifecycle

📁 File:

```
/postman/job-tracker-api.postman_collection.json
```

👉 Import this file into Postman to test the API instantly.

---

## 🧱 Backend Structure

```
Job_Tracker/
|
├──BackEnd/
|   │
|   ├── app/
|   │   ├── models/
|   │   │   ├── user.py
|   │   │   ├── job.py
|   │   │   ├── application.py
|   │   │
|   │   ├── routes/
|   |   |   ├──admin.py
|   │   │   ├── auth.py
|   |   |   ├── dashboard.py
|   │   │   ├── jobs.py
|   │   │   ├── dashboard.py
|   │   │
|   │   ├── schemas/
|   |   |   ├──application_schema.py
|   │   │   ├── user_schema.py
|   │   │   ├── job_schema.py
|   │   │
|   │   ├── utils/
|   |   |   ├──decorators.py
|   │   │   ├── errors.py
|   │   │   ├── scheduler.py
|   │   │
|   │   ├── __init__.py
|   |   │
|   ├── postman/
|   │   └── job-tracker-api.postman_collection.json
|   │
|   ├── run.py
|   ├── config.py
|   ├── admin_cli.puy
|   ├── Procfile
|   ├── requirements.txt
├── FrountEnd/
|   ├── js/
|   |   ├── js files
|   ├── html files
|   ├── style.css
|
|
└── Readme.md
```

---

## 🚀 Deployment

* Backend hosted on **yet to add**
* PostgreSQL database hosted on **yet to add**
* Frontend hosted on **Yet to add**

---

## ⚙️ Environment Variables

Required variables:

```
DATABASE_URL=your_postgresql_url
SECRET_KEY=your_secret_key
JWT_SECRET_KEY=your_jwt_secret
```

---

## 🧠 Key Learnings

* Designing scalable backend systems  
* Implementing JWT authentication (access + refresh)  
* Database modeling with relationships  
* API design and best practices  
* Performance optimization using caching  
* Handling real-world errors and edge cases  
* Deployment and CI integration  

---

## 📌 Future Improvements

* Redis-based caching  
* Persistent JWT blocklist  
* Expanded test coverage  
* Frontend (React)  
* Docker support

---

## ⚠️ Known Limitations

* JWT blocklist is stored in-memory and resets when the server restarts  
* SimpleCache is not suitable for multi-instance production  
* Scheduler runs inside the app (can be separated in production)  

---
