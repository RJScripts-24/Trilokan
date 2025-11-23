# API Documentation

This document defines the API endpoints, request/response schemas, and error codes for the Identity Verifier service.

## Endpoints

### 1. `/verify-identity`
- **Method:** POST
- **Description:** Submits user data for identity verification.
- **Request Body:**
  - `user_id` (string, required)
  - `document_image` (base64-encoded string, required)
  - `audio_sample` (base64-encoded string, optional)
- **Response:**
  - `verification_result` (string: `success` | `failure` | `pending`)
  - `score` (float)
  - `errors` (array of error codes, optional)

### 2. `/challenge`
- **Method:** GET
- **Description:** Fetches a new liveness or knowledge challenge for the user.
- **Response:**
  - `challenge_id` (string)
  - `challenge_type` (string: `liveness` | `knowledge`)
  - `challenge_data` (object)

### 3. `/submit-challenge`
- **Method:** POST
- **Description:** Submits a response to a challenge.
- **Request Body:**
  - `challenge_id` (string, required)
  - `response_data` (object, required)
- **Response:**
  - `result` (string: `pass` | `fail`)
  - `errors` (array of error codes, optional)

## Error Codes
- `INVALID_INPUT`: Malformed or missing fields
- `UNAUTHORIZED`: Invalid credentials or session
- `CHALLENGE_EXPIRED`: Challenge no longer valid
- `INTERNAL_ERROR`: Unexpected server error

## Notes
- All endpoints return JSON.
- Authentication is required for all endpoints except `/challenge`.
