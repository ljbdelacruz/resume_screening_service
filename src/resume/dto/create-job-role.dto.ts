import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateJobRoleDto {
  @ApiProperty({ description: 'Unique title for the job role.', example: 'LLM Safety Engineer' })
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ description: 'Department or team responsible for the role.', example: 'Trust & Safety' })
  @IsString()
  @MaxLength(120)
  department!: string;

  @ApiProperty({ description: 'Concise summary of the role.', example: 'Safeguard AI automations against prompt attacks.' })
  @IsString()
  summary!: string;

  @ApiProperty({ description: 'Detailed requirements listed in bullet form.', example: '- Experience with prompt injection defenses\n- Auditing LLM outputs' })
  @IsString()
  requirements!: string;

  @ApiPropertyOptional({ description: 'Whether the role is active for resume matching.', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
