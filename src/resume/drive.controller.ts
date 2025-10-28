import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GoogleDriveService } from './services/google-drive.service';
import { GetRecentDriveFilesQueryDto, GoogleDriveFileDto } from './dto/google-drive.dto';

/**
 * Controller for Google Drive operations.
 * Handles fetching recent files from a specified Google Drive folder path.
 */
@ApiTags('Google Drive')
@Controller('resume/drive')
export class DriveController {
  constructor(
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  /**
   * Lists recent files from a Google Drive folder using a human-readable path.
   * 
   * @param authorization - Bearer token from Google OAuth2
   * @param query - Query parameters including folderPath and optional filters
   * @returns Array of files found within the specified time window
   * 
   * @example
   * GET /resume/drive/recent?folderPath=MyDrive>JobApplication>Resume&sinceMinutes=60
   */
  @Get('recent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List recent files from a Google Drive folder.' })
  @ApiBearerAuth()
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Files discovered within the requested look-back window.',
    type: GoogleDriveFileDto,
    isArray: true,
  })
  async listRecentFiles(
    @Headers('authorization') authorization: string | undefined,
    @Headers() headers: Record<string, string>,
    @Query() query: GetRecentDriveFilesQueryDto,
  ): Promise<GoogleDriveFileDto[]> {
    // Try to extract token from Authorization header first, then check all headers
    let accessToken = DriveController.extractBearerToken(authorization);
    
    // If not found, check if n8n sent it in a different header format
    if (!accessToken) {
      // Check for lowercase 'authorization' header (case-insensitive)
      const authHeader = Object.entries(headers).find(
        ([key]) => key.toLowerCase() === 'authorization'
      )?.[1];
      accessToken = DriveController.extractBearerToken(authHeader);
    }
    
    if (!accessToken) {
      // Log headers for debugging (remove sensitive data)
      const headerKeys = Object.keys(headers).join(', ');
      throw new UnauthorizedException(
        `No valid OAuth token found. Received headers: [${headerKeys}]. ` +
        'In n8n, turn OFF "Send Query Parameters" and ensure OAuth2 credential is configured.'
      );
    }

    const sinceMinutes = query.sinceMinutes ?? 60;
    const sinceDate = new Date(Date.now() - sinceMinutes * 60_000);

    const folderPathSegments = DriveController.extractFolderPathSegments(query.folderPath);

    if (!folderPathSegments) {
      throw new BadRequestException('Provide a valid folderPath (e.g., "MyDrive>JobApplication>Resume").');
    }

    const files = await this.googleDriveService.listRecentFiles({
      folderPathSegments,
      since: sinceDate,
      accessToken,
    });

    return files.map((file) => GoogleDriveFileDto.from(file));
  }

  /**
   * Extracts the Bearer token from the Authorization header.
   * 
   * @param headerValue - The Authorization header value
   * @returns The extracted token or undefined
   */
  private static extractBearerToken(headerValue?: string): string | undefined {
    if (!headerValue) {
      return undefined;
    }

    const [scheme, token] = headerValue.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return undefined;
    }

    return token;
  }

  /**
   * Parses a human-readable folder path into segments.
   * Handles paths like "MyDrive>JobApplication>Resume" or "MyDrive/JobApplication/Resume" and normalizes them.
   * 
   * @param path - The folder path string (supports both > and / as separators)
   * @returns Array of path segments or undefined if invalid
   */
  private static extractFolderPathSegments(path?: string): string[] | undefined {
    if (!path) {
      return undefined;
    }

    // Support both > and / as separators
    const separator = path.includes('>') ? '>' : '/';
    const segments = path
      .split(separator)
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);

    if (segments.length === 0) {
      return undefined;
    }

    const first = segments[0]?.toLowerCase().replace(/\s/g, '');
    if (first === 'mydrive') {
      segments.shift();
    }

    return segments.length > 0 ? segments : undefined;
  }
}
