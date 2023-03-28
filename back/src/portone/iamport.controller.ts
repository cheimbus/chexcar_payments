import { Body, Controller, Post } from '@nestjs/common';
import { PaymentCancel, PaymentCompleteDto } from './dto/payment.dto';
import { IamportService } from './iamport.service';

@Controller()
export class IamportController {
  constructor(private iamportService: IamportService) {}

  // 구입
  @Post('payments/complete')
  async ho$od$ddms1$28s$k$sd$$nw$w(@Body() data: PaymentCompleteDto) {
    return this.iamportService.paymentComplete(data);
  }

  // 환불
  @Post('payments/cancel')
  async paymentCancel(@Body() data: PaymentCancel) {
    return this.iamportService.paymentCancel(data);
  }
}
