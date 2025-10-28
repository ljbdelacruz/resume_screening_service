import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@prisma/prisma.service';
import { AnalyzeResumeDto } from './dto/analyze-resume.dto';
import {
  type JobRoleEvaluation,
  ResumeAnalysisResult,
} from './interfaces/resume-analysis.interface';
import { ResumeParserService } from './services/resume-parser.service';
import { ResumeEvaluatorService } from './services/resume-evaluator.service';
import { type JobRole } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { CreateJobRoleDto } from './dto/create-job-role.dto';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resumeParser: ResumeParserService,
    private readonly resumeEvaluator: ResumeEvaluatorService,
    private readonly configService: ConfigService,
  ) {}

  async getJobRoles(filter?: { activeOnly?: boolean }): Promise<JobRole[]> {
    const where: Prisma.JobRoleWhereInput | undefined = filter?.activeOnly
      ? { isActive: true }
      : undefined;

    return this.prisma.jobRole.findMany({
      where,
      orderBy: {
        title: 'asc',
      },
    });
  }

  async createJobRole(payload: CreateJobRoleDto): Promise<JobRole> {
    try {
      return await this.prisma.jobRole.create({
        data: payload,
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Job role with title "${payload.title}" already exists.`);
      }

      throw error;
    }
  }

  async analyzeResume(payload: AnalyzeResumeDto): Promise<ResumeAnalysisResult> {
    this.logger.debug(`Analyzing resume for URL: ${payload.resumeUrl}`);

    const file = await this.resumeParser.fetchAndParse(payload.resumeUrl);
    const jobRoles = await this.prisma.jobRole.findMany({
      where: {
        isActive: true,
      },
    });

    const evaluation = await this.resumeEvaluator.evaluateResume({
      resumeText: file.textContent,
      jobRoles,
    });

    const defaultThreshold = this.configService.get<number>('app.resume.matchThreshold', 0.65);
    const matchThreshold = payload.matchThreshold ?? defaultThreshold;
    const candidateEmail = ResumeService.extractEmail(file.textContent);

    return {
      candidateEmail,
      resumeUrl: payload.resumeUrl,
      isMatch: evaluation.matches.some(
        (match: JobRoleEvaluation) => match.matchScore >= matchThreshold,
      ),
      matchThreshold,
      matches: evaluation.matches,
      fileMetadata: file.metadata,
      summary: evaluation.summary,
      modelVersion: evaluation.modelVersion,
    };
  }

  private static extractEmail(text: string): string | undefined {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/);
    return emailMatch?.[0]?.toLowerCase();
  }
}
