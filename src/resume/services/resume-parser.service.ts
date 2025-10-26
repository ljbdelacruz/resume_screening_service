import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { type AxiosResponse } from 'axios';
import { fileTypeFromBuffer } from 'file-type';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import { ResumeFileMetadata } from '../interfaces/resume-analysis.interface';

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
};

const SUPPORTED_EXTENSIONS = new Set(Object.keys(EXTENSION_TO_MIME));

export interface ParsedResumeFile {
  textContent: string;
  metadata: ResumeFileMetadata;
}

@Injectable()
export class ResumeParserService {
  private readonly logger = new Logger(ResumeParserService.name);

  constructor(private readonly configService: ConfigService) {}

  async fetchAndParse(resumeUrl: string): Promise<ParsedResumeFile> {
    const { buffer: rawBuffer, headers } = await this.downloadResume(resumeUrl);
    const maxBytes = this.configService.get<number>('app.resume.maxFileSizeBytes', 15 * 1024 * 1024);

    if (rawBuffer.byteLength > maxBytes) {
      throw new BadRequestException('Resume file exceeds the allowed size limit.');
    }

    const detectedType = await fileTypeFromBuffer(rawBuffer);
    const headerMime = ResumeParserService.extractMimeFromHeaders(headers);
    const extension = detectedType?.ext ?? ResumeParserService.mapMimeToExtension(headerMime);

    if (!extension || !SUPPORTED_EXTENSIONS.has(extension)) {
      throw new BadRequestException('Unsupported resume file type. Please upload PDF, DOCX, or TXT files.');
    }

    const mimeType = detectedType?.mime ?? EXTENSION_TO_MIME[extension];

    let textContent: string;
    switch (extension) {
      case 'pdf':
        textContent = await this.extractPdf(rawBuffer);
        break;
      case 'docx':
        textContent = await this.extractDocx(rawBuffer);
        break;
      case 'txt':
        textContent = rawBuffer.toString('utf8');
        break;
      default:
        throw new BadRequestException('Unsupported resume file type.');
    }

    const cleanedText = ResumeParserService.cleanText(textContent);

    const metadata: ResumeFileMetadata = {
      mimeType,
      extension,
      fileSizeBytes: rawBuffer.byteLength,
      sourceUrl: resumeUrl,
    };

    if (!cleanedText || cleanedText.length < 100) {
      this.logger.warn(`Resume text content appears too short after parsing. Length: ${cleanedText.length}`);
    }

    return {
      textContent: cleanedText,
      metadata,
    };
  }

  private async downloadResume(resumeUrl: string): Promise<{ buffer: Buffer; headers: Record<string, unknown> }> {
    const normalizedUrl = this.normalizeGoogleDriveUrl(resumeUrl);

    const initialResponse = await axios.get<ArrayBuffer>(normalizedUrl, {
      responseType: 'arraybuffer',
      timeout: 15_000,
      maxContentLength: Infinity,
      validateStatus: (status) => status >= 200 && status < 300,
    });

    if (this.isGoogleDriveHtmlResponse(initialResponse)) {
      const followUp = await this.followGoogleDriveConfirmation(normalizedUrl, initialResponse);
      return {
        buffer: Buffer.from(followUp.data),
        headers: followUp.headers as Record<string, unknown>,
      };
    }

    return {
      buffer: Buffer.from(initialResponse.data),
      headers: initialResponse.headers as Record<string, unknown>,
    };
  }

  private normalizeGoogleDriveUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('drive.google.com')) {
        const fileId = ResumeParserService.extractDriveFileId(parsed);
        if (!fileId) {
          return url;
        }

        return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }

      if (parsed.hostname.includes('docs.google.com') && parsed.pathname.includes('/document/')) {
        const docId = ResumeParserService.extractDriveFileId(parsed);
        if (!docId) {
          return url;
        }

        return `https://docs.google.com/document/d/${docId}/export?format=pdf`; // export Google Docs as PDF
      }

      return url;
    } catch (error: unknown) {
      this.logger.warn(`Failed to normalize Google Drive URL: ${url}`, error as Error);
      return url;
    }
  }

  private static extractDriveFileId(parsedUrl: URL): string | undefined {
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const idIndex = segments.findIndex((segment) => segment === 'd');
    if (idIndex !== -1 && segments[idIndex + 1]) {
      return segments[idIndex + 1];
    }

    const searchParams = parsedUrl.searchParams.get('id');
    if (searchParams) {
      return searchParams;
    }

    return undefined;
  }

  private isGoogleDriveHtmlResponse(response: AxiosResponse<ArrayBuffer>): boolean {
    const contentType = response.headers['content-type'];
    if (!contentType || typeof contentType !== 'string') {
      return false;
    }

    if (!contentType.includes('text/html')) {
      return false;
    }

    const html = Buffer.from(response.data).toString('utf8');
    return /download_warning|uc-download-link|drive-viewer/i.test(html);
  }

  private async followGoogleDriveConfirmation(
    normalizedUrl: string,
    response: AxiosResponse<ArrayBuffer>,
  ): Promise<AxiosResponse<ArrayBuffer>> {
    const html = Buffer.from(response.data).toString('utf8');
    const confirmToken = html.match(/confirm=([0-9A-Za-z_]+)/)?.[1];

    if (!confirmToken) {
      throw new BadRequestException('Google Drive file requires confirmation and could not be downloaded automatically.');
    }

    const url = new URL(normalizedUrl);
    url.searchParams.set('confirm', confirmToken);

    const cookies = response.headers['set-cookie'];
    const cookieHeader = Array.isArray(cookies) ? cookies.map((cookie) => cookie.split(';')[0]).join('; ') : undefined;

    return axios.get<ArrayBuffer>(url.toString(), {
      responseType: 'arraybuffer',
      timeout: 15_000,
      maxContentLength: Infinity,
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      validateStatus: (status) => status >= 200 && status < 300,
    });
  }

  private static extractMimeFromHeaders(headers: Record<string, unknown>): string | undefined {
    const rawHeader = headers['content-type'];
    if (typeof rawHeader !== 'string') {
      return undefined;
    }

    return rawHeader.split(';')[0]?.trim();
  }

  private static mapMimeToExtension(mimeType?: string): string | undefined {
    if (!mimeType) {
      return undefined;
    }

    return Object.entries(EXTENSION_TO_MIME).find(([, value]) => value === mimeType)?.[0];
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    const parsed = await pdf(buffer);
    return parsed.text;
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  private static cleanText(input: string): string {
    return input
      .replace(/\u0000/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
