# Agentic AI Resume Scanner

## Demo Video:
> watch how i utilized this service in n8n
https://www.youtube.com/watch?v=uryGBGjsKbo


NestJS API for analyzing resumes against predefined job roles using Google Gemini and Prisma/PostgreSQL.

## Features

- Uploads resume links (Google Drive or other URLs) via REST API.
- Downloads PDF, DOCX, or TXT resume files and extracts text content.
- Evaluates resume content against seeded job roles stored in PostgreSQL.
- Uses Google Gemini to score and summarize fit for each role.
- Returns the original resume URL, candidate info, and Gemini evaluation summary when matched.

## Tech Stack

- NestJS 10
- Prisma ORM + PostgreSQL
- Google Gemini API (`@google/generative-ai`)
- file-type, pdf-parse, mammoth for document parsing

## Prerequisites

1. Node.js >= 18.18.0 and npm >= 9.8.0
2. PostgreSQL database
3. Google Gemini API key (`GEMINI_API_KEY`)
4. n8n (optional) for orchestration

## Setup

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Apply migrations (creates tables)
npx prisma migrate dev --name init

# Seed initial job roles
npm run db:seed
```

## Environment Variables

Create `.env`:

```
NODE_ENV=development
PORT=3000
APP_GLOBAL_PREFIX=api
DATABASE_URL=postgresql://user:password@localhost:5432/resume_scanner
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=models/gemini-2.0-flash
GEMINI_SAFETY_THRESHOLD=0.6
RESUME_MATCH_THRESHOLD=0.65
RESUME_MAX_FILE_SIZE_MB=15
PRISMA_LOG_QUERIES=false
```

## Running the API

```bash
# Development
npm run start:dev

# Production build
npm run build
npm run start
```

## API Documentation (Swagger)

Swagger is enabled by default when `SWAGGER_ENABLED=true`.

- URL: `http://localhost:3000/docs` (customize with `SWAGGER_PATH`).
- Title, description, and version controlled by `SWAGGER_TITLE`, `SWAGGER_DESCRIPTION`, `SWAGGER_VERSION` env vars.
- Docs reflect DTO validation/session metadata for resume analysis endpoint.

## API Usage

### Analyze Resume

`POST /api/resume/analyze`

**Request Body**

```json
{
  "resumeUrl": "https://drive.google.com/uc?id=..."
}
```

**Response**

```json
{
  "resumeUrl": "https://...",
  "candidateEmail": "alex@example.com",
  "isMatch": true,
  "matchThreshold": 0.65,
  "matches": [
    {
      "jobRoleId": "...",
      "title": "AI Automation Specialist",
      "department": "Innovation Lab",
      "matchScore": 0.82,
      "rationale": "Candidate has strong automation experience..."
    }
  ],
  "fileMetadata": {
    "mimeType": "application/pdf",
    "extension": "pdf",
    "fileSizeBytes": 234567,
    "sourceUrl": "https://..."
  },
  "summary": "Overall fit for AI automation initiatives...",
  "modelVersion": "gemini-1.5-flash"
}
```

### List Job Roles

`GET /api/resume/roles`

Query Parameters:

- `activeOnly` (optional, boolean) – when `true`, returns only roles where `isActive` is `true`.

**Response**

```json
[
  {
    "id": "clu123xyz456",
    "title": "AI Automation Specialist",
    "department": "Innovation Lab",
    "summary": "Automate business workflows using low-code tools and LLM integrations.",
    "requirements": "- Hands-on n8n or similar automation platform experience\n- Ability to design LLM prompts and safeguard workflows from prompt injection\n- Familiarity with Google Gemini or OpenAI models\n- Strong communication and documentation habits",
    "isActive": true
  }
]
```

### Create Job Role

`POST /api/resume/roles`

**Request Body**

```json
{
  "title": "LLM Safety Engineer",
  "department": "Trust & Safety",
  "summary": "Safeguard AI automations against prompt attacks.",
  "requirements": "- Experience with prompt injection defenses\n- Auditing LLM outputs",
  "isActive": false
}
```

**Response**

```json
{
  "id": "clu456uvw789",
  "title": "LLM Safety Engineer",
  "department": "Trust & Safety",
  "summary": "Safeguard AI automations against prompt attacks.",
  "requirements": "- Experience with prompt injection defenses\n- Auditing LLM outputs",
  "isActive": false
}
```

### List Google Drive files added in the past hour

`GET /api/resume/drive/recent`

Provide an OAuth access token issued for Google Drive (scope `drive.readonly` is sufficient). n8n can obtain this token and forward it via the `Authorization` header. The API uses `GOOGLE_DRIVE_RESUME_FOLDER_ID` as the default folder when no `folderId` query parameter is supplied.

**Headers**

```
Authorization: Bearer ya29.a0Af...
```

**Query Parameters**

- `sinceMinutes` (optional, default `60`) – look-back window in minutes.
- `folderId` (optional) – override the default folder ID.
- `mimeTypes` (optional) – comma-separated MIME types to include (e.g. `application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document`).

**Response**

```json
[
  {
    "id": "1jLwiysK-nX0ocZ7JUGj33qy_en_KfyWd",
    "name": "MyResume2025.pdf",
    "mimeType": "application/pdf",
    "createdTime": "2025-10-26T23:15:00.000Z",
    "modifiedTime": "2025-10-26T23:20:00.000Z",
    "sizeBytes": 122880,
    "webViewLink": "https://drive.google.com/file/d/1jLwiysK-nX0ocZ7JUGj33qy_en_KfyWd/view",
    "downloadUrl": "https://drive.google.com/uc?id=1jLwiysK-nX0ocZ7JUGj33qy_en_KfyWd&export=download"
  }
]
```

## Testing with n8n

Configure n8n HTTP Request node to POST resume URLs to `/api/resume/analyze`. Use the response body to continue candidate workflows.
