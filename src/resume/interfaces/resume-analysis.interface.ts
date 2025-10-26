import { type JobRole } from '@prisma/client';

export interface ResumeFileMetadata {
  mimeType: string;
  extension: string;
  fileSizeBytes: number;
  sourceUrl: string;
}

export interface JobRoleEvaluation {
  jobRoleId: string;
  title: string;
  department: string;
  matchScore: number;
  rationale: string;
}

export interface ResumeEvaluationSummary {
  summary: string;
  modelVersion: string;
  evaluations: JobRoleEvaluation[];
  matches: JobRoleEvaluation[];
}

export interface ResumeEvaluationPayload {
  resumeText: string;
  jobRoles: JobRole[];
}

export interface ResumeAnalysisResult {
  candidateEmail?: string;
  resumeUrl: string;
  isMatch: boolean;
  matchThreshold: number;
  matches: JobRoleEvaluation[];
  fileMetadata: ResumeFileMetadata;
  summary: string;
  modelVersion: string;
}
