import { Module } from '@nestjs/common';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { ResumeParserService } from './services/resume-parser.service';
import { ResumeEvaluatorService } from './services/resume-evaluator.service';
import { GoogleDriveService } from './services/google-drive.service';
import { DriveController } from './drive.controller';

@Module({
  controllers: [ResumeController, DriveController],
  providers: [ResumeService, ResumeParserService, ResumeEvaluatorService, GoogleDriveService],
})
export class ResumeModule {}
