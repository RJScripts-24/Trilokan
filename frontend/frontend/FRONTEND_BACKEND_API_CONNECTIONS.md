# Frontend-Backend API Connection Reference

**Generated:** November 23, 2025

---

## Overview
This document lists all API endpoints that form the connection between the Trilokan frontend and backend. It includes endpoint paths, HTTP methods, authentication requirements, request/response formats, and their purpose in the application.

---

## Base Configuration
- **API Gateway URL:** `http://localhost:3000`
- **API Version Prefix:** `/api/v1`
- **All requests go through the API Gateway.**

---

## Authentication APIs
| Method | Endpoint                | Auth | Purpose                |
|--------|-------------------------|------|------------------------|
| POST   | /api/v1/auth/register   | ❌   | Register new user      |
| POST   | /api/v1/auth/login      | ❌   | Login user             |
| POST   | /api/v1/auth/logout     | ✅   | Logout user            |
| POST   | /api/v1/auth/refresh-tokens | ❌ | Refresh access token   |

---

## Grievance APIs
| Method | Endpoint                        | Auth | Purpose                        |
|--------|----------------------------------|------|--------------------------------|
| POST   | /api/v1/grievances              | ✅   | Create grievance (with files)  |
| GET    | /api/v1/grievances              | ✅   | List grievances                |
| GET    | /api/v1/grievances/:id          | ✅   | Get grievance details          |
| PATCH  | /api/v1/grievances/:id          | ✅   | Update grievance               |
| DELETE | /api/v1/grievances/:id          | ✅   | Delete grievance               |
| PATCH  | /api/v1/grievances/:id/status   | ✅   | Update grievance status        |
| PATCH  | /api/v1/grievances/:id/assign   | ✅   | Assign grievance (admin only)  |

---

## Identity Verification APIs
| Method | Endpoint                        | Auth | Purpose                        |
|--------|----------------------------------|------|--------------------------------|
| GET    | /api/v1/identity/challenge      | ✅   | Get liveness challenge         |
| POST   | /api/v1/identity/verify         | ✅   | Verify identity (multi-modal)  |

---

## App Verification APIs
| Method | Endpoint                        | Auth | Purpose                        |
|--------|----------------------------------|------|--------------------------------|
| POST   | /api/v1/apps/verify-file        | ✅   | Verify APK file                |
| POST   | /api/v1/apps/verify-package     | ✅   | Verify by package name         |
| POST   | /api/v1/apps/report             | ✅   | Report suspicious app          |

---

## System APIs
| Method | Endpoint                        | Auth | Purpose                        |
|--------|----------------------------------|------|--------------------------------|
| GET    | /api/v1/health                  | ❌   | Health check                   |
| GET    | /api/v1/docs                    | ❌   | Swagger API docs               |

---

## Request/Response Format
- **Authentication:**
  - Access token in `Authorization: Bearer <token>` header for all protected endpoints.
  - Tokens and user info stored in `localStorage`.
- **File Uploads:**
  - Use `multipart/form-data` for grievances, identity, and app verification uploads.
  - Enforce file size/type limits as per `.env` and backend docs.
- **Error Handling:**
  - Standard error response:
    ```json
    {
      "code": 400,
      "message": "Validation error",
      "requestId": "uuid",
      "errors": [
        { "field": "email", "message": "Invalid email format" }
      ]
    }
    ```

---

## Notes
- All endpoints are versioned and must be prefixed with `/api/v1`.
- No direct calls to ML microservices; all requests go through the API Gateway.
- For full details, see `FRONTEND_INTEGRATION_GUIDE.md` and backend Swagger docs.

---

**This file is auto-generated for integration clarity.**
