# Resume Module

## Overview
The Resume module provides functionality for scanning, parsing, and evaluating resumes from Google Drive. It's designed to integrate with n8n workflows for automated resume processing.

## Features

### 1. Google Drive Integration (`DriveController`)
Fetches recent files from Google Drive folders using human-readable paths.

#### Endpoint
```
GET /resume/drive/recent
```

#### Parameters
- **folderPath** (required): Human-readable folder path (e.g., `MyDrive>JobApplication>Resume`)
- **sinceMinutes** (optional): Look-back window in minutes (default: 60, max: 1440)

#### Authentication
Requires Google OAuth2 Bearer token in the `Authorization` header:
```
Authorization: Bearer <google-oauth-token>
```

#### Response
Returns an array of files with download URLs:
```json
[
  {
    "id": "1jLwiysK-nX0ocZ7JUGj33qy_en_KfyWd",
    "name": "resume.pdf",
    "mimeType": "application/pdf",
    "createdTime": "2025-10-27T00:00:00.000Z",
    "downloadUrl": "https://drive.google.com/uc?id=1jLwiysK-nX0ocZ7JUGj33qy_en_KfyWd&export=download"
  }
]
```

### 2. Resume Processing (`ResumeController`)
Handles resume parsing and evaluation.

#### Endpoint
```
POST /resume/analyze
```

#### Parameters
- **resumeUrl** (required): Publicly accessible URL to the resume file
- **matchThreshold** (optional): Match threshold (0-1) to determine if candidate is a match (default: 0.65)

#### Example Request
```json
{
  "resumeUrl": "https://drive.google.com/uc?id=abc123&export=download",
  "matchThreshold": 0.6
}
```

#### Response
Returns analysis with `isMatch` set to `true` if any job role score >= matchThreshold.

## Architecture

### Controllers
- **`DriveController`**: Manages Google Drive file operations
- **`ResumeController`**: Handles resume parsing and evaluation

### Services
- **`GoogleDriveService`**: Interfaces with Google Drive API
  - Resolves folder paths to folder IDs
  - Lists files with time-based filtering
  - Generates download URLs
- **`ResumeParserService`**: Parses resume content
- **`ResumeEvaluatorService`**: Evaluates resume quality

### DTOs
- **`GetRecentDriveFilesQueryDto`**: Query parameters for recent files endpoint
- **`GoogleDriveFileDto`**: Response format for Google Drive files

## Design Decisions

### Why `folderPath` instead of `folderId`?
1. **User-Friendly**: Easier to configure in n8n workflows
2. **Maintainable**: No need to look up folder IDs manually
3. **Flexible**: Can change folder structure without updating IDs
4. **Simplified**: Removes dependency on configuration service for default folder IDs

### Automatic Public Access
When files are fetched, the API automatically sets their permissions to "anyone with the link can view". This ensures:
- Download URLs work without authentication
- No permission errors when processing files
- Seamless integration with resume analyzer endpoint

### Path Format
- Uses `>` as separator (e.g., `MyDrive>JobApplication>Resume`)
- Automatically strips "MyDrive" prefix if present
- Normalizes whitespace in path segments

## Integration with n8n

### Typical Workflow
1. **Cron Trigger**: n8n workflow runs every hour
2. **OAuth2**: n8n manages Google OAuth2 token
3. **API Call**: Calls `/resume/drive/recent` with token and folder path
4. **Process Files**: Forwards download URLs to resume processing endpoint
5. **Store Results**: Saves parsed resume data to database

### Example n8n Configuration
```javascript
// HTTP Request Node
{
  "method": "GET",
  "url": "https://your-api.com/resume/drive/recent",
  "qs": {
    "folderPath": "MyDrive>JobApplication>Resume",
    "sinceMinutes": 60
  },
  "authentication": "oAuth2",
  "headers": {
    "Authorization": "Bearer {{$auth.token}}"
  }
}
```

## Development

### Adding New Features
1. Create service methods in appropriate service class
2. Add DTOs for request/response validation
3. Implement controller endpoints
4. Update this README with usage examples
5. Add tests for new functionality

### Testing
```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Test with curl
curl -X GET "http://localhost:3000/resume/drive/recent?folderPath=MyDrive>JobApplication>Resume" \
  -H "Authorization: Bearer YOUR_GOOGLE_OAUTH_TOKEN"
```

## Error Handling

### Common Errors
- **401 Unauthorized**: Missing or invalid OAuth token
- **400 Bad Request**: Invalid or missing `folderPath`
- **404 Not Found**: Folder path doesn't exist in Google Drive
- **403 Forbidden**: Token doesn't have access to the folder

### Best Practices
1. Always validate OAuth token before making requests
2. Use specific error messages for debugging
3. Log errors for monitoring and troubleshooting
4. Handle rate limits from Google Drive API

## Maintenance

### Updating Dependencies
```bash
# Update NestJS packages
npm update @nestjs/common @nestjs/core

# Update Google APIs
npm update googleapis
```

### Monitoring
- Check logs for OAuth token expiration
- Monitor API rate limits
- Track file processing success/failure rates

## Future Enhancements
- [ ] Support for multiple folder paths in single request
- [ ] Batch file processing
- [ ] Webhook support for real-time file notifications
- [ ] Resume deduplication
- [ ] Advanced filtering (file size, name patterns)
