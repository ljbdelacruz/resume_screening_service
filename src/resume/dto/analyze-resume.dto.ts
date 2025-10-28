import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsUrl, Max, Min } from 'class-validator';

export class AnalyzeResumeDto {
  @ApiProperty({
    description: 'Publicly accessible URL pointing to the candidate resume file (PDF, DOCX, TXT).',
    example: 'https://drive.google.com/uc?id=abc123',
  })
  @IsUrl({ protocols: ['http', 'https'] })
  @IsNotEmpty()
  resumeUrl!: string;

  @ApiPropertyOptional({
    description: 'Match threshold (0-1) to determine if a candidate is a match. Defaults to 0.65 (65%).',
    example: 0.6,
    minimum: 0,
    maximum: 1,
    default: 0.65,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  matchThreshold?: number;
}
