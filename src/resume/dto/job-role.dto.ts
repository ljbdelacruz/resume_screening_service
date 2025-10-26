import { ApiProperty } from '@nestjs/swagger';
import { type JobRole } from '@prisma/client';

export class JobRoleDto {
  @ApiProperty({ description: 'Identifier for the job role.', example: 'clu123xyz456' })
  id!: string;

  @ApiProperty({ description: 'Title of the job role.', example: 'AI Automation Specialist' })
  title!: string;

  @ApiProperty({ description: 'Department that owns this job role.', example: 'Innovation Lab' })
  department!: string;

  @ApiProperty({ description: 'High-level overview of the position.' })
  summary!: string;

  @ApiProperty({ description: 'Detailed requirements or qualifications.', example: '- 5+ years experience\n- LLM prompt design' })
  requirements!: string;

  @ApiProperty({ description: 'Indicates whether the role should be considered during resume matching.', example: true })
  isActive!: boolean;

  static from(role: JobRole): JobRoleDto {
    return Object.assign(new JobRoleDto(), role);
  }
}
