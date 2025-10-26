import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnalyzeResumeDto } from './dto/analyze-resume.dto';
import { ResumeAnalysisResponseDto } from './dto/resume-analysis-response.dto';
import { ResumeService } from './resume.service';
import { JobRoleDto } from './dto/job-role.dto';
import { CreateJobRoleDto } from './dto/create-job-role.dto';

@ApiTags('Resume')
@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Get('roles')
  @ApiOperation({ summary: 'Retrieve job roles available for resume matching.' })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description: 'When true, only roles marked as active are returned.',
  })
  @ApiOkResponse({ type: JobRoleDto, isArray: true })
  async getJobRoles(@Query('activeOnly') activeOnly?: string): Promise<JobRoleDto[]> {
    const filterActive = activeOnly === undefined ? undefined : activeOnly === 'true';
    const roles = await this.resumeService.getJobRoles({ activeOnly: filterActive });
    return roles.map((role) => JobRoleDto.from(role));
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create a new job role that can be used during resume analysis.' })
  @ApiCreatedResponse({ description: 'Created job role with its persisted state.', type: JobRoleDto })
  async createJobRole(@Body() payload: CreateJobRoleDto): Promise<JobRoleDto> {
    const role = await this.resumeService.createJobRole(payload);
    return JobRoleDto.from(role);
  }

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze a resume and evaluate fit against configured job roles.' })
  @ApiBody({ type: AnalyzeResumeDto })
  @ApiOkResponse({
    description: 'Analysis result detailing match scores and metadata.',
    type: ResumeAnalysisResponseDto,
  })
  async analyzeResume(@Body() payload: AnalyzeResumeDto): Promise<ResumeAnalysisResponseDto> {
    const result = await this.resumeService.analyzeResume(payload);
    return ResumeAnalysisResponseDto.from(result);
  }
}
