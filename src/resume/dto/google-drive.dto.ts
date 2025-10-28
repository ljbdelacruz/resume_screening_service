import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { GoogleDriveFileSummary } from '../interfaces/google-drive-file.interface';

export class GetRecentDriveFilesQueryDto {
  @ApiPropertyOptional({
    description: 'Number of minutes to look back when searching for files.',
    default: 60,
    minimum: 1,
    maximum: 1440,
  })
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  sinceMinutes?: number;

  @ApiProperty({
    description: 'Human readable Google Drive path, e.g. "MyDrive>JobApplication>Resume".',
    example: 'MyDrive>JobApplication>Resume',
  })
  @IsString()
  folderPath!: string;
}

export class GoogleDriveFileDto implements GoogleDriveFileSummary {
  @ApiProperty({ description: 'Google Drive file identifier.' })
  id!: string;

  @ApiProperty({ description: 'Name of the file.' })
  name!: string;

  @ApiProperty({ description: 'MIME type returned by Google Drive.' })
  mimeType!: string;

  @ApiProperty({ description: 'Timestamp when the file was created.', example: '2025-10-26T23:20:01.123Z' })
  createdTime!: string;

  @ApiPropertyOptional({ description: 'Timestamp when the file was last modified.' })
  modifiedTime?: string;

  @ApiPropertyOptional({ description: 'Size of the file in bytes.' })
  sizeBytes?: number;

  @ApiPropertyOptional({ description: 'URL that opens the file in Google Drive viewer.' })
  webViewLink?: string;

  @ApiProperty({ description: 'Direct download URL constructed for the resume analyzer.' })
  downloadUrl!: string;

  static from(summary: GoogleDriveFileSummary): GoogleDriveFileDto {
    return Object.assign(new GoogleDriveFileDto(), summary);
  }
}
