export interface GoogleDriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime?: string;
  sizeBytes?: number;
  webViewLink?: string;
  downloadUrl: string;
}
