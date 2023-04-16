import { Body, Controller, Post } from '@nestjs/common';
import { PaymentCancel, PaymentCompleteDto } from './dto/payment.dto';
import { IamportService } from './iamport.service';

@Controller()
export class IamportController {
  constructor(private iamportService: IamportService) {}

  /**
   * @paymentCompleteController 비즈니스 로직인 paymentComplete 함수를 실행시키기 위한 컨트롤러이다.
   * @description 결제 완료 이후 프로트단에서 받은 데이터를 이용해서 데이터베이스에 결제 데이터를 저장하기 위해 사용된다. 네트워크문제로 결제가 실제로 완료되지 않았는데 데이터베이스에 저장되는 문제가 발생할 가능성이 있다.
   * 이를 해결하기 위해서는 포트원에서 제공하는 웹훅을 이용해서 해결할 수 있다. 현재로써는 로컬환경에서 진행하므로 웹훅을 적용하지 않았다. 배포시 웹훅을 적용할 수 있다.
   * 결제 완료가 된다면 데이터베이스에 해당 결제 고유번호 imp_uid값과 결제 현황 즉, status에 paid로 저장이 되고 가격과 상품 고유번호 merchant_uid가 저장이 된다.
   * @param data PaymentCompleteDto interface에 맞는 값
   * @retruns 성공시 { statusCode: 200, message: 'success' }
   * 실패시 {statusCode: 400, message: 'Please do it again.',error: 'Bad Request'} => 결제 고유번호인 imp_uid값이 존재하지 않을 때
   * {statusCode: 400, message: 'fake payment attempt.', error: 'Bad Request'} => 결제 요청시 프론트단에서 받아온 가격과 실제 결제된 내역(포트원에서 결제된 내역)을
   * 비교해서 맞지 않을 시 리턴되는 값이다. 왜 비교를 하냐면, 해커가 해당 결제 내용의 스크립트를 변경해서 요청하면 문제가 발생하기 때문이다. (ex 만원결제를 100원으로 변경해서 결제요청)
   */
  @Post('payments/complete')
  async paymentCompleteController(@Body() data: PaymentCompleteDto) {
    return this.iamportService.paymentComplete(data);
  }

  /**
   * @paymentCancelController 비즈니스 로직인 paymentCancel 함수를 실행시키기 위한 컨트롤러이다.
   * @description 결제 완료 이후, 결제에 대한 환불을 진행하기 위해 실행되는 함수이다. 부분환불과 전체환불이 가능하다. 예를들어서 부분환불같은 경우는 패키지를 구매했다고 가정했다면
   * 10개중 2개를 구해 시 나머지 8개에 대한 환불처리가 돼야한다 이를 처리하기 위해 비즈니스 로직을 변경해야 하는데, 사용한 부분 만큼만 차감해서 그 비율만큼 환불처리하도록 변경해야 한다. => 이 부분은 service에서 refund함수에서 data로 정의 되어있다.
   * 현재는 전체환불을 적용해야 했으므로 전체환불로 되어있다.
   * 결제 환불처리가 완료된다면 데이터베이스에서는 status를 cancel로 변경이 되고, 가격을 0으로 변경시킨다.
   * @param data PaymentCancel interface에 맞는 값
   * @returns 성공시 { statusCode: 200, message: 'payment cancel is completed!' }
   * 실패시 {statusCode: 400, message: 'imp_uid does not exist, so cant be accessed.', error: 'Bad Request'} => 결제 고유번호인 imp_uid를 받아오지 못했을 때 발생한다.
   * {statusCode: 400, message: 'There is no refundable product.', error: 'Bad Request'} => 환불 진행이 끝나고, 다시 환불요청을 보낼 때 중복되지 않기위해 amount가 0인 경우 발생하는 에러이다.
   */
  @Post('payments/cancel')
  async paymentCancelController(@Body() data: PaymentCancel) {
    return this.iamportService.paymentCancel(data);
  }
}
