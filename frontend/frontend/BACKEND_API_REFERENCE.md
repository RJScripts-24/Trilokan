# Trilokan Backend API Endpoints Reference

**Generated:** November 23, 2025

---

## Authentication APIs
| Method | Endpoint                | Auth | Purpose                |
|--------|-------------------------|------|------------------------|
| POST   | /api/v1/auth/register   | ❌   | Register new user      |
| POST   | /api/v1/auth/login      | ❌   | Login user             |
| POST   | /api/v1/auth/logout     | ✅   | Logout user            |
| POST   | /api/v1/auth/refresh-tokens | ❌ | Refresh access token   |

## User APIs
| Method | Endpoint                | Auth | Purpose                |
|--------|-------------------------|------|------------------------|
| POST   | /api/v1/users/register  | ❌   | Register new user      |
| POST   | /api/v1/users/login     | ❌   | Login user             |
| GET    | /api/v1/users/profile   | ✅   | Get user profile       |
| PATCH  | /api/v1/users/profile   | ✅   | Update user profile    |
| POST   | /api/v1/users/logout    | ✅   | Logout user            |
| GET    | /api/v1/users           | ✅ (admin) | List all users   |
| DELETE | /api/v1/users/:userId   | ✅ (admin) | Delete user      |

## Grievance APIs
| Method | Endpoint                        | Auth | Purpose                        |
|--------|----------------------------------|------|--------------------------------|
| POST   | /api/v1/grievances              | ✅   | Create grievance (with files)  |
| GET    | /api/v1/grievances              | ✅   | List grievances                |
| GET    | /api/v1/grievances/:grievanceId | ✅   | Get grievance details          |
| PATCH  | /api/v1/grievances/:grievanceId | ✅   | Update grievance               |
| DELETE | /api/v1/grievances/:grievanceId | ✅   | Delete grievance               |
| PATCH  | /api/v1/grievances/:grievanceId/status | ✅ (admin/staff) | Update grievance status |
| PATCH  | /api/v1/grievances/:grievanceId/assign | ✅ (admin) | Assign grievance |

## Identity Verification APIs
| Method | Endpoint                        | Auth | Purpose                        |
|--------|----------------------------------|------|--------------------------------|
| GET    | /api/v1/identity/challenge      | ✅   | Get liveness challenge         |
| POST   | /api/v1/identity/verify         | ✅   | Verify identity (multi-modal)  |

## App Verification APIs
| Method | Endpoint                        | Auth | Purpose                        |
|--------|----------------------------------|------|--------------------------------|
| POST   | /api/v1/apps/verify-file        | ✅   | Verify APK file                |
| POST   | /api/v1/apps/verify-package     | ✅   | Verify by package name         |
| POST   | /api/v1/apps/report             | ✅   | Report suspicious app          |

## System APIs
| Method | Endpoint                        | Auth | Purpose                        |
|--------|----------------------------------|------|--------------------------------|
| GET    | /api/v1/app/health              | ❌   | Health check                   |
| GET    | /api/v1/app/config              | ❌   | App config info                |
| POST   | /api/v1/app/feedback            | ✅   | Submit feedback                |
| GET    | /api/v1/app/enums               | ❌   | Get enums/constants            |
| GET    | /api/v1/docs                    | ❌   | Swagger API docs               |
| GET    | /api/v1/docs/json               | ❌   | OpenAPI JSON                   |

## ML (Legacy/Deprecated) APIs
| Method | Endpoint                        | Auth | Purpose                        |
|--------|----------------------------------|------|--------------------------------|
| POST   | /api/v1/ml/predict/category     | ❌   | (Deprecated) Text categorization|
| POST   | /api/v1/ml/predict/sentiment    | ❌   | (Deprecated) Sentiment analysis |
| POST   | /api/v1/ml/predict/toxicity     | ❌   | (Deprecated) Toxicity detection |
| POST   | /api/v1/ml/detect/deepfake      | ❌   | (Deprecated) Deepfake detection |
| POST   | /api/v1/ml/transcribe           | ❌   | (Deprecated) Audio transcription|
| POST   | /api/v1/ml/verify/app           | ❌   | (Deprecated) App verification   |
| POST   | /api/v1/ml/verify/identity      | ❌   | (Deprecated) Identity verification|
| GET    | /api/v1/ml/health               | ❌   | ML service health check         |

---

**Note:**
- Endpoints marked as (Deprecated) are for backward compatibility and should not be used for new integrations.
- All protected endpoints require `Authorization: Bearer <token>` header.
- For file uploads, use `multipart/form-data`.
- For full details, see backend Swagger docs and validation schemas.
