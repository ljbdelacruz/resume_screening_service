import { Module } from '@nestjs/common';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { ResumeParserService } from './services/resume-parser.service';
import { ResumeEvaluatorService } from './services/resume-evaluator.service';

@Module({
  controllers: [ResumeController],
  providers: [ResumeService, ResumeParserService, ResumeEvaluatorService],
})
export class ResumeModule {}
