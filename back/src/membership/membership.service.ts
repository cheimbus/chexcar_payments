import { Injectable } from '@nestjs/common';
import dataSource from 'datasource';
import { Memberships } from 'src/membership/entities/Membership.entity';

@Injectable()
export class MembershipService {
    constructor() { }

    async getMembership(data: any) {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            dataSource.createQueryBuilder()
                .insert()
                .into(Memberships)
                .values({
                    email: data.data.email,
                    expiredAt: data.data.expiredAt,
                    purchasedAt: data.data.purchasedAt
                })
                .execute();

            await queryRunner.commitTransaction()
        } catch (error) {
            console.log(error);
            await queryRunner.rollbackTransaction()
        } finally {
            await queryRunner.release()
        }
    }
}
