import { BadRequestException, Injectable } from '@nestjs/common';
import { catchError, map, mergeMap } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import dataSource from 'datasource';
import { Payments } from './entities/Payment.entity';
import { PaymentCancel, PaymentCompleteDto } from './dto/payment.dto';
import { PaymentLogs } from './entities/PaymentLog.entity';

@Injectable()
export class IamportService {
  constructor(private httpService: HttpService) {}

  /**
   * @function paymentComplete 결제 완료에 대한 비즈니스로직을 담당하는 함수이다.
   * @function getIamportPaymentData 포트원에서 실제 결제완료된 데이터를 가져오는 함수이다.
   * @function refund 포트원에 해당 상품고유번호 merchant_uid를 이용해서 accesstoken과 함께 환불 요청하는 로직을 담당하는 함수이다.
   * @function getIamportAccessToken 포트원에서 제공하는 imp_key와 imp_secret을 이용해서 accesstoken을 가져오기 위한 함수이다.
   * @param data PaymentCompleteDto interface에 맞는 값
   * @retruns 성공시 { statusCode: 200, message: 'success' }
     실패시 {statusCode: 400, message: 'Please do it again.',error: 'Bad Request'} => 결제 고유번호인 imp_uid값이 존재하지 않을 때
     {statusCode: 400, message: 'fake payment attempt.', error: 'Bad Request'} => 결제 요청시 프론트단에서 받아온 가격과 실제 결제된 내역(포트원에서 결제된 내역)을
     비교해서 맞지 않을 시 리턴되는 값이다. 왜 비교를 하냐면, 해커가 해당 결제 내용의 스크립트를 변경해서 요청하면 문제가 발생하기 때문이다. (ex 만원결제를 100원으로 변경해서 결제요청)
   */
  public async paymentComplete(data: PaymentCompleteDto) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    if (data.imp_uid === undefined) {
      return {
        statusCode: 400,
        message: 'Please do it again.',
        error: 'Bad Request',
      };
    }
    try {
      this.getIamportPaymentData(data.imp_uid).subscribe(async (get_data) => {
        const { amount, status, imp_uid, merchant_uid } = get_data.response;
        if (data.request_amount === amount && status === 'paid') {
          await dataSource
            .createQueryBuilder()
            .insert()
            .into(Payments)
            .values({
              merchant_uid,
              imp_uid,
              email: data.email,
              name: data.name,
              amount: data.request_amount,
              status,
            })
            .execute();
        } else {
          this.refund(data.merchant_uid).subscribe(async (cancelInfo) => {
            await dataSource
              .createQueryBuilder()
              .update(Payments)
              .set({ status: cancelInfo.status })
              .where('imp_uid = :imp_uid', { imp_uid: data.imp_uid })
              .execute();
            return {
              statusCode: 400,
              message: 'fake payment attempt.',
              error: 'Bad Request',
            };
          });
        }
      });
      await queryRunner.commitTransaction();
      return { statusCode: 200, message: 'success' };
    } catch (err) {
      await dataSource
        .createQueryBuilder()
        .insert()
        .into(PaymentLogs)
        .values([
          {
            email: data.email,
            api: 'payments/complete',
            exception_error: '결제 에러',
          },
        ])
        .execute();
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * @function paymentCancel 결제 환불 로직을 처리하기 위한 함수이다.
   * @param data PaymentCancel interface에 맞는 값
   * @returns 성공시 { statusCode: 200, message: 'payment cancel is completed!' }
     실패시 {statusCode: 400, message: 'imp_uid does not exist, so cant be accessed.', error: 'Bad Request'} => 결제 고유번호인 imp_uid를 받아오지 못했을 때 발생한다.
     {statusCode: 400, message: 'There is no refundable product.', error: 'Bad Request'} => 환불 진행이 끝나고, 다시 환불요청을 보낼 때 중복되지 않기위해 amount가 0인 경우 발생하는 에러이다.
   */
  public async paymentCancel(data: PaymentCancel) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const getAmount = await dataSource
      .getRepository(Payments)
      .createQueryBuilder()
      .where('merchant_uid = :merchant_uid', {
        merchant_uid: data.merchant_uid,
      })
      .getOne();

    if (getAmount.amount === 0) {
      return {
        statusCode: 400,
        message: 'There is no refundable product.',
        error: 'Bad Request',
      };
    }
    if (data.merchant_uid === undefined) {
      return {
        statusCode: 400,
        message: 'imp_uid does not exist, so cant be accessed.',
        error: 'Bad Request',
      };
    }
    try {
      this.refund(data.merchant_uid).subscribe(async (cancelInfo) => {
        await dataSource
          .createQueryBuilder()
          .update(Payments)
          .set({ amount: 0, status: cancelInfo.status })
          .where('imp_uid = :imp_uid', { imp_uid: cancelInfo.imp_uid })
          .execute();
      });

      await queryRunner.commitTransaction();
      return { statusCode: 200, message: 'payment cancel is completed!' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  public refund(merchant_uid: string) {
    const data = {
      merchant_uid,
      checksum: 50000,
    };

    return this.getIamportAccessToken().pipe(
      mergeMap((accessToken) => {
        return this.httpService
          .post('https://api.iamport.kr/payments/cancel', data, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: accessToken,
            },
          })
          .pipe(map((response) => response.data.response));
      }),
    );
  }

  public getIamportPaymentData(imp_uid: string) {
    return this.getIamportAccessToken().pipe(
      mergeMap((accessToken) =>
        this.httpService
          .get(`https://api.iamport.kr/payments/${imp_uid}`, {
            headers: { Authorization: accessToken },
          })
          .pipe(map((response) => response.data)),
      ),
    );
  }

  public getIamportAccessToken() {
    const data = {
      imp_key: '7706638661208818',
      imp_secret:
        'pUe7F88apH1EHeL3UUi3tP8LRWMqLXWWdgPHjE3lNslP4ax9Y97J8MlXJvd6PmsHzNHlVBM8os4tuixT',
    };
    return this.httpService
      .post('https://api.iamport.kr/users/getToken', data, {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(
        map((data) => data.data.response.access_token),
        catchError((error) => {
          throw new BadRequestException(error);
        }),
      );
  }
}
