import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('payments')
export class Payments {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id!: number;

  // 주문 번호
  @Column({ type: 'varchar', name: 'merchantUid', nullable: true })
  merchantUid!: string;

  // 사용자 이메일 나중에 default 삭제
  @Column({ type: 'varchar', nullable: true })
  email: string;

  // 결제 번호
  @Column({ type: 'varchar', nullable: true })
  impUid: string;

  // 지불, 취소 현황
  @Column({ type: 'varchar', nullable: true })
  status: string;

  // 상품 이름
  @Column({ type: 'varchar', nullable: true })
  name: string;

  // 가격
  @Column({ type: 'int', default: 0 })
  amount: number;

  // 취소 금액
  @Column({ type: 'int', default: 0 })
  cancelAmount: number;

  // 취소 가능 금액
  @Column({ type: 'int', default: 0 })
  cancelAbleAmount: number;

  // 결제 타입 10건, 20건, 30건 등
  @Column({ type: 'int', nullable: true })
  type: number;

  // 구매한 영상 제작 갯수
  @Column({ type: 'int', nullable: true, default: 0 })
  remains: number;

  // 전체 영상 제작 갯수
  @Column({ type: 'int', nullable: true, default: 0 })
  total: number;

  // pc, Android, IOS
  @Column({ type: 'varchar', nullable: true })
  device: string;

  @CreateDateColumn()
  createdAt!: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}