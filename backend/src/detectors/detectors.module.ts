import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Detector } from './detector.entity';
import { DetectorsController } from './detectors.controller';
import { DetectorsService } from './detectors.service';

@Module({
  imports: [TypeOrmModule.forFeature([Detector])],
  controllers: [DetectorsController],
  providers: [DetectorsService],
  exports: [DetectorsService],
})
export class DetectorsModule {}
