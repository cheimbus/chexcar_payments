import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payments } from './iamport/entities/Payment.entity';
import { PaymentLogs } from './iamport/entities/PaymentLog.entity';
import { IamportController } from './iamport/iamport.controller';
import { IamportModule } from './iamport/iamport.module';
import { IamportService } from './iamport/iamport.service';
import { Memberships } from './membership/entities/Membership.entity';
import { MembershipController } from './membership/membership.controller';
import { MembershipModule } from './membership/membership.module';
import { MembershipService } from './membership/membership.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forFeature([Payments, PaymentLogs, Memberships]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: '123123123',
        database: 'exam',
        entities: ['dist/**/*.entity{.d.ts,.js}', '**/*.entity{.d.ts,.js}'],
        synchronize: false,
      }),
    }),
    IamportModule, HttpModule, MembershipModule,],
  controllers: [IamportController, MembershipController],
  providers: [IamportService, MembershipService],
})
export class AppModule { }
