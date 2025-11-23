# Complaint Portal API Documentation

## Overview

This is a simplified complaint management backend API with the following features:

- Register new complaints with priority levels
- View list of registered complaints
- Support for file uploads (screenshots, evidence)
- Audio input support (future - transcription can be done on frontend)

## Base URL

`http://localhost:8000/api/v1`

## Endpoints

### 1. Health Check

**GET** `/health`

Check if the API is running.

**Response:**

```json
{
  "status": "healthy"
}
```

---

### 2. API Root

**GET** `/api/v1/`

Get API metadata.

**Response:**

```json
{
  "service": "Complaint Portal API",
  "status": "active",
  "version": "1.0.0"
}
```

---

### 3. Create Complaint

**POST** `/api/v1/complaints`

Register a new complaint.

**Request Body:**

```json
{
  "user_id": "user123",
  "title": "Fraud transaction on my account",
  "description": "I received a suspicious debit of ₹5000 from an unknown app",
  "priority": "critical",
  "channel": "web",
  "file_uploads": [
    "https://example.com/screenshot1.png",
    "https://example.com/screenshot2.png"
  ]
}
```

**Fields:**

- `user_id` (optional): User identifier
- `title` (required): Short title of the complaint
- `description` (required): Detailed description of the complaint
- `priority` (optional): One of `critical`, `moderate`, `basic` (default: `basic`)
- `channel` (optional): Channel of submission (default: `web`)
- `file_uploads` (optional): Array of URLs or paths to uploaded files (screenshots, evidence)

**Response (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user123",
  "title": "Fraud transaction on my account",
  "description": "I received a suspicious debit of ₹5000 from an unknown app",
  "priority": "critical",
  "channel": "web",
  "file_uploads": [
    "https://example.com/screenshot1.png",
    "https://example.com/screenshot2.png"
  ],
  "status": "new"
}
```

---

### 4. List Complaints

**GET** `/api/v1/complaints`

Get a list of all complaints.

**Query Parameters:**

- `user_id` (optional): Filter by user ID
- `status` (optional): Filter by status (e.g., `new`, `in_progress`, `resolved`)

**Response (200 OK):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user123",
    "title": "Fraud transaction on my account",
    "description": "I received a suspicious debit of ₹5000 from an unknown app",
    "priority": "critical",
    "channel": "web",
    "file_uploads": ["https://example.com/screenshot1.png"],
    "status": "new"
  }
]
```

---

### 5. Get Single Complaint

**GET** `/api/v1/complaints/{complaint_id}`

Get details of a specific complaint.

**Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user123",
  "title": "Fraud transaction on my account",
  "description": "I received a suspicious debit of ₹5000 from an unknown app",
  "priority": "critical",
  "channel": "web",
  "file_uploads": ["https://example.com/screenshot1.png"],
  "status": "new"
}
```

**Response (404 Not Found):**

```json
{
  "detail": "Complaint not found"
}
```

---

## Database Schema

### Complaints Table

```sql
CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(128),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'basic',
    channel VARCHAR(50) NOT NULL DEFAULT 'web',
    file_uploads JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'new'
);
```

---

## Priority Levels

- **critical**: Urgent issues like fraud, security breaches, unauthorized transactions
- **moderate**: Issues that need attention but aren't immediately critical
- **basic**: General inquiries or minor issues

---

## Audio Input Support

The backend accepts text descriptions. For voice input:

1. Use browser's Web Speech API or a third-party service to transcribe audio to text on the frontend
2. Send the transcribed text as the `description` field
3. Optionally, store the audio file and include its URL in `file_uploads`

---

## File Upload Support

The backend accepts file URLs/paths in the `file_uploads` array. For file upload:

1. Implement a separate file upload endpoint or use cloud storage (S3, Firebase, etc.)
2. Upload files and get their URLs
3. Include the URLs in the `file_uploads` array when creating a complaint

---

## Running the API

### Start the server:

```bash
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Run the API
python app.py
```

The API will be available at `http://localhost:8000`

### Environment Variables:

- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql+asyncpg://postgres:postgres@localhost:5432/complaints_db`)
- `AUTO_CREATE_TABLES`: Set to `true` to automatically create database tables on startup
- `PORT`: Server port (default: 8000)
- `DEBUG`: Enable debug mode (default: false)

---

## Testing

Run smoke tests:

```bash
python check_backend_smoke.py
```

Run full test suite:

```bash
pytest tests/
```
