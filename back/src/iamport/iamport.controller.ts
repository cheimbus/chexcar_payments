import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, Res, UseGuards } from "@nestjs/common";
import { PaymentCancel, PaymentCompleteDto, PaymentRemains, PaymentUpdateDto, PaymentValidationDto } from "./dto/payment.dto";
import { IamportService } from "./iamport.service";

@Controller()
export class IamportController {
    constructor(private iamportService: IamportService) { }


    /** @todo 결제 웹훅을 이용한다면 imp_uid, merchant_uid, status 를 이용해서 개발을 해야함. 또한 Guards를 사용할 수 없음. 이건 나중에 확인해 봄 */

    @Post('payments/complete')
    async ho$od$ddms1$28s$k$sd$$nw$w(@Body() data: PaymentCompleteDto) {
        return this.iamportService.paymentComplete(data.impUid, data.merchantUid, data.remains, data.type, data.device, data.email, data.amount, data.name);
    }

    // 환불
    @Post('payments/cancel')
    async paymentCancel(@Body() data: PaymentCancel) {
        return this.iamportService.paymentCancel(data.email, data.merchantUid);
    }

    // 상품 갯수 조회
    @Post('payments/remains')
    async getReamins(@Body() data: PaymentRemains) {
        return this.iamportService.getPaymentRemains(data.email, data.device);
    }
    // 상품 구입 가능여부 벨리데이션
    @Post('payments/validation')
    async paymentValidation(@Body() data: PaymentValidationDto) {
        return this.iamportService.paymentValidation(data.email, data.device);
    }

    // 상품 구입 후 업데이트
    @Post('payments/update')
    async paymentUpdate(@Body() data: PaymentUpdateDto) {
        return this.iamportService.paymentUpdate(data.email, data.device);
    }
}