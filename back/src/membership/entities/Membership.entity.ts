import {
    Entity,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    PrimaryGeneratedColumn,
} from 'typeorm';

// ttv DB 안 memberships 테이블과 동기화될 entity
@Entity('memberships')
export class Memberships {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    // 구매자 email
    @Column({ nullable: false, default: 'exam@gmail.kr' })
    email!: string;

    // '7D' / '1M' / '6M' / '1Y' 멤버쉽 구분
    @Column({ nullable: false, default: '7D' })
    duration!: string;

    // 멤버십이 끝나는 Date
    @Column({ type: 'datetime', nullable: false })
    expiredAt!: Date;

    @Column({ type: 'datetime', nullable: false })
    purchasedAt!: Date;

    // DB에 첫 삽입된 날짜
    @CreateDateColumn()
    createdAt!: Date;

    @DeleteDateColumn()
    deletedAt!: Date;
}
