import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, map, mergeMap, Observable, pipe } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import dataSource from 'datasource';
import { Payments } from './entities/Payment.entity';
import { Memberships } from '../membership/entities/Membership.entity';
import { PaymentLogs } from './entities/PaymentLog.entity';

@Injectable()
export class IamportService {
    constructor(
        private configService: ConfigService,
        private httpService: HttpService,
    ) { }

    public async paymentComplete(impUid: string, merchantUid: string, remains: number,
        type: number, device: string, email: string, requestAmount: number, name: string) {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        if (impUid === undefined) {
            return { statusCode: 400, message: 'Please do it again.', error: 'Bad Request' }
        }
        try {
            this.getIamportPaymentData(impUid).subscribe(async getData => {
                const { amount, status } = getData.response;
                if (requestAmount === amount && status === 'paid') {
                    await dataSource
                        .createQueryBuilder()
                        .insert()
                        .into(Payments)
                        .values({
                            merchantUid,
                            remains,
                            email,
                            name
                        })
                        .execute();
                    await dataSource
                        .createQueryBuilder()
                        .update(Payments)
                        .set({ status, impUid, total: type, device, type, amount })
                        .where('merchantUid=:merchantUid', { merchantUid })
                        .execute();
                } else {
                    await dataSource
                        .createQueryBuilder()
                        .insert()
                        .into(PaymentLogs)
                        .values({
                            email,
                            apiMethod: 'payments/complete',
                            exceptionError: '위조된 결제 시도'
                        })
                        .execute();
                    this.refund(amount, amount, 0, impUid).subscribe(async cancelInfo => {
                        return { statusCode: 400, message: 'fake payment attempt.', error: 'Bad Request' }
                    })
                }
            })
            await queryRunner.commitTransaction();
            return { statusCode: 200, message: 'success' };
        } catch (err) {
            await queryRunner.rollbackTransaction();
        } finally {
            await queryRunner.release();
        }
    }

    // 부분 환불
    public async paymentCancel(email: string, merchantUid: string) {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        const [cancelRequestAmount, impUid, amount, total, remains, cancelAmount] = await this.getCancelRequestAmountAndDataForEmail(email);
        if (impUid === undefined) {
            await dataSource
                .createQueryBuilder()
                .insert()
                .into(PaymentLogs)
                .values({
                    email,
                    apiMethod: 'payments/cancel',
                    exceptionError: 'impUid가 존재하지 않아서 접근할수 없습니다.'
                })
                .execute();
            return { statusCode: 400, message: 'impUid does not exist, so cant be accessed.', error: 'Bad Request' }
        }

        try {
            this.refund(cancelRequestAmount, amount, cancelAmount, impUid).subscribe(async cancelInfo => {
                await dataSource
                    .createQueryBuilder()
                    .update(Payments)
                    .set({ cancelAmount: cancelInfo.cancel_amount })
                    .where('impUid = :impuid', { impuid: cancelInfo.imp_uid })
                    .execute()
            })

            const getPaymentDataForImpUid = await dataSource
                .getRepository(Payments)
                .createQueryBuilder('payment')
                .where('payment.impUid = :impUid', { impUid })
                .getOne()
            await dataSource
                .createQueryBuilder()
                .update(Payments)
                .set({ remains: 0, amount: 0, total: 0, status: 'cancelled' })
                .where('impUid = :impUid', { impUid: getPaymentDataForImpUid?.impUid })
                .execute()
            const getPaymentData = await dataSource
                .getRepository(Payments)
                .createQueryBuilder()
                .where('email = :email', { email })
                .getMany()
            for (let i = 0; i < getPaymentData.length; i++) {
                if (getPaymentData[i].total !== 0) {
                    const paymentDataForImpUid = await dataSource
                        .getRepository(Payments)
                        .createQueryBuilder()
                        .where('impUid = :impuid', { impuid: getPaymentDataForImpUid?.impUid })
                        .getOne()
                    await dataSource
                        .createQueryBuilder()
                        .update(Payments)
                        .set({ total: getPaymentData[i].total - Number(paymentDataForImpUid?.type) })
                        .where('email = :email', { email })
                        .execute()
                }
                break;
            }
            const addAmount = getPaymentData.map((v => v.amount)).reduce((a, c) => a + c, 0);
            const addRemains = getPaymentData.map((v => v.remains)).reduce((a, c) => a + c, 0);
            const addTotal = getPaymentData.map((v => v.total)).reduce((a, c) => a + c, 0);
            await queryRunner.commitTransaction();
            return { merchantUid: '', statusCode: 200, message: 'success', total: addTotal, remains: addRemains, amount: addAmount }
        } catch (err) {
            await queryRunner.rollbackTransaction();
        } finally {
            await queryRunner.release();
        }
    }

