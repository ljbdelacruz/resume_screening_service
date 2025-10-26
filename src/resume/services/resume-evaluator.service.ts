import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { JobRoleEvaluation, ResumeEvaluationPayload, ResumeEvaluationSummary } from '../interfaces/resume-analysis.interface';

@Injectable()
export class ResumeEvaluatorService {
  private readonly logger = new Logger(ResumeEvaluatorService.name);
  private readonly model: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('app.gemini.apiKey');
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Set GEMINI_API_KEY environment variable.');
    }

    this.model = new GoogleGenerativeAI(apiKey);
  }

  async evaluateResume(payload: ResumeEvaluationPayload): Promise<ResumeEvaluationSummary & { matches: JobRoleEvaluation[] }> {
    const modelName = this.configService.get<string>('app.gemini.model') ?? 'models/gemini-1.5-flash';
    const safetyThreshold = this.configService.get<number>('app.gemini.safetyThreshold', 0.6);

    const prompt = this.buildPrompt(payload);

    try {
      const generativeModel = this.model.getGenerativeModel({ model: modelName });
      const response = await generativeModel.generateContent(prompt);
      const text = response.response.text();
      return this.parseModelResponse(text, safetyThreshold);
    } catch (error: unknown) {
      this.logger.error('Failed to evaluate resume with Gemini', error as Error);
      throw error;
    }
  }

  private buildPrompt(payload: ResumeEvaluationPayload): string {
    const roleDescriptions = payload.jobRoles
      .map((role, index) => `Role ${index + 1}: ${role.title} (${role.department})\nSummary: ${role.summary}\nRequirements: ${role.requirements}`)
      .join('\n\n');

    return `You are an ATS resume screener. Evaluate the following resume text against the provided job roles. Respond strictly in JSON with fields: summary (string), modelVersion (string), evaluations (array of { jobRoleId, title, department, matchScore (0-1), rationale }), matches (array same schema but only include ones meeting threshold). Ensure matches array is subset of evaluations and matchScore numeric.

Resume Text:
${payload.resumeText}

Job Roles:
${roleDescriptions}
`;
  }

  private parseModelResponse(rawText: string, fallbackThreshold: number): ResumeEvaluationSummary & { matches: JobRoleEvaluation[] } {
    try {
      const sanitized = ResumeEvaluatorService.extractJson(rawText);
      const parsed = JSON.parse(sanitized) as ResumeEvaluationSummary & { matches?: JobRoleEvaluation[] };
      const matches = parsed.matches ?? parsed.evaluations.filter((evaluation) => evaluation.matchScore >= fallbackThreshold);
      return {
        summary: parsed.summary,
        modelVersion: parsed.modelVersion ?? 'gemini-unknown',
        evaluations: parsed.evaluations,
        matches,
      };
    } catch (error: unknown) {
      this.logger.error('Failed to parse Gemini response', error as Error);
      throw error;
    }
  }

  private static extractJson(rawText: string): string {
    const trimmed = rawText.trim();

    if (trimmed.startsWith('```')) {
      const withoutFence = trimmed.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
      return ResumeEvaluatorService.extractJson(withoutFence);
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1);
    }

    return trimmed;
  }
}
