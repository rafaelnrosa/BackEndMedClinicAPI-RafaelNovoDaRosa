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

@Entity('medical_records')
export class MedicalRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'patient_id' })
  patientId!: number;

  @Column({ name: 'doctor_id' })
  doctorId!: number;

  @Column({ type: 'text' })
  text!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Patient, (p) => p.medicalRecords, { eager: false })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @ManyToOne(() => Doctor, (d) => d.medicalRecords, { eager: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;
}