    public refund(cancelRequestAmount: any, amount: any, cancelAmount: any, impUid: any) {
        const cancelAbleAmount = amount - cancelAmount;
        if (cancelAbleAmount <= 0) {
            throw new BadRequestException('There is no refundable product.');
        }
        const data = {
            imp_uid: impUid,
            amount: cancelRequestAmount,
            checksum: cancelAbleAmount,
        }
        return this.getIamportAccessToken().pipe(mergeMap(accessToken => {
            return this.httpService
                .post('https://api.iamport.kr/payments/cancel', data, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: accessToken,
                    },
                })
                .pipe(
                    map(response => response.data.response)
                )
        }))
    }

    public getIamportPaymentData(impUid: string) {
        return this.getIamportAccessToken().pipe(
            mergeMap(accessToken =>
                this.httpService
                    .get(`https://api.iamport.kr/payments/${impUid}`, {
                        headers: { Authorization: accessToken },
                    })
                    .pipe(map(response => response.data),
                    ),
            ),
        );
    }

    public getIamportAccessToken() {
        const data = {
            imp_key: this.configService.get('REST_API_KEY'),
            imp_secret: this.configService.get('REST_API_SECRET'),
        }
        return this.httpService
            .post('https://api.iamport.kr/users/getToken', data, {
                headers: { 'Content-Type': 'application/json' },
            })
            .pipe(
                map(data => data.data.response.access_token),
                catchError(error => {
                    throw new BadRequestException(error);
                })
            )
    }

    public async orderByASCPaymentForEmail(email: string) {
        return await dataSource
            .getRepository(Payments)
            .createQueryBuilder('payment')
            .where('payment.email=:email', { email })
            .orderBy('payment.createdAt', 'ASC')
            .execute()
    }

    public async orderByDESCPaymentForEmail(email: string) {
        return await dataSource
            .getRepository(Payments)
            .createQueryBuilder('payment')
            .where('payment.email=:email', { email })
            .orderBy('payment.createdAt', 'DESC')
            .execute()
    }

    public async getPaymentDataForMerchantUid(merchantUid: string) {
        return await dataSource
            .getRepository(Payments)
            .createQueryBuilder('payment')
            .where('payment.merchantUid=:merchantUid', { merchantUid })
            .getOne()
    }

    // email만 받아서 과거순으로 환불시키는 로직
    public async getCancelRequestAmountAndDataForEmail(email: string): Promise<Array<any>> {
        const paymentData = await this.orderByASCPaymentForEmail(email);
        const refundPriceAndImpUid = [];
        for (let i = 0; i < paymentData.length; i++) {
            if (paymentData[i].payment_status === 'paid' && paymentData[i].payment_remains !== 0) {
                const onePrice = paymentData[i].payment_amount / paymentData[i].payment_type;
                const cancelRequestAmount = onePrice * paymentData[i].payment_remains;
                const impUid = paymentData[i].payment_impUid;
                const amount = paymentData[i].payment_amount;
                const cancelAmount = paymentData[i].payment_cancelAmount;
                const total = paymentData[i].payment_total;
                const remains = paymentData[i].payment_remains;
                refundPriceAndImpUid.push(cancelRequestAmount, impUid, amount, total, remains, cancelAmount);
                break;
            }
        }
        return refundPriceAndImpUid;
    }

    // 특정 merchantUid로 조회해서 환불시키는 로직
    public async getCancelRequestAmountAndDataForMerchantUid(merchantUid: string) {
        const data = await dataSource
            .getRepository(Payments)
            .createQueryBuilder('payment')
            .where('payment.merchantUid=:merchantUid', { merchantUid })
            .getOne()
        const paymentArray = []
        const onePrice = Number(data?.amount) / Number(data?.type);
        const cancelRequestAmount = onePrice * Number(data?.remains);
        const impUid = String(data?.impUid);
        const amount = Number(data?.amount);
        const cancelAmount = Number(data?.cancelAmount);
        const total = Number(data?.total);
        const remains = Number(data?.remains);
        paymentArray.push(cancelRequestAmount, impUid, amount, total, remains, cancelAmount)
        return paymentArray;
    }

    // 남은 상품 갯수
    public async getPaymentRemains(email: string, device: string) {
        const paymentData = await dataSource
            .getRepository(Payments)
            .createQueryBuilder()
            .where('email=:email', { email })
            .getMany()
        const getMembership = await dataSource
            .getRepository(Memberships)
            .createQueryBuilder('membership')
            .withDeleted()
            .where('membership.email=:email', { email })
            .getOne()
        const getStatus = await dataSource
            .getRepository(Payments)
            .createQueryBuilder()
            .where('status=:status', { status: 'paid' })
            .andWhere('email=:email', { email })
            .getOne()
        if (!getStatus) {
            const currentDate = new Date()
            if (typeof getMembership?.expiredAt === 'object') {
                if (getMembership?.expiredAt < currentDate) {
                    let count = 0;
                    for (let i = 0; i < paymentData.length; i++) {
                        if (paymentData[i].status === 'cancelled') {
                            count++;
                        }
                    }
                    if (count === paymentData.length) {
                        await dataSource
                            .createQueryBuilder()
                            .insert()
                            .into(PaymentLogs)
                            .values({
                                email,
                                apiMethod: 'payments/remains',
                                exceptionError: 'expired'
                            })
                            .execute();
                        return { statusCode: 400, message: 'expired', error: 'Bad Request' };
                    }
                    if (paymentData.length === 0) {
                        await dataSource
                            .createQueryBuilder()
                            .insert()
                            .into(PaymentLogs)
                            .values({
                                email,
                                apiMethod: 'payments/remains',
                                exceptionError: 'expired'
                            })
                            .execute();
                        return { statusCode: 400, message: 'expired', error: 'Bad Request' };
                    }
                }
            }
            await dataSource
                .createQueryBuilder()
                .insert()
                .into(PaymentLogs)
                .values({
                    email,
                    apiMethod: 'payments/remains',
                    exceptionError: 'not expired'
                })
                .execute();
            return { statusCode: 400, message: 'not expired', error: 'Bad Request' };
        }

        let count = 0;
        for (let i = 0; i < paymentData.length; i++) {
            if (paymentData[i].status === 'paid' && paymentData[i].remains === 0) {
                count++;
            }
            if (paymentData[i].status === 'cancelled') {
                count++;
            }
        }
        if (count === paymentData.length) {
            await dataSource
                .createQueryBuilder()
                .insert()
                .into(PaymentLogs)
                .values({
                    email,
                    apiMethod: 'payments/remains',
                    exceptionError: 'not expired'
                })
                .execute();
            return { statusCode: 400, message: 'not expired', error: 'Bad Request' };
        }

        const getPaymentData = await dataSource
            .getRepository(Payments)
            .createQueryBuilder()
            .where('email=:email', { email })
            .getMany()

        const addAmount = getPaymentData.map((v => v.amount)).reduce((a, c) => a + c, 0);
        const addRemains = getPaymentData.map((v => v.remains)).reduce((a, c) => a + c, 0);
        const addTotal = getPaymentData.map((v => v.total)).reduce((a, c) => a + c, 0);
        return { merchantUid: '', statusCode: 200, message: 'success', total: addTotal, remains: addRemains, amount: addAmount }
    }


    // 업데이트
    async paymentUpdate(email: string, device: string) {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const orderdByASC = await this.orderByASCPaymentForEmail(email);
            if (orderdByASC)
                for (let i = 0; i < orderdByASC.length; i++) {
                    if (orderdByASC[i].payment_remains !== 0) {
                        const currentMerchantUid = orderdByASC[i].payment_merchantUid;
                        const currentRemains = orderdByASC[i].payment_remains - 1;
                        await dataSource.createQueryBuilder()
                            .update(Payments)
                            .set({ remains: currentRemains })
                            .where('merchantUid=:merchantUid', { merchantUid: currentMerchantUid })
                            .execute();
                        await queryRunner.commitTransaction();
                        return { statusCode: 200, message: 'success' };
                    }
                }
            const paymentData = await dataSource
                .getRepository(Payments)
                .createQueryBuilder()
                .where('email=:email', { email })
                .getMany()
            const remains = paymentData.map((v => v.remains)).reduce((a, c) => a + c, 0);
            if (remains === 0) {
                await dataSource
                    .createQueryBuilder()
                    .insert()
                    .into(PaymentLogs)
                    .values({
                        email,
                        apiMethod: 'payments/update',
                        exceptionError: '업데이트에 실패하였습니다.'
                    })
                    .execute();
                return { statusCode: 400, message: 'invalid request.', error: 'Bad Request' }
            }
            await queryRunner.commitTransaction();
        }
        catch (err) {
            await queryRunner.rollbackTransaction();
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * @description payment validation 함수
     * @todo 7일 경과가 되었다면 {statusCode:400, message:'expired', error:'Bad Request'}
     * 만약 결제를 하고 7일이 경과가 되었다면 x
     * @todo 결제 이후 건수가 존재하지 않다면 실패시 {statusCode:400, message:'none', error:'Bad Request'}
     * 그냥 결제가 되어있고 건수가 존재한다면 리턴 안해도됨
     */
    async paymentValidation(email: string, device: string) {
        const paymentData = await dataSource
            .getRepository(Payments)
            .createQueryBuilder()
            .where('email=:email', { email })
            .getMany()
        const getMembership = await dataSource
            .getRepository(Memberships)
            .createQueryBuilder()
            .where('email=:email', { email })
            .getOne()
        const currentDate = new Date()
        if (typeof getMembership?.expiredAt === 'object') {
            if (getMembership?.expiredAt < currentDate) {
                let count = 0;
                for (let i = 0; i < paymentData.length; i++) {
                    if (paymentData[i].status === 'cancelled') {
                        count++;
                    }
                }
                if (count === paymentData.length) {
                    await dataSource
                        .createQueryBuilder()
                        .insert()
                        .into(PaymentLogs)
                        .values({
                            email,
                            apiMethod: 'payments/validation',
                            exceptionError: 'expired'
                        })
                        .execute();
                    return { statusCode: 400, message: 'expired', error: 'Bad Request' };
                }
                if (paymentData.length === 0) {
                    await dataSource
                        .createQueryBuilder()
                        .insert()
                        .into(PaymentLogs)
                        .values({
                            email,
                            apiMethod: 'payments/validation',
                            exceptionError: 'expired'
                        })
                        .execute();
                    return { statusCode: 400, message: 'expired', error: 'Bad Request' };
                }
            }
        }
        let count = 0;
        for (let i = 0; i < paymentData.length; i++) {
            if (paymentData[i].status === 'paid' && paymentData[i].remains === 0) {
                count++;
            }
            if (paymentData[i].status === 'cancelled') {
                count++;
            }
        }
        if (count === paymentData.length) {
            await dataSource
                .createQueryBuilder()
                .insert()
                .into(PaymentLogs)
                .values({
                    email,
                    apiMethod: 'payments/validation',
                    exceptionError: '남아있는 remains가 없습니다.'
                })
                .execute();
            return { statusCode: 400, message: 'none', error: 'Bad Request' };
        } else {
            return { statusCode: 200, message: 'success' };
        }
    }
}
