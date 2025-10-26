import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl } from 'class-validator';

export class AnalyzeResumeDto {
  @ApiProperty({
    description: 'Publicly accessible URL pointing to the candidate resume file (PDF, DOCX, TXT).',
    example: 'https://drive.google.com/uc?id=abc123',
  })
  @IsUrl({ protocols: ['http', 'https'] })
  @IsNotEmpty()
  resumeUrl!: string;
}
