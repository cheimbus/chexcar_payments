import {
    Entity,
    Column,
    CreateDateColumn,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('paymentlogs')
export class PaymentLogs {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column({ nullable: false })
    email!: string;

    @Column({ nullable: true })
    apiMethod!: string;

    @Column({ nullable: true })
    exceptionError!: string;

    @CreateDateColumn()
    createdAt!: Date;
}
