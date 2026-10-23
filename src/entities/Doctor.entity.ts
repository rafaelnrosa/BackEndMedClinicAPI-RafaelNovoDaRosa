import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './User.entity';
import { WorkScheduleShift } from './WorkScheduleShift.entity';
import { Appointment } from './Appointment.entity';
import { MedicalRecord } from './MedicalRecord.entity';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 50 })
  crm!: string;

  @Column({ name: 'user_id' })
  userId!: number;

  @OneToOne(() => User, (user) => user.doctor, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => WorkScheduleShift, (shift) => shift.doctor, { cascade: true })
  shifts?: WorkScheduleShift[];

  @OneToMany(() => Appointment, (a) => a.doctor)
  appointments?: Appointment[];

  @OneToMany(() => MedicalRecord, (mr) => mr.doctor)
  medicalRecords?: MedicalRecord[];
}
