import { Module } from '@nestjs/common';
import { ManagementController } from './controller/management.controller';
import { ManagementService } from './service/management.service';

@Module({
  controllers: [ManagementController],
  providers: [ManagementService]
})
export class ManagementModule {}
