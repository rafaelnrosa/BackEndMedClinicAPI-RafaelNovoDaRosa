import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Doctor } from './Doctor.entity';
import { Patient } from './Patient.entity';

export type AppointmentStatus = 'scheduled' | 'in_progress' | 'done' | 'cancelled';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'doctor_id' })
  doctorId!: number;

  @Column({ name: 'patient_id' })
  patientId!: number;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({ length: 20, default: 'scheduled' })
  status!: AppointmentStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Doctor, (d) => d.appointments, { eager: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @ManyToOne(() => Patient, (p) => p.appointments, { eager: false })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;
}
