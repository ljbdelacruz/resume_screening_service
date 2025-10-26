import { registerAs } from '@nestjs/config';

type ResumeScannerConfig = {
  port: number;
  globalPrefix: string;
  prisma: {
    logQueries: boolean;
  };
  gemini: {
    apiKey: string;
    model: string;
    safetyThreshold: number;
  };
  resume: {
    matchThreshold: number;
    maxFileSizeBytes: number;
  };
  swagger: {
    enabled: boolean;
    path: string;
    title: string;
    description: string;
    version: string;
  };
};

export default registerAs<ResumeScannerConfig>('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  globalPrefix: process.env.APP_GLOBAL_PREFIX ?? 'api',
  prisma: {
    logQueries: process.env.PRISMA_LOG_QUERIES === 'true',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'models/gemini-1.5-flash',
    safetyThreshold: parseFloat(process.env.GEMINI_SAFETY_THRESHOLD ?? '0.6'),
  },
  resume: {
    matchThreshold: parseFloat(process.env.RESUME_MATCH_THRESHOLD ?? '0.65'),
    maxFileSizeBytes:
      parseInt(process.env.RESUME_MAX_FILE_SIZE_MB ?? '15', 10) * 1024 * 1024,
  },
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    path: process.env.SWAGGER_PATH ?? 'docs',
    title: process.env.SWAGGER_TITLE ?? 'Agentic AI Resume Scanner API',
    description:
      process.env.SWAGGER_DESCRIPTION ??
      'REST API documentation for AI-powered resume analysis workflows.',
    version: process.env.SWAGGER_VERSION ?? '1.0.0',
  },
}));
