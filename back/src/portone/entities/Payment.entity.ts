import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('payments')
export class Payments {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id!: number;

  // 주문 번호
  @Column({ type: 'varchar', nullable: true })
  merchant_uid!: string;

  // 사용자
  @Column({ type: 'varchar', nullable: true })
  email: string;

  // 결제 번호
  @Column({ type: 'varchar', nullable: true })
  imp_uid: string;

  // 지불, 취소 현황
  @Column({ type: 'varchar', nullable: true })
  status: string;

  // 상품 이름
  @Column({ type: 'varchar', nullable: true })
  name: string;

  // 가격
  @Column({ type: 'int', default: 0 })
  amount: number;

  // 취소 가능 금액
  @Column({ type: 'int', default: 0 })
  cancel_able_amount: number;

  @CreateDateColumn()
  created_at!: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
