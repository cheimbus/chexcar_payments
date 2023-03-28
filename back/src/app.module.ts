import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payments } from './portone/entities/Payment.entity';
import { PaymentLogs } from './portone/entities/PaymentLog.entity';
import { IamportController } from './portone/iamport.controller';
import { IamportModule } from './portone/iamport.module';
import { IamportService } from './portone/iamport.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forFeature([Payments, PaymentLogs]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'a!950403',
        database: 'exam',
        entities: ['dist/**/*.entity{.d.ts,.js}', '**/*.entity{.d.ts,.js}'],
        synchronize: false,
      }),
    }),
    IamportModule,
    HttpModule,
  ],
  controllers: [IamportController],
  providers: [IamportService],
})
export class AppModule {}
