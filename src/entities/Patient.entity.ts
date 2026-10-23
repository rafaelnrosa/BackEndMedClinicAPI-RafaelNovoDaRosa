import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Appointment } from './Appointment.entity';
import { MedicalRecord } from './MedicalRecord.entity';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({ unique: true, length: 11 })
  cpf!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @OneToMany(() => Appointment, (a) => a.patient)
  appointments?: Appointment[];

  @OneToMany(() => MedicalRecord, (mr) => mr.patient)
  medicalRecords?: MedicalRecord[];
}
