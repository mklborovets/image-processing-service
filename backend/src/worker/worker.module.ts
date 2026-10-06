import { Module } from '@nestjs/common';
import { SqsWorkerService } from './sqs-worker.service';

@Module({
  providers: [SqsWorkerService],
})
export class WorkerModule {}
