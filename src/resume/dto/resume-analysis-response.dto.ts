import { ApiProperty } from '@nestjs/swagger';
import { type JobRoleEvaluation, type ResumeAnalysisResult, type ResumeFileMetadata } from '../interfaces/resume-analysis.interface';

export class ResumeFileMetadataDto implements ResumeFileMetadata {
  @ApiProperty({ description: 'Detected MIME type of the resume file.', example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ description: 'File extension inferred from MIME type or content.', example: 'pdf' })
  extension!: string;

  @ApiProperty({ description: 'File size in bytes.', example: 245678 })
  fileSizeBytes!: number;

  @ApiProperty({ description: 'Original source URL for the resume.', example: 'https://drive.google.com/uc?id=abc123' })
  sourceUrl!: string;
}

export class JobRoleEvaluationDto implements JobRoleEvaluation {
  @ApiProperty({ description: 'Identifier of the evaluated job role.' })
  jobRoleId!: string;

  @ApiProperty({ description: 'Title of the job role.' })
  title!: string;

  @ApiProperty({ description: 'Department or team of the job role.' })
  department!: string;

  @ApiProperty({ description: 'Match score between 0 and 1 returned by Gemini.', example: 0.82 })
  matchScore!: number;

  @ApiProperty({ description: 'LLM-provided rationale describing resume alignment.' })
  rationale!: string;
}

export class ResumeAnalysisResponseDto implements ResumeAnalysisResult {
  @ApiProperty({ description: 'Email address detected in the resume, if any.', required: false, example: 'alex@example.com' })
  candidateEmail?: string;

  @ApiProperty({ description: 'Resume URL that was analyzed.' })
  resumeUrl!: string;

  @ApiProperty({ description: 'Indicates if any job role meets or exceeds the match threshold.' })
  isMatch!: boolean;

  @ApiProperty({ description: 'Threshold used to determine matching roles.', example: 0.65 })
  matchThreshold!: number;

  @ApiProperty({
    description: 'Evaluated job roles and their match scores.',
    type: () => [JobRoleEvaluationDto],
  })
  matches!: JobRoleEvaluationDto[];

  @ApiProperty({ description: 'Metadata about the processed resume file.', type: () => ResumeFileMetadataDto })
  fileMetadata!: ResumeFileMetadataDto;

  @ApiProperty({ description: 'Gemini-generated summary of the candidate fit.' })
  summary!: string;

  @ApiProperty({ description: 'Gemini model version used for evaluation.', example: 'gemini-1.5-flash' })
  modelVersion!: string;

  static from(result: ResumeAnalysisResult): ResumeAnalysisResponseDto {
    // Exclude candidateName if present on legacy payloads
    const { matches, fileMetadata, ...rest } = result as ResumeAnalysisResult & {
      candidateName?: string;
    };

    return Object.assign(new ResumeAnalysisResponseDto(), rest, {
      matches: result.matches.map((match) => Object.assign(new JobRoleEvaluationDto(), match)),
      fileMetadata: Object.assign(new ResumeFileMetadataDto(), result.fileMetadata),
    });
  }
}
