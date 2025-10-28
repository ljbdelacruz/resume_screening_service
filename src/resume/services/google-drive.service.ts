import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { GoogleDriveFileSummary } from '../interfaces/google-drive-file.interface';

export interface ListRecentFilesOptions {
  folderId?: string;
  folderPathSegments?: string[];
  since: Date;
  mimeTypes?: string[];
  accessToken: string;
}

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);

  async listRecentFiles(options: ListRecentFilesOptions): Promise<GoogleDriveFileSummary[]> {
    const { folderId, folderPathSegments, since, accessToken, mimeTypes } = options;

    if (!accessToken) {
      throw new BadRequestException('accessToken is required to access Google Drive.');
    }

    this.logger.debug(`Attempting to access Google Drive with token (first 20 chars): ${accessToken.substring(0, 20)}...`);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: 'v3', auth });
    
    let resolvedFolderId: string | undefined;
    try {
      resolvedFolderId = await this.resolveFolderId({ drive, folderId, folderPathSegments });
      
      if (!resolvedFolderId) {
        throw new BadRequestException('Unable to resolve Google Drive folder. Provide folderId or a valid folderPath.');
      }
      
      this.logger.debug(`Successfully resolved folder ID: ${resolvedFolderId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to resolve folder: ${errorMessage}`);
      
      if (errorMessage?.includes('Invalid Credentials')) {
        throw new BadRequestException(
          'Google OAuth token is invalid or expired. Please check: ' +
          '1) Token has required scopes (https://www.googleapis.com/auth/drive.readonly), ' +
          '2) Token is not expired, ' +
          '3) Google Drive API is enabled in your Google Cloud project'
        );
      }
      throw error;
    }

    const sinceIso = since.toISOString();

    const queryConditions: string[] = [
      `'${resolvedFolderId}' in parents`,
      "mimeType != 'application/vnd.google-apps.folder'",
      'trashed = false',
      `modifiedTime >= '${sinceIso}'`,
    ];

    if (mimeTypes?.length) {
      const mimeQuery = mimeTypes.map((mime) => `mimeType='${mime.trim()}'`).join(' or ');
      queryConditions.push(`(${mimeQuery})`);
    }

    const request: drive_v3.Params$Resource$Files$List = {
      q: queryConditions.join(' and '),
      orderBy: 'modifiedTime desc',
      fields: 'files(id,name,mimeType,createdTime,modifiedTime,size),nextPageToken',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 100,
    };

    try {
      const summaries: GoogleDriveFileSummary[] = [];
      let nextPageToken: string | undefined;

      do {
        const { data } = await drive.files.list({ ...request, pageToken: nextPageToken });
        const files: drive_v3.Schema$File[] = data.files ?? [];

        const filtered = files.filter((file): file is drive_v3.Schema$File & { id: string } => Boolean(file.id));
        
        // Make files publicly accessible and add to summaries
        for (const file of filtered) {
          try {
            await this.makeFilePublic(drive, file.id);
            this.logger.debug(`Set public access for file: ${file.name} (${file.id})`);
          } catch (error) {
            this.logger.warn(`Failed to set public access for file ${file.id}: ${error instanceof Error ? error.message : String(error)}`);
            // Continue even if permission change fails
          }
          summaries.push(GoogleDriveService.mapFileToSummary(file));
        }

        nextPageToken = data.nextPageToken ?? undefined;
      } while (nextPageToken);

      this.logger.debug(
        `Found ${summaries.length} files modified since ${sinceIso} in folder ${resolvedFolderId}.`,
      );

      return summaries;
    } catch (error: unknown) {
      this.logger.error('Failed to list files from Google Drive', error as Error);
      throw error;
    }
  }

  private async resolveFolderId(params: {
    drive: drive_v3.Drive;
    folderId?: string;
    folderPathSegments?: string[];
  }): Promise<string | undefined> {
    if (params.folderId) {
      return params.folderId;
    }

    const segments = params.folderPathSegments;
    if (!segments || segments.length === 0) {
      return undefined;
    }

    let parentId: string | undefined;
    for (const segment of segments) {
      const search: drive_v3.Params$Resource$Files$List = {
        q: [
          `name='${segment}'`,
          parentId ? `'${parentId}' in parents` : "'root' in parents",
          "mimeType = 'application/vnd.google-apps.folder'",
          'trashed = false',
        ].join(' and '),
        fields: 'files(id)',
        pageSize: 2,
      };

      const { data } = await params.drive.files.list(search);
      const folders = data.files ?? [];

      if (folders.length === 0) {
        this.logger.warn(`Folder segment "${segment}" not found within path.`);
        return undefined;
      }

      parentId = folders[0]?.id ?? undefined;
      if (!parentId) {
        this.logger.warn(`Folder segment "${segment}" missing id in response.`);
        return undefined;
      }
    }

    return parentId;
  }

  /**
   * Makes a Google Drive file publicly accessible (anyone with the link can view).
   * This allows downloading the file without authentication.
   * 
   * @param drive - Google Drive API instance
   * @param fileId - ID of the file to make public
   */
  private async makeFilePublic(drive: drive_v3.Drive, fileId: string): Promise<void> {
    try {
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (error) {
      // If permission already exists, that's fine
      if (error instanceof Error && !error.message.includes('duplicate')) {
        throw error;
      }
    }
  }

  private static mapFileToSummary(file: drive_v3.Schema$File & { id: string }): GoogleDriveFileSummary {
    const createdTime = file.createdTime ?? new Date().toISOString();
    const modifiedTime = file.modifiedTime ?? createdTime;

    return {
      id: file.id,
      name: file.name ?? 'Untitled',
      mimeType: file.mimeType ?? 'application/octet-stream',
      createdTime,
      modifiedTime,
      sizeBytes: file.size ? Number(file.size) : undefined,
      webViewLink: `https://drive.google.com/file/d/${file.id}/view`,
      downloadUrl: `https://drive.google.com/uc?id=${file.id}&export=download`,
    };
  }
}
