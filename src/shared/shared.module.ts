import { Module } from '@nestjs/common';
import { GcsService } from '../management/service/gcs.service';

@Module({
  providers: [GcsService],
  exports: [GcsService],
})
export class SharedModule {}
