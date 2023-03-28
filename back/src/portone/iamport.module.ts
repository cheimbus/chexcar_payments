import { Module } from '@nestjs/common';
import { IamportService } from './iamport.service';
import { IamportController } from './iamport.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [IamportService],
  controllers: [IamportController],
  exports: [IamportService],
})
export class IamportModule {}
