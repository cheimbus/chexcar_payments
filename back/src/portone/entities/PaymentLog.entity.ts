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
  api!: string;

  @Column({ nullable: true })
  exception_error!: string;

  @CreateDateColumn()
  created_at!: Date;
}
