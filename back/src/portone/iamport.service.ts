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

  // 환불
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
